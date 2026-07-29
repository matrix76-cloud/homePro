/* eslint-disable */
import {
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../api/config";

const CASH_COL = "homepro_cash";
const USERS_COL = "users";
const RULES_DOC = "settings/point_rules";

/**
 * 기본 규칙 (Firestore settings/point_rules 문서 없을 때 폴백)
 * 2026-07-30 대표 확정 지급 조건표 반영.
 *  - 오더 관련 보상은 모두 "완료처리 시점"에만 지급된다(접수 즉시 지급 폐지 → order_create 비활성).
 *  - 실제 운영값은 Firestore 문서가 우선 — 문서 갱신은 scripts/update-point-rules.mjs 참고.
 */
const DEFAULT_RULES = {
  signup:                    { amount: 1000, label: "가입 환영 보상", active: true },
  referral_invite:           { amount: 3000, label: "친구 초대 보상 (추천인)", active: true },
  referral_signup:           { amount: 3000, label: "추천코드 사용 보상 (피추천인)", active: true },
  profile_complete:          { amount: 2000, label: "비즈프로필 작성 완료 보상", active: true },
  // 오더 접수 즉시 지급은 폐지 — 완료처리 시 order_complete 로 지급한다(대표 확정 2026-07-30)
  order_create:              { amount: 0,    label: "오더 접수 보상 (폐지 — 완료 시 지급으로 대체)", active: false },
  order_complete:            { amount: 300,  label: "오더 등록 완료 보상 (접수자)", active: true },
  order_perform:             { amount: 300,  label: "오더 수행 완료 보상 (홈프로)", active: true },
  review:                    { amount: 300,  label: "리뷰 작성 보상", active: true },
  referral_order_complete:   { amount: 100,  label: "피추천인 오더 완료 보상 (접수)", active: true },
  referral_perform_complete: { amount: 100,  label: "피추천인 오더 완료 보상 (수행)", active: true },
  community_post:            { amount: 30,   label: "게시글 작성 보상", active: true },
  community_like_10:         { amount: 50,   label: "게시물 하트 10개 달성", active: true },
  community_like_50:         { amount: 100,  label: "게시물 하트 50개 달성", active: true },
  community_like_100:        { amount: 200,  label: "게시물 하트 100개 달성", active: true },
};

/** 같은 대상(relatedDocId)에 한 번만 지급되는 카테고리 — 원장 조회로 중복 방지 */
const ONCE_PER_DOC = [
  "community_like_10", "community_like_50", "community_like_100",
  "order_complete", "order_perform", "review",
  "referral_order_complete", "referral_perform_complete",
];

/** 사용자당 평생 1회만 지급되는 카테고리 — 원장 조회로 중복 방지 */
const ONCE_PER_USER = ["signup", "profile_complete"];

/* ─── 시트8 사양: 토큰화 대비 변수 ─── */
const DEFAULT_POLICY = {
  networkFeeRate: 0.05,        // 5% 네트워크 수수료 (포인트/파이/토큰 결제 시)
  referralRewardRate: 0.03,    // 3% 추천인 보상 (수수료 5% 중)
  swapRate: 1,                 // 1포인트 → 토큰 스왑 비율 (관리자 변경 가능)
  monthlySubscriptionPoint: 16500, // 월 구독료 16,500P
};

export async function getPointPolicy() {
  const snap = await getDoc(doc(db, RULES_DOC));
  const data = snap.exists() ? snap.data() : {};
  return { ...DEFAULT_POLICY, ...(data._policy || {}) };
}

/**
 * settings/point_rules + DEFAULT_RULES 병합
 * Firestore 값이 우선(관리자 편집 존중), 문서에 아직 없는 신규 키는 기본값으로 채운다.
 * (신규 규칙을 추가할 때 Firestore 문서 갱신 전에도 동작하도록 — scripts/update-point-rules.mjs 로 문서 갱신 권장)
 */
async function loadRules() {
  let stored = {};
  try {
    const snap = await getDoc(doc(db, RULES_DOC));
    if (snap.exists()) {
      const { _policy, ...rest } = snap.data() || {};
      stored = rest;
    }
  } catch (e) {
    console.warn("포인트 규칙 조회 실패 — 기본값 사용:", e.message);
  }
  return { ...DEFAULT_RULES, ...stored };
}

async function getRule(category) {
  const rules = await loadRules();
  return rules[category] || null;
}

/** 모든 규칙 조회 (기본값 + Firestore 병합) */
export async function getAllPointRules() {
  return loadRules();
}

/** 기본 규칙 테이블 노출 (관리자 화면에서 신규 키 채우기용) */
export { DEFAULT_RULES };

/**
 * 포인트 지급
 * @param {string} uid - 대상 사용자 UID
 * @param {string} userName - 사용자 이름
 * @param {string} category - 규칙 키 (referral_invite, order_create 등)
 * @param {object} options - { relatedUid, relatedDocId }
 */
export async function grantPoints(uid, userName, category, options = {}) {
  const rule = await getRule(category);
  if (!rule) return null;
  if (!rule.active || rule.amount <= 0) return null;

  // 중복 지급 방지 ① 같은 대상(오더/게시글/리뷰)에 1회만 — relatedDocId + category
  if (ONCE_PER_DOC.includes(category) && options.relatedDocId) {
    const q = query(
      collection(db, CASH_COL),
      where("uid", "==", uid),
      where("category", "==", category),
      where("relatedDocId", "==", options.relatedDocId)
    );
    const existing = await getDocs(q);
    if (!existing.empty) return null; // 이미 지급됨
  }

  // 중복 지급 방지 ② 사용자당 평생 1회 (가입 환영 / 비즈프로필 완료)
  if (ONCE_PER_USER.includes(category)) {
    const q = query(
      collection(db, CASH_COL),
      where("uid", "==", uid),
      where("category", "==", category)
    );
    const existing = await getDocs(q);
    if (!existing.empty) return null; // 이미 지급됨
  }

  // homepro_cash에 이력 추가
  const cashDoc = await addDoc(collection(db, CASH_COL), {
    uid,
    userName,
    type: "earn",
    amount: rule.amount,
    reason: rule.label,
    category,
    relatedUid: options.relatedUid || null,
    relatedDocId: options.relatedDocId || null,
    createdAt: serverTimestamp(),
  });

  // users/{uid}.referralPoints + totalEarnedPoints increment + 등급 갱신
  try {
    await updateDoc(doc(db, USERS_COL, uid), {
      referralPoints: increment(rule.amount),
      totalEarnedPoints: increment(rule.amount),
    });
    // 등급 재계산
    try {
      const { calcGrade, GRADE_ORDER } = await import("../utility/gradeUtils");
      const userSnap = await getDoc(doc(db, USERS_COL, uid));
      const userData = userSnap.data() || {};
      const totalPts = userData.totalEarnedPoints || 0;
      const rulesSnap = await getDoc(doc(db, "settings", "grade_rules"));
      const gradeRules = rulesSnap.exists() ? rulesSnap.data() : null;
      const newGrade = calcGrade(totalPts, gradeRules);
      const oldGrade = userData.grade || "rookie";
      const oldIdx = GRADE_ORDER.indexOf(oldGrade);
      const newIdx = GRADE_ORDER.indexOf(newGrade.key);
      if (newIdx > oldIdx) {
        await updateDoc(doc(db, USERS_COL, uid), { grade: newGrade.key });
        await addDoc(collection(db, "notifications"), {
          targetUids: [uid],
          title: "등급 상승",
          body: `등급이 ${newGrade.label}(으)로 올랐습니다!`,
          type: "grade_up",
          data: { grade: newGrade.key },
          read: false,
          sent: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (gradeErr) {
      console.warn("등급 갱신 실패:", gradeErr.message);
    }
  } catch (e) {
    console.warn("포인트 업데이트 실패:", e.message);
  }

  // 푸시 알림 발송 (notifications 컬렉션 → 스케줄 함수가 FCM 처리)
  try {
    await addDoc(collection(db, "notifications"), {
      targetUids: [uid],
      title: "포인트 적립",
      body: `+${rule.amount}P ${rule.label}이 적립되었습니다`,
      type: "point",
      data: { category, amount: rule.amount },
      read: false,
      sent: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("포인트 알림 생성 실패:", e.message);
  }

  return { id: cashDoc.id, amount: rule.amount, label: rule.label };
}

/**
 * 하트 달성 체크 + 포인트 지급 (커뮤니티/리뷰 통합 — community_like_* 카테고리 사용)
 * @param {number} likeCount - 현재 좋아요 수
 * @param {string} authorUid - 게시글/리뷰 작성자 UID
 * @param {string} authorName - 작성자 이름
 * @param {string} docId - 게시글/리뷰 ID
 */
export async function checkAndGrantLikeMilestone(likeCount, authorUid, authorName, docId) {
  const milestones = [
    { count: 100, category: "community_like_100" },
    { count: 50, category: "community_like_50" },
    { count: 10, category: "community_like_10" },
  ];

  for (const m of milestones) {
    if (likeCount >= m.count) {
      await grantPoints(authorUid, authorName, m.category, {
        relatedDocId: docId,
      });
    }
  }
}

/**
 * 포인트 차감 (결제/구독 등) — 원장에 insert 방식 기록 (사양 R41)
 * @param {string} uid
 * @param {string} userName
 * @param {number} amount - 차감할 포인트 (양수)
 * @param {string} reason
 * @param {object} options - { relatedDocId, txType }
 * @returns {Promise<{ id: string, amount: number, balance: number }>}
 */
export async function deductPoints(uid, userName, amount, reason, options = {}) {
  if (!uid || amount <= 0) throw new Error("잘못된 차감 요청");
  const userSnap = await getDoc(doc(db, USERS_COL, uid));
  const balance = userSnap.exists() ? (userSnap.data().referralPoints || 0) : 0;
  if (balance < amount) throw new Error("포인트가 부족합니다");

  // 원장 기록 (insert)
  const cashDoc = await addDoc(collection(db, CASH_COL), {
    uid,
    userName,
    type: "spend",
    amount: -amount,
    reason,
    category: options.txType || "payment",
    relatedDocId: options.relatedDocId || null,
    createdAt: serverTimestamp(),
  });
  // 잔액 차감
  await updateDoc(doc(db, USERS_COL, uid), {
    referralPoints: increment(-amount),
  });
  return { id: cashDoc.id, amount, balance: balance - amount };
}

/**
 * 포인트 결제 시 네트워크 수수료 계산 + 추천인 3% 보상 (사양 R23~R27)
 * @param {string} payerUid - 결제자 UID
 * @param {string} payerName
 * @param {number} amount - 결제 금액 (포인트)
 * @param {string} reason
 */
export async function applyPointPayment(payerUid, payerName, amount, reason) {
  const policy = await getPointPolicy();
  // 결제자 포인트 차감
  const result = await deductPoints(payerUid, payerName, amount, reason, { txType: "payment" });
  // 네트워크 수수료 (5%) — 시스템에 기록만 (실제 송금은 토큰화 후)
  const fee = Math.round(amount * policy.networkFeeRate);
  // 추천인 보상 (수수료 5% 중 3%)
  let referrerReward = null;
  try {
    const userSnap = await getDoc(doc(db, USERS_COL, payerUid));
    const referredBy = userSnap.exists() ? userSnap.data().referredBy : null;
    if (referredBy) {
      const rewardAmount = Math.round(amount * policy.referralRewardRate);
      if (rewardAmount > 0) {
        await addDoc(collection(db, CASH_COL), {
          uid: referredBy,
          userName: "(추천인 보상)",
          type: "earn",
          amount: rewardAmount,
          reason: `${reason} — 추천인 보상`,
          category: "referral_reward",
          relatedUid: payerUid,
          createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, USERS_COL, referredBy), {
          referralPoints: increment(rewardAmount),
          totalEarnedPoints: increment(rewardAmount),
        });
        referrerReward = { uid: referredBy, amount: rewardAmount };
      }
    }
  } catch (e) {
    console.warn("추천인 보상 처리 실패:", e);
  }
  return { ...result, fee, referrerReward };
}

/**
 * 가입 환영 보상 (누구나 1회 1,000P) — 온보딩 완료 직후 호출
 * users.signupBonusAt 플래그 + 원장 조회(ONCE_PER_USER) 이중 가드.
 * @param {string} uid
 * @param {string} userName
 */
export async function grantSignupBonus(uid, userName) {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, USERS_COL, uid));
    const data = snap.exists() ? snap.data() : {};
    if (data.signupBonusAt) return null; // 이미 지급

    const result = await grantPoints(uid, userName || data.nickname || data.name || "사용자", "signup");
    // 규칙이 비활성이어도 재시도 폭주를 막기 위해 플래그는 남긴다
    await updateDoc(doc(db, USERS_COL, uid), { signupBonusAt: serverTimestamp() });
    return result;
  } catch (e) {
    console.warn("가입 환영 포인트 지급 실패:", e.message);
    return null;
  }
}

/**
 * 비즈프로필 작성 완료 보상 (최초 1회 2,000P)
 * 조건: 휴대폰 인증 완료 + 비즈프로필(업체명/상호) 작성 + 사업자등록증 업로드 완료
 *  - 사업자등록증은 homepro_pros 문서의 licenseUrl 로 판정 (users.businessLicense 도 허용)
 *  - OCR 자동검증 연동은 범위 외 (별도 결정 대기)
 *
 * 호출(wiring) 필요 지점: 전문분야 등록 완료 시 / 사업자등록증 업로드 완료 시
 * @param {string} uid
 * @param {string} userName
 * @returns {Promise<null | {id, amount, label}>} 조건 미달이면 null
 */
export async function grantProfileCompleteBonus(uid, userName) {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, USERS_COL, uid));
    if (!snap.exists()) return null;
    const data = snap.data() || {};
    if (data.profileBonusAt) return null;        // 이미 지급
    if (!data.phoneVerified) return null;        // 휴대폰 인증 미완료

    // 비즈프로필 작성 여부 (업체명 또는 상호)
    const hasBizProfile = !!(data.companyName || data.businessName || data.bizName);
    if (!hasBizProfile) return null;

    // 사업자등록증 업로드 여부
    let hasLicense = !!data.businessLicense;
    if (!hasLicense) {
      const prosSnap = await getDocs(
        query(collection(db, "homepro_pros"), where("uid", "==", uid))
      );
      hasLicense = prosSnap.docs.some((d) => !!d.data()?.licenseUrl);
    }
    if (!hasLicense) return null;

    const result = await grantPoints(
      uid,
      userName || data.companyName || data.nickname || data.name || "사용자",
      "profile_complete"
    );
    await updateDoc(doc(db, USERS_COL, uid), { profileBonusAt: serverTimestamp() });
    return result;
  } catch (e) {
    console.warn("비즈프로필 완료 포인트 지급 실패:", e.message);
    return null;
  }
}

/** 규칙 정렬 순서 (관리자 페이지 / 적립 안내 카드용) */
export const POINT_RULE_ORDER = [
  "signup",
  "referral_invite",
  "referral_signup",
  "profile_complete",
  "order_complete",
  "order_perform",
  "review",
  "referral_order_complete",
  "referral_perform_complete",
  "order_create",
  "community_post",
  "community_like_10",
  "community_like_50",
  "community_like_100",
  // Firestore 호환 (review_like_* 통합 전 데이터)
  "review_like_10",
  "review_like_50",
  "review_like_100",
];
