/* eslint-disable */
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../api/config";
import { COLLECTIONS } from "../config/homeproConfig";

const ordersRef = collection(db, COLLECTIONS.ORDERS);

/** 오더 생성 */
export async function createOrder(data) {
  const docRef = await addDoc(ordersRef, {
    ...data,
    orderStatus: "접수",
    createdAt: serverTimestamp(),
  });
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

/** 전체 오더 실시간 구독 */
export function subscribeToAllOrders(callback) {
  const q = query(ordersRef, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(orders);
  });
}

/** Firestore Timestamp → "N분 전" 변환 */
export function formatOrderTime(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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
