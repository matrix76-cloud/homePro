import { db } from "../api/config";
import { COLLECTIONS } from "../config/homeproConfig";
import {
  collection, addDoc, deleteDoc, getDocs, getDoc, doc, query, where, orderBy,
  updateDoc, serverTimestamp,
} from "firebase/firestore";

const COL = COLLECTIONS.BLACKLIST; // "homepro_blacklist"

/* 블랙리스트 신고 사유 (형 지시 7/31) */
export const BLACKLIST_REASONS = ["허위오더", "대금미지급", "비매너·욕설", "노쇼", "무단취소", "기타"];

/* 신고 상태 — pending: 관리자 확인중 / confirmed: 오더 작성·수락 권한 차단 / dismissed: 반려(게시판 비노출) */
export const BLACKLIST_STATUS_LABEL = {
  pending: "관리자 확인중",
  confirmed: "오더 작성·수락 권한 차단",
  dismissed: "반려",
};

/* 이름/업체명 마스킹 — 홍길동 → 홍○동, 두글자는 홍○ */
export const maskName = (name = "") => {
  const v = String(name).trim();
  if (v.length <= 1) return v || "미확인";
  if (v.length === 2) return v[0] + "○";
  return v[0] + "○".repeat(v.length - 2) + v[v.length - 1];
};

/* 전화번호 마스킹 — 010-1234-5678 → 010-****-5678 */
export const maskPhone = (phone = "") => {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 7) return phone ? "***" : "미등록";
  const head = digits.slice(0, 3);
  const tail = digits.slice(-4);
  return `${head}-****-${tail}`;
};

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

/* 블랙리스트 신고 접수 (정식 신고 — 사유선택 + 내용 + 증빙, 대상 정보는 마스킹 스냅샷 저장)
 * 저장 필드: reasonType(선택 사유), content(상황 기술), imgs(증빙 dataURL[]),
 *            targetNameMasked/targetPhoneMasked(게시판 공개용), status(pending) */
export const reportToBlacklist = async (reporterUid, targetUid, { reasonType, content = "", imgs = [] }) => {
  const ref = collection(db, COL);
  const q = query(ref, where("reporterUid", "==", reporterUid), where("targetUid", "==", targetUid));
  const existing = await getDocs(q);
  if (!existing.empty) throw new Error("이미 블랙리스트에 신고한 사용자입니다");

  let targetNameMasked = "미확인";
  let targetPhoneMasked = "미등록";
  try {
    const snap = await getDoc(doc(db, "users", targetUid));
    if (snap.exists()) {
      const u = snap.data();
      targetNameMasked = maskName(u.companyName || u.nickname || u.name || "");
      targetPhoneMasked = maskPhone(u.phone || u.phoneNumber || "");
    }
  } catch (e) { /* 대상 조회 실패해도 신고 자체는 접수 */ }

  await addDoc(ref, {
    reporterUid,
    targetUid,
    reasonType: reasonType || "기타",
    content,
    imgs,
    targetNameMasked,
    targetPhoneMasked,
    status: "pending",
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

/* 공개 블랙리스트 게시판 — 반려 건 제외, 최신순. 모든 사용자 조회 가능 */
export const getBlacklistBoard = async () => {
  const ref = collection(db, COL);
  const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(r => r.status !== "dismissed");
};

/* 관리자 — 전체 신고 목록 (반려 포함) */
export const getAllBlacklistReports = async () => {
  const ref = collection(db, COL);
  const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/* 관리자 — 신고 상태 변경 (pending | confirmed | dismissed) */
export const updateBlacklistReportStatus = async (reportId, status) => {
  await updateDoc(doc(db, COL, reportId), { status, reviewedAt: serverTimestamp() });
};

/* 관리자 — 악성 유저 오더 작성·수락 권한 차단/해제 (users.orderBlocked) */
export const setUserOrderBlocked = async (uid, blocked) => {
  await updateDoc(doc(db, "users", uid), { orderBlocked: !!blocked });
};

// 상대가 나를 블랙리스트에 등록했는지 확인
// (오더 요청 시 체크: 내가 요청하려는 프로가 나를 블랙리스트 했는지)
export const isBlacklistedBy = async (proUid, requesterUid) => {
  const ref = collection(db, COL);
  const q = query(ref, where("reporterUid", "==", proUid), where("targetUid", "==", requesterUid));
  const snap = await getDocs(q);
  return !snap.empty;
};
