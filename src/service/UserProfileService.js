/* eslint-disable */
import {
    doc, getDoc, setDoc, deleteDoc, serverTimestamp,
    collection, query, where, getDocs, arrayUnion,
    runTransaction,
} from "firebase/firestore";
import { db } from "../api/config";

const safeTrim = (v) => String(v || "").trim();

function normalizeProvider(provider) {
    if (!provider) return "";
    if (provider === "google.com" || provider === "google") return "google";
    if (provider === "kakao") return "kakao";
    if (provider === "apple.com" || provider === "apple") return "apple";
    if (provider === "password" || provider === "email") return "email";
    return provider;
}

/**
 * 3단계 UID 조회 (jogunBiz 패턴)
 * 1) authUid 필드로 조회
 * 2) linkedSocialUid 필드로 조회
 * 3) linkedEmailUid 필드로 조회
 * 4) 문서 ID로 직접 조회
 */
export async function getUserProfileByUid(uid) {
    const u = safeTrim(uid);
    if (!u) throw new Error("UID_REQUIRED");

    // 1) authUid로 조회
    const q1 = query(collection(db, "users"), where("authUid", "==", u));
    const q1Snap = await getDocs(q1);
    if (!q1Snap.empty) {
        const d = q1Snap.docs[0];
        return { uid: d.id, ...d.data() };
    }

    // 2) linkedSocialUid로 조회
    const q2 = query(collection(db, "users"), where("linkedSocialUid", "==", u));
    const q2Snap = await getDocs(q2);
    if (!q2Snap.empty) {
        const d = q2Snap.docs[0];
        return { uid: d.id, ...d.data() };
    }

    // 3) linkedEmailUid로 조회
    const q3 = query(collection(db, "users"), where("linkedEmailUid", "==", u));
    const q3Snap = await getDocs(q3);
    if (!q3Snap.empty) {
        const d = q3Snap.docs[0];
        return { uid: d.id, ...d.data() };
    }

    // 4) 문서 ID로 직접 조회
    const ref = doc(db, "users", u);
    const snap = await getDoc(ref);
    if (snap.exists()) return { uid: u, ...snap.data() };

    return null;
}

/**
 * 프로필 업데이트 (merge)
 */
export async function upsertUserProfile(uid, patch) {
    const u = safeTrim(uid);
    if (!u) throw new Error("UID_REQUIRED");

    const ref = doc(db, "users", u);
    const snap = await getDoc(ref);
    const base = { ...(patch || {}), uid: u, updatedAt: serverTimestamp() };
    if (!snap.exists() || !snap.data().createdAt) {
        base.createdAt = serverTimestamp();
    }

    await setDoc(ref, base, { merge: true });
    return true;
}

/**
 * 소셜 로그인 후 초기 사용자 문서 생성
 */
export async function initUserDoc({ uid, email, provider }) {
    const providerKey = normalizeProvider(provider);
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            email: email || "",
            name: "",
            role: "",
            provider: providerKey,
            providers: providerKey ? [providerKey] : [],
            phoneE164: "",
            phoneVerified: false,
            status: "",
            createdAt: serverTimestamp(),
        });
    }
}

/**
 * 전화번호로 기존 사용자 조회
 */
export async function getUserByPhone(phoneE164) {
    const p = safeTrim(phoneE164);
    if (!p) return null;

    const phoneRef = doc(db, "phones", p);
    const phoneSnap = await getDoc(phoneRef);
    if (!phoneSnap.exists()) return null;
    const { primaryUid } = phoneSnap.data();
    if (!primaryUid) return null;
    return getUserProfileByUid(primaryUid);
}

/**
 * 소셜 로그인 UID를 기존 사용자에 연결
 * - 기존 사용자 문서에 linkedSocialUid 저장
 * - 소셜 빈 문서 삭제
 */
export async function linkSocialToExistingUser({ existingUid, socialUid, provider }) {
    const providerKey = normalizeProvider(provider);
    const userRef = doc(db, "users", existingUid);

    const existingSnap = await getDoc(userRef);
    const existingProvider = existingSnap.exists() ? normalizeProvider(existingSnap.data().provider) : "";
    const providersToAdd = [existingProvider, providerKey].filter(Boolean);

    const updates = { linkedSocialUid: socialUid, updatedAt: serverTimestamp() };
    if (providersToAdd.length > 0) updates.providers = arrayUnion(...providersToAdd);
    await setDoc(userRef, updates, { merge: true });

    // 소셜 로그인으로 생성된 빈 문서 삭제
    try {
        const socialDocRef = doc(db, "users", socialUid);
        const socialSnap = await getDoc(socialDocRef);
        if (socialSnap.exists() && socialSnap.id !== existingUid) {
            await deleteDoc(socialDocRef);
        }
    } catch (e) {
        console.warn("소셜 빈 문서 삭제 스킵:", e.message);
    }
}

