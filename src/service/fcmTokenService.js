/* eslint-disable */
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../api/config";

export const saveFcmToken = async (uid, token, platform = "android") => {
    if (!uid || !token) return;
    const tokenId = `${uid}_${platform}`;
    await setDoc(doc(db, "fcmTokens", tokenId), {
        uid,
        token,
        platform,
        updatedAt: serverTimestamp(),
    });
};

export const removeFcmToken = async (uid) => {
    if (!uid) return;
    const q = query(collection(db, "fcmTokens"), where("uid", "==", uid));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
        await deleteDoc(d.ref);
    }
};
