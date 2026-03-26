/* eslint-disable */
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  arrayUnion,
  increment,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../api/config";
import { COLLECTIONS } from "../config/homeproConfig";

const ordersRef = collection(db, COLLECTIONS.ORDERS);

/** 오더 생성 */
export async function createOrder(data) {
  const docRef = await addDoc(ordersRef, {
    ...data,
    orderStatus: "요청",
    createdAt: serverTimestamp(),
  });

  // 포인트 지급: 오더 작성 보상
  if (data.createdBy) {
    try {
      const { grantPoints } = await import("./PointService");
      const userName = data.writer || data.customerName || data.nickname || "사용자";
      await grantPoints(data.createdBy, userName, "order_create", { relatedDocId: docRef.id });
    } catch (e) {
      console.warn("오더 작성 포인트 지급 실패:", e.message);
    }
  }

  return docRef.id;
}

/** 단건 조회 */
export async function getOrder(orderId) {
  const snap = await getDoc(doc(db, COLLECTIONS.ORDERS, orderId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/** 카테고리별 조회 */
export async function getOrdersByCategory(categoryId) {
  const q = query(
    ordersRef,
    where("categoryId", "==", categoryId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** 오더 1건 조회 */
export async function getOrderById(orderId) {
  const snap = await getDoc(doc(db, COLLECTIONS.ORDERS, orderId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/** 내 오더 조회 */
export async function getOrdersByUser(uid) {
  const q = query(
    ordersRef,
    where("createdBy", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** 받은 일감 조회 (내가 수주한 오더) */
export async function getOrdersByMatchedPro(uid) {
  const q = query(
    ordersRef,
    where("matchedProUid", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** 전체 오더 실시간 구독 */
export function subscribeToAllOrders(callback) {
  const q = query(ordersRef, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(orders);
  });
}

/** 전체 오더 페이징 조회 (커서 방식) */
export async function getOrdersPaginated(lastDoc = null, pageSize = 20) {
  const constraints = [orderBy("createdAt", "desc"), limit(pageSize)];
  if (lastDoc) constraints.push(startAfter(lastDoc));
  const q = query(ordersRef, ...constraints);
  const snap = await getDocs(q);
  const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const last = snap.docs[snap.docs.length - 1] || null;
  return { orders, lastDoc: last, hasMore: snap.docs.length === pageSize };
}

/** 오더 소프트 삭제 (hiddenBy 배열에 uid 추가) */
export async function hideOrder(orderId, uid) {
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    hiddenBy: arrayUnion(uid),
  });
}

/** 내가 이미 견적 보냈는지 확인 */
export async function hasMyQuote(orderId, proUid) {
  const q = query(
    collection(db, COLLECTIONS.ORDERS, orderId, "quotes"),
    where("proUid", "==", proUid)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/** 견적 보내기 */
export async function sendQuote(orderId, quoteData) {
  const quoteRef = await addDoc(
    collection(db, COLLECTIONS.ORDERS, orderId, "quotes"),
    { ...quoteData, status: "pending", createdAt: serverTimestamp() }
  );
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    quoteCount: increment(1),
  });
  return quoteRef.id;
}

/** 견적 목록 조회 */
export async function getQuotes(orderId) {
  const q = query(
    collection(db, COLLECTIONS.ORDERS, orderId, "quotes"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** 견적 수락 */
export async function acceptQuote(orderId, quoteId, proUid) {
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId, "quotes", quoteId), {
    status: "accepted",
  });
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    orderStatus: "진행",
    matchedProUid: proUid,
  });
}

/** Firestore Timestamp → "N분 전" 변환 */
export function formatOrderTime(timestamp) {
  if (!timestamp) return "";
  let date;
  if (timestamp.toDate) date = timestamp.toDate();
  else if (timestamp.seconds) date = new Date(timestamp.seconds * 1000);
  else date = new Date(timestamp);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}.${dd}.`;
}

/** 오더 상태 변경 */
export async function updateOrderStatus(orderId, newStatus) {
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    orderStatus: newStatus,
    updatedAt: serverTimestamp(),
  });
}

/** 리뷰 작성 + 상태 변경 */
export async function submitOrderReview(orderId, reviewData) {
  await addDoc(collection(db, COLLECTIONS.ORDERS, orderId, "reviews"), {
    ...reviewData,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    orderStatus: "리뷰",
    updatedAt: serverTimestamp(),
  });
}
