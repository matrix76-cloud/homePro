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

/** 기본 규칙 (Firestore 문서 없을 때 폴백) */
const DEFAULT_RULES = {
  referral_invite:    { amount: 100, label: "친구 초대 보상", active: true },
  referral_signup:    { amount: 100, label: "추천코드 사용 보상", active: true },
  order_create:       { amount: 50,  label: "오더 작성 보상", active: true },
  order_complete:     { amount: 0,   label: "오더 완료 보상", active: false },
  community_post:     { amount: 30,  label: "게시글 작성 보상", active: true },
  community_like_10:  { amount: 50,  label: "게시물 하트 10개 달성", active: true },
  community_like_50:  { amount: 100, label: "게시물 하트 50개 달성", active: true },
  community_like_100: { amount: 200, label: "게시물 하트 100개 달성", active: true },
  review:             { amount: 30,  label: "리뷰 작성 보상", active: true },
};

/** settings/point_rules에서 규칙 조회 (없으면 기본값) */
async function getRule(category) {
  const snap = await getDoc(doc(db, RULES_DOC));
  const rules = snap.exists() ? snap.data() : DEFAULT_RULES;
  return rules[category] || null;
}

/** 모든 활성 규칙 조회 (없으면 기본값) */
export async function getAllPointRules() {
  const snap = await getDoc(doc(db, RULES_DOC));
  return snap.exists() ? snap.data() : DEFAULT_RULES;
}

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

  // 하트 달성 카테고리 중복 체크 (relatedDocId + category)
  const likeMilestones = [
    "community_like_10", "community_like_50", "community_like_100",
  ];
  if (likeMilestones.includes(category) && options.relatedDocId) {
    const q = query(
      collection(db, CASH_COL),
      where("uid", "==", uid),
      where("category", "==", category),
      where("relatedDocId", "==", options.relatedDocId)
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

/** 규칙 정렬 순서 (관리자 페이지용) */
export const POINT_RULE_ORDER = [
  "referral_invite",
  "referral_signup",
  "order_create",
  "order_complete",
  "community_post",
  "community_like_10",
  "community_like_50",
  "community_like_100",
  "review",
  // Firestore 호환 (review_like_* 통합 전 데이터)
  "review_like_10",
  "review_like_50",
  "review_like_100",
];
