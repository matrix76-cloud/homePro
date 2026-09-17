/**
 * 사업자용 PG결제 — 결제링크로 고객에게 직접 결제받기 (대표 리뷰 9/17)
 *
 * 상태머신 (pg_payment_requests.status)
 *   requested   결제 요청 생성      사업자가 금액·고객을 입력해 만든 직후
 *   link_issued 링크 발급          고객에게 보낼 결제링크가 만들어짐
 *   paying      고객 결제          고객이 링크에서 결제를 진행함 (PG 승인 대기)
 *   paid        결제완료           PG Webhook 으로 승인이 확인됨 — 서버만 바꾼다
 *   canceled    취소               결제 전 사업자가 요청을 취소
 * 정산상태 (settleStatus) — paid 이후에만 의미가 있다. 정산은 PG사가 사업자 계좌로 직접 한다.
 *   pending → settled
 *
 * paying 이후 전이(paid·정산)는 PG Webhook 을 받는 서버 함수가 맡는다. 제휴 PG 계약 전이라 아직 없음.
 */
import {
  collection, addDoc, doc, getDoc, getDocs, query, where, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../api/config";

export const PG_COL = "pg_payment_requests";

export const PG_STEPS = [
  { key: "requested", label: "결제 요청 생성" },
  { key: "link_issued", label: "링크 발급" },
  { key: "paying", label: "고객 결제" },
  { key: "webhook", label: "PG 승인 확인" },
  { key: "paid", label: "결제완료" },
  { key: "settle", label: "정산" },
];

export const PG_STATUS_LABEL = {
  requested: "요청 생성",
  link_issued: "링크 발급됨",
  paying: "고객 결제 중",
  paid: "결제완료",
  canceled: "취소",
};

export const PG_SETTLE_LABEL = { pending: "정산 대기", settled: "정산 완료" };

export const PG_KIND = {
  work: { label: "작업대금", desc: "홈프로 오더 또는 외부 일반 고객의 작업대금" },
  referral: { label: "소개수수료 청구", desc: "홈프로에서 오더를 공유해 생긴 소개수수료" },
};

/** 진행 단계 인덱스 (PG_STEPS 기준, 이 인덱스까지 끝난 것) */
export function stepIndex(r) {
  if (!r) return -1;
  if (r.status === "paid") return r.settleStatus === "settled" ? 5 : 4;
  if (r.status === "paying") return 2;
  if (r.status === "link_issued") return 1;
  return 0;
}

export const pgLinkUrl = (id) => `${window.location.origin}/pg/${id}`;

export async function createPgRequest(uid, { kind, amount, customerName, customerPhone, memo, orderId, orderTitle, sellerName }) {
  const ref = await addDoc(collection(db, PG_COL), {
    uid,
    sellerName: sellerName || "",
    kind,
    amount: Number(amount),
    customerName: customerName.trim(),
    customerPhone: customerPhone.replace(/[^0-9]/g, ""),
    memo: (memo || "").trim(),
    orderId: orderId || null,
    orderTitle: orderTitle || null,
    status: "requested",
    settleStatus: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function issuePgLink(id) {
  await updateDoc(doc(db, PG_COL, id), {
    status: "link_issued",
    linkUrl: pgLinkUrl(id),
    linkIssuedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function cancelPgRequest(id) {
  await updateDoc(doc(db, PG_COL, id), { status: "canceled", canceledAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function listMyPgRequests(uid) {
  const snap = await getDocs(query(collection(db, PG_COL), where("uid", "==", uid)));
  const ms = (v) => (v?.toMillis ? v.toMillis() : 0);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
}

export async function getPgRequest(id) {
  const s = await getDoc(doc(db, PG_COL, id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

/** 소개수수료 청구에 연결할 내 오더 — 내가 접수했거나 배정받은 오더 */
export async function listMyOrdersForPg(uid) {
  const col = collection(db, "homepro_orders");
  const [a, b] = await Promise.all([
    getDocs(query(col, where("createdBy", "==", uid))),
    getDocs(query(col, where("matchedProUid", "==", uid))),
  ]);
  const map = new Map();
  [...a.docs, ...b.docs].forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
  const ms = (v) => (v?.toMillis ? v.toMillis() : 0);
  return [...map.values()].sort((x, y) => ms(y.createdAt) - ms(x.createdAt)).slice(0, 50);
}
