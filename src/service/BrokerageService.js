/* eslint-disable */
// 공동중개(공인중개 라운지) 게시글 — 손님찾기(demand) / 매물등록(listing)
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, getDoc } from "firebase/firestore";
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

// 전체 목록 (최신순)
export async function getBrokeragePosts() {
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getBrokeragePost(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
