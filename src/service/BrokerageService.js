/* eslint-disable */
// 공동중개(공인중개 라운지) 게시글 — 손님찾기(demand) / 매물등록(listing)
import { collection, addDoc, getDocs, query, orderBy, where, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../api/config";

const COL = "brokerage_posts";

// 거래유형 (스샷 스펙)
export const DEAL_TYPES = [
  "아파트/주상복합/콘도미니엄",
  "빌라·다세대 연립/원룸투룸 오피스텔",
  "단독.전원주택",
  "상가.점포/사무실/지식산업센터",
  "통빌딩/꼬마빌딩",
  "공장/창고 물류센터",
  "나대지 대지/농지 임야/개발부지",
  "기타",
];

export const CONTRACT_TYPES = ["매매", "전세", "월세", "기타"];

// 게시글 등록
export async function createBrokeragePost(data) {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// 전체 목록 (최신순). 거래 종료(closed) 글은 메인 리스트에서 뺀다 (대표 9/10: 종료 글은 블라인드)
export async function getBrokeragePosts() {
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.status !== "closed");
}

// 내 작성글 (종료 포함, 최신순) — 거래 종료 관리용 (대표 9/10)
export async function getMyBrokeragePosts(uid) {
  if (!uid) return [];
  const snap = await getDocs(query(collection(db, COL), where("authorUid", "==", uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}

// 거래 종료 / 다시 열기 — 본인 글만
export async function setBrokeragePostStatus(id, status) {
  await updateDoc(doc(db, COL, id), { status, closedAt: status === "closed" ? serverTimestamp() : null, updatedAt: serverTimestamp() });
}

export async function getBrokeragePost(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
