/* eslint-disable */
import { doc, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db, firebaseApp } from "../api/config";
import { APP_CONFIG } from "../config/homeproConfig";

// Cloud Functions 배포 리전 (기본값 us-central1 로 나가면 404)
const FUNCTIONS_REGION = "asia-northeast3";

export function toE164KR(raw) {
    const n = (raw || "").replace(/[^0-9]/g, "");
    if (n.startsWith("0")) return "+82" + n.slice(1);
    if (n.startsWith("82")) return "+" + n;
    return "+82" + n;
}

export function formatKRPhone(e164) {
    if (!e164) return "";
    const local = e164.replace(/^\+82/, "0");
    if (local.length === 11) return `${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
    if (local.length === 10) return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
    return local;
}

/* ─── 전화번호 인증 (서버 발급/검증) ───────────────────────────
   인증번호를 브라우저에서 만들고 비교하던 방식은 폐기했다.
   코드 생성·발송·대조는 전부 Cloud Function 이 하고, 클라이언트는
   성공 시 받은 verificationToken 만 들고 다닌다. (형 지시 7/28)             */

/** 인증번호 발송 요청 */
export async function requestPhoneCode(phone) {
    const fn = httpsCallable(getFunctions(firebaseApp, FUNCTIONS_REGION), "requestPhoneCode");
    const res = await fn({ phone, label: APP_CONFIG.sms.label });
    return res.data; // { ok, expiresInSec, resendAfterSec }
}

/** 인증번호 검증 → verificationToken */
export async function verifyPhoneCode(phone, code) {
    const fn = httpsCallable(getFunctions(firebaseApp, FUNCTIONS_REGION), "verifyPhoneCode");
    const res = await fn({ phone, code });
    return res.data; // { ok, verificationToken, expiresInSec }
}

/** 전화번호 연결 + 계정 통합 (인증 토큰 필수) */
export async function linkPhoneToAccount({ phone, verificationToken, provider }) {
    const fn = httpsCallable(getFunctions(firebaseApp, FUNCTIONS_REGION), "linkPhoneToAccount");
    const res = await fn({ phone, verificationToken, provider });
    return res.data; // { ok, primaryUid, merged }
}

/** 인증된 번호로 가입 아이디 조회 */
export async function findAccountByPhone({ phone, verificationToken }) {
    const fn = httpsCallable(getFunctions(firebaseApp, FUNCTIONS_REGION), "findAccountByPhone");
    const res = await fn({ phone, verificationToken });
    return res.data; // { ok, found, loginId, provider }
}

/** Cloud Functions 호출 오류 → 사용자에게 보여줄 문구 */
export function phoneAuthErrorMessage(err) {
    const msg = String(err?.message || "");
    if (msg && !/internal|unknown/i.test(msg)) return msg;
    return "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

export async function findEmailByPhoneE164(phoneE164) {
    // users_by_phone에서 uid 찾기
    const ref = doc(db, "users_by_phone", phoneE164);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        // phones 컬렉션 fallback
        const phoneRef = doc(db, "phones", phoneE164);
        const phoneSnap = await getDoc(phoneRef);
        if (!phoneSnap.exists()) return null;
        const uid = phoneSnap.data()?.primaryUid;
        if (!uid) return null;
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return null;
        return userSnap.data().email || null;
    }

    const { uid } = snap.data();
    if (!uid) return null;

    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return null;
    const userData = userSnap.data();
    return userData.email || null;
}

export async function findUidByPhoneE164(phoneE164) {
    const ref = doc(db, "users_by_phone", phoneE164);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        // phones 컬렉션 fallback
        const phoneRef = doc(db, "phones", phoneE164);
        const phoneSnap = await getDoc(phoneRef);
        if (!phoneSnap.exists()) return null;
        return phoneSnap.data()?.primaryUid || null;
    }
    return snap.data().uid || null;
}

export async function resetPasswordViaProxy({ uid, newPassword }) {
    const cfUrl = APP_CONFIG.resetPasswordUrl;
    if (!cfUrl) throw new Error("비밀번호 리셋 서비스가 설정되지 않았습니다.");

    const res = await fetch(cfUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "비밀번호 변경 실패");
    return data;
}

export function maskEmail(email) {
    if (!email) return "";
    const [local, domain] = email.split("@");
    if (!domain) return email;
    if (local.length <= 1) return `${local}***@${domain}`;
    return `${local[0]}${"*".repeat(Math.min(local.length - 1, 5))}@${domain}`;
}
