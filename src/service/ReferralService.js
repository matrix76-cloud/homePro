import { db } from "../api/config";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";

const CODES_COL = "referral_codes";
const USERS_COL = "users";

/* ─── 공식 초대코드 (대표 리뷰 11/22 그랜드 오픈 사전예약 — HOMEPRO2026) ───
   코드 문서(referral_codes/<코드>)에 official: true 면 '추천인이 없는 코드'다.
   · 가입한 사람에게만 referral_signup 포인트를 준다(추천인 보상 · 추천 수 증가 없음).
   · users.referredBy 에는 추천인 uid 대신 "OFFICIAL:<코드>" 를 적는다 — 한 번 쓴 사람은 기존 규칙대로 다시 못 쓴다.
   · 회원 코드는 영문 2 + 숫자 6(8자)이라 공식 코드(HOMEPRO2026, 11자)와 겹칠 수 없다.
   · 코드 문서는 scripts/seed-official-code.mjs 로 만든다. active: false 로 바꾸면 "만료된 코드"가 된다.
   ★users.referredBy 를 추천인 uid 로 읽는 곳(오더 완료 추천인 보상 등)은 isOfficialReferrer 로 걸러야 한다 —
     안 거르면 없는 회원("OFFICIAL:…") 앞으로 포인트 원장이 생긴다. */
export const OFFICIAL_REF_PREFIX = "OFFICIAL:";
export const isOfficialReferrer = (v) => typeof v === "string" && v.startsWith(OFFICIAL_REF_PREFIX);

/** 영문 대문자 2자 + 숫자 6자리 */
const randomStr = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  let s = "";
  for (let i = 0; i < 2; i++) s += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 6; i++) s += digits[Math.floor(Math.random() * digits.length)];
  return s;
};

/** 코드 생성 + referral_codes 저장 + users 업데이트 */
export async function generateReferralCode(uid) {
  // 공식 코드 표시("OFFICIAL:…")는 회원이 아니다 — 코드 · 회원 문서를 만들지 않는다
  if (!uid || isOfficialReferrer(uid)) throw new Error("회원 정보가 없어 코드를 만들 수 없습니다");
  let code, exists;
  // 중복 방지 (최대 5회 시도)
  for (let i = 0; i < 5; i++) {
    code = randomStr();
    const snap = await getDoc(doc(db, CODES_COL, code));
    if (!snap.exists()) { exists = false; break; }
    exists = true;
  }
  if (exists) throw new Error("코드 생성 실패 — 다시 시도해주세요");

  await setDoc(doc(db, CODES_COL, code), {
    uid,
    active: true,
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, USERS_COL, uid), { referralCode: code }, { merge: true });

  return code;
}

/** 재발행: 기존 무효화 + 새 코드 발행 */
export async function regenerateReferralCode(uid, oldCode) {
  // 기존 코드 무효화
  if (oldCode) {
    try {
      await updateDoc(doc(db, CODES_COL, oldCode), { active: false });
    } catch (e) {
      console.warn("기존 코드 무효화 실패:", e.message);
    }
  }
  return generateReferralCode(uid);
}

/** users에서 코드 조회, 없으면 자동 생성 */
export async function getReferralCode(uid) {
  // 초대 탭의 '등록한 코드'는 users.referredBy 를 uid 로 넘겨 이 함수를 부른다.
  // 공식 코드로 가입한 사람은 그 값이 "OFFICIAL:HOMEPRO2026" 이라, 새로 만들지 않고 그 코드를 그대로 돌려준다
  if (isOfficialReferrer(uid)) return uid.slice(OFFICIAL_REF_PREFIX.length);
  const snap = await getDoc(doc(db, USERS_COL, uid));
  const data = snap.data();
  if (data?.referralCode) return data.referralCode;
  return generateReferralCode(uid);
}

