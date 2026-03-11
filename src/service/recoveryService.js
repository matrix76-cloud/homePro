/* eslint-disable */
import { doc, getDoc } from "firebase/firestore";
import { db } from "../api/config";
import { APP_CONFIG } from "../config/homeproConfig";

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

export function genOtp6() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendOtpViaProxy({ phone, authcode }) {
    const cfUrl = APP_CONFIG.sms.cfUrl;
    if (!cfUrl) throw new Error("SMS 서비스가 설정되지 않았습니다.");

    const normalized = phone.replace(/[^0-9]/g, "");
    const res = await fetch(cfUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized, authcode, label: APP_CONFIG.sms.label }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "SMS 발송 실패");
    return data;
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
