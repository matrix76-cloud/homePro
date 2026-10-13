/**
 * 보험 1:1 문의 (대표 리뷰 2026-10-06)
 *
 * 문의 한 건 = 채팅방 하나(chatRooms, roomType "insurance_inquiry").
 *   참가자는 문의한 홈프로 + 가상 관리자(INQUIRY_ADMIN_UID). 그래서 홈프로 쪽은 채팅 목록·채팅방·안읽음 표시를
 *   그대로 쓰고, 관리자는 관리자 페이지 [보험 문의내역 관리]에서 같은 방의 메시지를 읽고 답한다.
 *
 * 답변 상태는 따로 저장하지 않고 unreadCount[INQUIRY_ADMIN_UID] 로 판단한다.
 *   홈프로가 글을 쓰면(첫 문의 포함) 올라가고, 관리자가 답하면 0 이 된다 → 0 보다 크면 '미답변'.
 */
import {
  collection, addDoc, doc, getDoc, getDocs, query, where, orderBy, onSnapshot, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../api/config";

export const INQUIRY_ROOM_TYPE = "insurance_inquiry";
export const INQUIRY_ADMIN_UID = "insurance_admin";
export const INQUIRY_ADMIN_NAME = "홈프로 보험 문의";
export const INQUIRY_TYPES = ["보장 범위", "가입", "사고 접수", "기타"];

const roomsRef = collection(db, "chatRooms");
const toMs = (v) => (v?.toMillis ? v.toMillis() : v?.seconds ? v.seconds * 1000 : 0);

/** 미답변인가 — 관리자가 아직 안 읽은(답하지 않은) 홈프로 글이 있다 */
export const isInquiryUnanswered = (room) => Number(room?.unreadCount?.[INQUIRY_ADMIN_UID] || 0) > 0;

/** 홈프로가 문의 등록 → 방 id */
export async function createInsuranceInquiry({ uid, name, photo, type, title, body }) {
  if (!uid) throw new Error("로그인 후 문의할 수 있습니다");
  const t = String(title || "").trim();
  const b = String(body || "").trim();
  if (!t) throw new Error("제목을 입력해 주세요");
  if (!b) throw new Error("문의 내용을 입력해 주세요");
  const first = `[${type || "기타"}] ${t}\n${b}`;
  const roomDoc = await addDoc(roomsRef, {
    participants: [uid, INQUIRY_ADMIN_UID],
    participantNames: { [uid]: name || "홈프로", [INQUIRY_ADMIN_UID]: INQUIRY_ADMIN_NAME },
    participantPhotos: { [uid]: photo || "", [INQUIRY_ADMIN_UID]: "" },
    unreadCount: { [uid]: 0, [INQUIRY_ADMIN_UID]: 1 },
    roomType: INQUIRY_ROOM_TYPE,
    roomName: t,
    inquiryType: type || "기타",
    inquiryTitle: t,
    inquiryUid: uid,
    lastMessage: b,
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    messageCount: 1,
  });
  await addDoc(collection(db, "chatRooms", roomDoc.id, "messages"), {
    text: first,
    senderId: uid,
    senderName: name || "홈프로",
    createdAt: serverTimestamp(),
    readBy: [uid],
  });
  return roomDoc.id;
}

/** 내 문의 목록 (최근 것부터) */
export async function listMyInsuranceInquiries(uid) {
  if (!uid) return [];
  const snap = await getDocs(query(roomsRef, where("inquiryUid", "==", uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => r.roomType === INQUIRY_ROOM_TYPE)
    .sort((a, b) => toMs(b.lastMessageAt) - toMs(a.lastMessageAt));
}

/** 관리자 — 전체 문의 실시간 구독 */
export function subscribeInsuranceInquiries(callback) {
  return onSnapshot(query(roomsRef, where("roomType", "==", INQUIRY_ROOM_TYPE)), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => toMs(b.lastMessageAt) - toMs(a.lastMessageAt));
    callback(list);
  });
}

/** 관리자 — 한 문의의 대화 실시간 구독 */
export function subscribeInquiryMessages(roomId, callback) {
  return onSnapshot(query(collection(db, "chatRooms", roomId, "messages"), orderBy("createdAt", "asc")), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** 관리자 답변 등록 — 홈프로 채팅방에 바로 뜨고, 알림(푸시)도 보낸다 */
export async function replyInsuranceInquiry(roomId, text) {
  const body = String(text || "").trim();
  if (!body) throw new Error("답변 내용을 입력해 주세요");
  const roomRef = doc(db, "chatRooms", roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) throw new Error("문의를 찾을 수 없습니다");
  const room = snap.data();
  const userUid = room.inquiryUid || (room.participants || []).find((u) => u !== INQUIRY_ADMIN_UID);
  await addDoc(collection(db, "chatRooms", roomId, "messages"), {
    text: body,
    senderId: INQUIRY_ADMIN_UID,
    senderName: INQUIRY_ADMIN_NAME,
    createdAt: serverTimestamp(),
    readBy: [INQUIRY_ADMIN_UID],
  });
  await updateDoc(roomRef, {
    lastMessage: body,
    lastMessageAt: serverTimestamp(),
    messageCount: (room.messageCount || 0) + 1,
    [`unreadCount.${INQUIRY_ADMIN_UID}`]: 0,
    ...(userUid ? { [`unreadCount.${userUid}`]: Number(room.unreadCount?.[userUid] || 0) + 1 } : {}),
    answeredAt: serverTimestamp(),
  });
  if (userUid) {
    await addDoc(collection(db, "notifications"), {
      targetUids: [userUid],
      title: "보험 문의 답변이 등록되었습니다",
      body: body.slice(0, 120),
      type: "insurance_inquiry_reply",
      data: { roomId },
      read: false, sent: false,
      createdAt: serverTimestamp(),
    }).catch(() => {});
  }
}

/** 관리자 — 답변 없이 확인만 한 것으로 표시(미답변에서 내림) */
export async function markInquiryChecked(roomId) {
  await updateDoc(doc(db, "chatRooms", roomId), { [`unreadCount.${INQUIRY_ADMIN_UID}`]: 0 });
}
