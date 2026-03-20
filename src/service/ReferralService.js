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

/** 랜덤 6자리 숫자 */
const randomStr = () => {
  const chars = "0123456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

/** 코드 생성 + referral_codes 저장 + users 업데이트 */
export async function generateReferralCode(uid) {
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
  const snap = await getDoc(doc(db, USERS_COL, uid));
  const data = snap.data();
  if (data?.referralCode) return data.referralCode;
  return generateReferralCode(uid);
}

/** 추천인 코드 적용 (유효성 검증 포함) */
export async function applyReferralCode(myUid, code) {
  const trimmed = (code || "").trim().toUpperCase();
  if (!trimmed) return { success: false, message: "코드를 입력해주세요" };

  // 대소문자 무시 — DB에는 소문자로 저장되므로 원본 코드로 조회
  const normalizedCode = code.trim();

  const codeSnap = await getDoc(doc(db, CODES_COL, normalizedCode));
  if (!codeSnap.exists()) return { success: false, message: "존재하지 않는 코드입니다" };

  const codeData = codeSnap.data();
  if (!codeData.active) return { success: false, message: "만료된 코드입니다" };
  if (codeData.uid === myUid) return { success: false, message: "본인 코드는 사용할 수 없습니다" };

  // 이미 사용했는지 확인
  const mySnap = await getDoc(doc(db, USERS_COL, myUid));
  const myData = mySnap.data();
  if (myData?.referredBy) return { success: false, message: "이미 추천인 코드를 사용했습니다" };

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
