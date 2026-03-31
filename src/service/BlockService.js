import { db } from "../api/config";
import { COLLECTIONS } from "../config/homeproConfig";
import { collection, addDoc, deleteDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";

// 거부 등록 (양방향 가능: 접수자↔홈프로)
export const blockUser = async (blockerUid, blockedUid, reason = "") => {
  const ref = collection(db, COLLECTIONS.BLOCKS);
  // 중복 체크
  const q = query(ref, where("blockerUid", "==", blockerUid), where("blockedUid", "==", blockedUid));
  const existing = await getDocs(q);
  if (!existing.empty) throw new Error("이미 거부된 사용자입니다");
  await addDoc(ref, {
    blockerUid,
    blockedUid,
    reason,
    createdAt: serverTimestamp(),
  });
};

// 거부 해제
export const unblockUser = async (blockerUid, blockedUid) => {
  const ref = collection(db, COLLECTIONS.BLOCKS);
  const q = query(ref, where("blockerUid", "==", blockerUid), where("blockedUid", "==", blockedUid));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
  }
};

// 내가 거부한 목록 조회
export const getMyBlocks = async (blockerUid) => {
  const ref = collection(db, COLLECTIONS.BLOCKS);
  const q = query(ref, where("blockerUid", "==", blockerUid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// 특정 상대를 거부했는지 확인
export const isBlocked = async (blockerUid, blockedUid) => {
  const ref = collection(db, COLLECTIONS.BLOCKS);
  const q = query(ref, where("blockerUid", "==", blockerUid), where("blockedUid", "==", blockedUid));
  const snap = await getDocs(q);
  return !snap.empty;
};

// 양방향 거부 체크
export const isBlockedEither = async (uid1, uid2) => {
  const a = await isBlocked(uid1, uid2);
  if (a) return true;
  return await isBlocked(uid2, uid1);
};
