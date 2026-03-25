/* eslint-disable */
import { db } from "../api/config";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

/** app_updates 컬렉션에서 최신 버전 1개 조회 */
export const ReadVersion = async () => {
  try {
    const q = query(
      collection(db, "app_updates"),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return { version: null, content: "" };
    const doc = snap.docs[0].data();
    return { version: doc.version, content: doc.content || "" };
  } catch (e) {
    console.error("버전 조회 오류:", e.message);
    return { version: null, content: "" };
  }
};