/**
 * 이메일 계정 UID를 기존 사용자에 연결
 * - 기존 사용자 문서에 linkedEmailUid 저장
 * - 이메일 빈 문서 삭제
 */
export async function linkEmailToExistingUser({ existingUid, emailUid }) {
    const userRef = doc(db, "users", existingUid);

    const existingSnap = await getDoc(userRef);
    const existingProvider = existingSnap.exists() ? normalizeProvider(existingSnap.data().provider) : "";
    const providersToAdd = [existingProvider, "email"].filter(Boolean);

    const updates = { linkedEmailUid: emailUid, updatedAt: serverTimestamp() };
    if (providersToAdd.length > 0) updates.providers = arrayUnion(...providersToAdd);
    await setDoc(userRef, updates, { merge: true });

    // 이메일 로그인으로 생성된 빈 문서 삭제
    try {
        const emailDocRef = doc(db, "users", emailUid);
        const emailSnap = await getDoc(emailDocRef);
        if (emailSnap.exists() && emailSnap.id !== existingUid) {
            const data = emailSnap.data();
            if (!data.name && !data.role) {
                await deleteDoc(emailDocRef);
            }
        }
    } catch (e) {
        console.warn("이메일 빈 문서 삭제 스킵:", e.message);
    }
}

/**
 * 전화번호를 사용자에 연결
 * - users 문서 업데이트
 * - phones 인덱스 저장
 * - users_by_phone 인덱스 저장
 */
export async function linkPhoneToUid({ uid, phoneE164, provider }) {
    const u = safeTrim(uid);
    const p = safeTrim(phoneE164);

    if (!u) throw new Error("UID_REQUIRED");
    if (!p) throw new Error("PHONE_REQUIRED");

    const local = p.replace(/^\+82/, "0");
    const phone = local.length === 11
        ? `${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`
        : local;

    let resolvedPrimaryUid = u;

    // 트랜잭션으로 users + phones 원자적 업데이트
    await runTransaction(db, async (tx) => {
        const userRef = doc(db, "users", u);
        const phoneRef = doc(db, "phones", p);

        const phoneSnap = await tx.get(phoneRef);

        // users 문서 업데이트
        tx.set(userRef, {
            phoneE164: p,
            phone,
            phoneVerified: true,
            updatedAt: serverTimestamp(),
        }, { merge: true });

        // phones 인덱스
        if (!phoneSnap.exists()) {
            resolvedPrimaryUid = u;
            tx.set(phoneRef, {
                phoneE164: p,
                primaryUid: u,
                linkedUids: [u],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        } else {
            const data = phoneSnap.data() || {};
            resolvedPrimaryUid = data.primaryUid || u;
            const linked = Array.isArray(data.linkedUids) ? data.linkedUids : [];
            const nextLinked = linked.includes(u) ? linked : [...linked, u];
            tx.set(phoneRef, {
                linkedUids: nextLinked,
                updatedAt: serverTimestamp(),
            }, { merge: true });
        }
    });

    // users_by_phone 인덱스 (보조, 실패해도 무시)
    try {
        const indexRef = doc(db, "users_by_phone", p);
        await setDoc(indexRef, { uid: u, phoneE164: p, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
        console.warn("users_by_phone 인덱스 저장 실패 (무시):", e.message);
    }

    return { primaryUid: resolvedPrimaryUid };
}

/**
 * 전화번호로 대표 UID 조회
 */
export async function getPrimaryUidByPhone(phoneE164) {
    const p = safeTrim(phoneE164);
    if (!p) return null;

    const ref = doc(db, "phones", p);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    return snap.data()?.primaryUid || null;
}

/**
 * 닉네임 중복 체크
 * @returns {boolean} true = 이미 사용 중
 */
export async function isNicknameTaken(nickname) {
    const n = safeTrim(nickname);
    if (!n) return false;
    const q = query(collection(db, "users"), where("nickname", "==", n));
    const snap = await getDocs(q);
    return !snap.empty;
}
