/* eslint-disable */
import { db } from "../api/config";
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    runTransaction,
} from "firebase/firestore";

const safeTrim = (v) => String(v || "").trim();

export async function getUserProfileByUid(uid) {
    const u = safeTrim(uid);
    if (!u) throw new Error("UID_REQUIRED");

    const ref = doc(db, "users", u);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
}

export async function upsertUserProfile(uid, patch) {
    const u = safeTrim(uid);
    if (!u) throw new Error("UID_REQUIRED");

    await setDoc(
        doc(db, "users", u),
        { ...(patch || {}), uid: u, updatedAt: serverTimestamp() },
        { merge: true }
    );
    return true;
}

export async function linkPhoneToUid({ uid, phoneE164, provider }) {
    const u = safeTrim(uid);
    const p = safeTrim(phoneE164);
    const pr = safeTrim(provider);

    if (!u) throw new Error("UID_REQUIRED");
    if (!p) throw new Error("PHONE_REQUIRED");

    const phoneRef = doc(db, "phones", p);
    const userRef = doc(db, "users", u);

    let resolvedPrimaryUid = u;

    await runTransaction(db, async (tx) => {
        const phoneSnap = await tx.get(phoneRef);

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

            tx.set(
                phoneRef,
                { linkedUids: nextLinked, updatedAt: serverTimestamp() },
                { merge: true }
            );
        }

        tx.set(
            userRef,
            {
                uid: u,
                provider: pr || undefined,
                phoneE164: p,
                phoneVerified: true,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    });

    return { primaryUid: resolvedPrimaryUid };
}

export async function getPrimaryUidByPhone(phoneE164) {
    const p = safeTrim(phoneE164);
    if (!p) return null;

    const ref = doc(db, "phones", p);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    return snap.data()?.primaryUid || null;
}
