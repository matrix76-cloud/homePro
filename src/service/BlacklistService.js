import { db } from "../api/config";
import { COLLECTIONS } from "../config/homeproConfig";
import { collection, addDoc, deleteDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";

const COL = COLLECTIONS.BLACKLIST; // "homepro_blacklist"

// 블랙리스트 등록 (내가 상대를 신고 → 상대는 나한테 오더 요청 불가)
export const addToBlacklist = async (reporterUid, targetUid, reason = "") => {
  const ref = collection(db, COL);
  const q = query(ref, where("reporterUid", "==", reporterUid), where("targetUid", "==", targetUid));
  const existing = await getDocs(q);
  if (!existing.empty) throw new Error("이미 블랙리스트에 등록된 사용자입니다");
  await addDoc(ref, {
    reporterUid,
    targetUid,
    reason,
    createdAt: serverTimestamp(),
  });
};

// 블랙리스트 해제
export const removeFromBlacklist = async (reporterUid, targetUid) => {
  const ref = collection(db, COL);
  const q = query(ref, where("reporterUid", "==", reporterUid), where("targetUid", "==", targetUid));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
  }
};

// 내가 등록한 블랙리스트 조회
export const getMyBlacklist = async (reporterUid) => {
  const ref = collection(db, COL);
  const q = query(ref, where("reporterUid", "==", reporterUid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// 상대가 나를 블랙리스트에 등록했는지 확인
// (오더 요청 시 체크: 내가 요청하려는 프로가 나를 블랙리스트 했는지)
export const isBlacklistedBy = async (proUid, requesterUid) => {
  const ref = collection(db, COL);
  const q = query(ref, where("reporterUid", "==", proUid), where("targetUid", "==", requesterUid));
  const snap = await getDocs(q);
  return !snap.empty;
};