/** 추천인 코드 적용 (유효성 검증 포함) */
export async function applyReferralCode(myUid, code) {
  // 코드는 대문자로 생성·저장된다 — 소문자로 입력해도 통과되도록 대문자 정규화 후 조회
  // (전수검사 7/29: 정규화값을 만들어놓고 원본으로 조회해 소문자 입력이 항상 실패했음)
  const trimmed = (code || "").trim().toUpperCase();
  if (!trimmed) return { success: false, message: "코드를 입력해주세요" };

  const codeSnap = await getDoc(doc(db, CODES_COL, trimmed));
  if (!codeSnap.exists()) return { success: false, message: "존재하지 않는 코드입니다" };

  const codeData = codeSnap.data();
  if (!codeData.active) return { success: false, message: "만료된 코드입니다" };
  const official = codeData.official === true;
  // 공식 코드에 끝나는 날(expiresAt)을 적어 두면 그 뒤로는 안 받는다 (없으면 계속 받는다)
  if (official && codeData.expiresAt) {
    const end = codeData.expiresAt?.toMillis ? codeData.expiresAt.toMillis() : new Date(codeData.expiresAt).getTime();
    if (end && end < Date.now()) return { success: false, message: "만료된 코드입니다" };
  }
  if (!official && codeData.uid === myUid) return { success: false, message: "본인 코드는 사용할 수 없습니다" };

  // 이미 사용했는지 확인
  const mySnap = await getDoc(doc(db, USERS_COL, myUid));
  const myData = mySnap.data();
  if (myData?.referredBy) return { success: false, message: "이미 추천인 코드를 사용했습니다" };

  // 공식 초대코드 — 추천인이 없다. 가입한 사람에게만 포인트, 추천 수 · 추천인 보상은 건드리지 않는다
  if (official) {
    await setDoc(doc(db, USERS_COL, myUid), { referredBy: `${OFFICIAL_REF_PREFIX}${trimmed}` }, { merge: true });
    try {
      // 몇 명이 이 코드로 들어왔는지 코드 문서에 센다 (실패해도 진행)
      await setDoc(doc(db, CODES_COL, trimmed), { usedCount: increment(1), lastUsedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn("공식 코드 사용 수 기록 실패:", e.message);
    }
    try {
      const { grantPoints } = await import("./PointService");
      const myName = myData?.name || myData?.nickname || "사용자";
      await grantPoints(myUid, myName, "referral_signup", { relatedDocId: `official:${trimmed}` });
    } catch (e) {
      console.warn("추천 포인트 지급 실패:", e.message);
    }
    return { success: true, message: "추천인 코드가 적용되었습니다!" };
  }

  // 적용: 내 referredBy 저장 + 추천인 카운트 +1
  await setDoc(doc(db, USERS_COL, myUid), { referredBy: codeData.uid }, { merge: true });
  await setDoc(doc(db, USERS_COL, codeData.uid), { referralCount: increment(1) }, { merge: true });

  // 포인트 지급: 추천인 + 피추천인
  try {
    const { grantPoints } = await import("./PointService");
    const inviterSnap = await getDoc(doc(db, USERS_COL, codeData.uid));
    const inviterName = inviterSnap.data()?.name || inviterSnap.data()?.nickname || "사용자";
    const mySnap2 = await getDoc(doc(db, USERS_COL, myUid));
    const myName = mySnap2.data()?.name || mySnap2.data()?.nickname || "사용자";
    await grantPoints(codeData.uid, inviterName, "referral_invite", { relatedUid: myUid });
    await grantPoints(myUid, myName, "referral_signup", { relatedUid: codeData.uid });
  } catch (e) {
    console.warn("추천 포인트 지급 실패:", e.message);
  }

  return { success: true, message: "추천인 코드가 적용되었습니다!" };
}

/** 통계 조회 */
export async function getReferralStats(uid) {
  const snap = await getDoc(doc(db, USERS_COL, uid));
  const data = snap.data() || {};
  return {
    referralCount: data.referralCount || 0,
    referralPoints: data.referralPoints || 0,
  };
}

/* ─── 초대문구 (대표 확정본, 대표 리뷰 11/02) ───
   복사 · 공유로 바깥 앱(카카오톡 · 문자)에 나가는 평문이라 대표가 준 이모지를 그대로 둔다.
   화면에 그릴 때는 InviteMessageLines 로 줄을 나눠 이모지 자리를 아이콘으로 바꾼다.
   포인트는 settings/point_rules 의 referral_signup(추천코드로 가입한 사람이 받는 몫, 11/03 기준 3,000P) */
export const INVITE_POINT_FALLBACK = 3000;

export function inviteMessageLines(code, url, points = INVITE_POINT_FALLBACK) {
  const p = Number(points || INVITE_POINT_FALLBACK).toLocaleString("ko-KR");
  return [
    { text: "[홈프로 파트너 초대장]" },
    { text: "홈클리닝, 설비, 에어컨, 인테리어까지!" },
    { text: "집(Home) 관련 30여 개 모든 분야 사장님들이 드디어 한곳에 뭉쳤습니다." },
    { text: "혼자 고민하던 현장 오더는 공유하고," },
    { text: "내 일감 확장과 함께 쏠쏠한 추가 수익까지 창출하는 대한민국 1등 B2B 플랫폼!" },
    { text: `지금 바로 합류하고 현장에서 유용하게 쓰는 ${p}포인트를 챙겨 가세요.`, emoji: "\u{1F381}", icon: "gift", iconAfter: true },
    { text: `초대코드: ${code || ""}`, emoji: "\u{1F3AB}", icon: "ticket" },
    { text: url || "" },
  ];
}

/** 복사 · 공유되는 평문 */
export function buildInviteMessage(code, url, points = INVITE_POINT_FALLBACK) {
  return inviteMessageLines(code, url, points)
    .map((l) => (l.emoji ? (l.iconAfter ? `${l.text} ${l.emoji}` : `${l.emoji} ${l.text}`) : l.text))
    .join("\n");
}

/** 초대받은 사람이 받는 포인트 — 규칙이 꺼져 있거나 못 읽으면 기본값 */
export async function getInviteSignupPoints() {
  try {
    const { getAllPointRules } = await import("./PointService");
    const rules = await getAllPointRules();
    const r = rules?.referral_signup;
    if (r && r.active !== false && Number(r.amount) > 0) return Number(r.amount);
  } catch (e) { /* 기본값 */ }
  return INVITE_POINT_FALLBACK;
}
