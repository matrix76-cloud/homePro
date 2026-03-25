/* eslint-disable */
import {
  collection, doc, query, where, orderBy, limit,
  addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  onSnapshot, serverTimestamp, arrayRemove, arrayUnion, increment,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../api/config";
import { compressDetailImage } from "../utility/imageUtils";

const roomsRef = collection(db, "chatRooms");

// ════════════════════════════════════════
// 채팅방 관리
// ════════════════════════════════════════

/**
 * 채팅방 생성 (중복 방지: orderId+proUid 조합으로 체크)
 * @param {object} options - { orderId, quoteId } 견적 연동 정보
 */
export async function createChatRoom(myUid, myName, myPhoto, otherUid, otherName, otherPhoto, options = {}) {
  const { orderId, quoteId, type } = options;

  // orderId 기반 중복 체크 (같은 오더+같은 프로 조합)
  if (orderId) {
    const q = query(roomsRef, where("orderId", "==", orderId), where("participants", "array-contains", myUid));
    const snap = await getDocs(q);
    const existing = snap.docs.find((d) => d.data().participants.includes(otherUid));
    if (existing) return existing.id;
  } else {
    // 기존 방 검색 (orderId 없는 경우 — 같은 타입의 일반 채팅방만)
    const q = query(roomsRef, where("participants", "array-contains", myUid));
    const snap = await getDocs(q);
    const roomType = type || "general";
    const existing = snap.docs.find((d) => {
      const data = d.data();
      return data.participants.length === 2 && data.participants.includes(otherUid)
        && !data.orderId && (data.roomType || "general") === roomType;
    });
    if (existing) return existing.id;
  }

  // 새 방 생성
  const docRef = await addDoc(roomsRef, {
    participants: [myUid, otherUid],
    participantNames: { [myUid]: myName, [otherUid]: otherName },
    participantPhotos: { [myUid]: myPhoto || "", [otherUid]: otherPhoto || "" },
    unreadCount: { [myUid]: 0, [otherUid]: 0 },
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    messageCount: 0,
    ...(orderId ? { orderId, quoteId: quoteId || "", quoteStatus: "pending" } : {}),
    roomType: type || (orderId ? "quote" : "general"),
  });
  return docRef.id;
}

/**
 * 시스템 메시지 전송 (견적 등 — unreadCount 증가하지 않음)
 */
export async function sendSystemMessage(roomId, { text, type = "system", quoteId = "", quoteData = {} }) {
  await addDoc(collection(db, "chatRooms", roomId, "messages"), {
    text,
    senderId: "system",
    senderName: "시스템",
    type,
    quoteId,
    quoteData,
    createdAt: serverTimestamp(),
  });
  // lastMessage만 업데이트 (unreadCount 증가 안 함)
  await updateDoc(doc(db, "chatRooms", roomId), {
    lastMessage: text.split("\n")[0],
    lastMessageAt: serverTimestamp(),
  });
}

/**
 * 견적 수락/거절 처리
 */
export async function updateQuoteStatus(roomId, quoteId, status, orderId) {
  // chatRoom 상태 업데이트
  await updateDoc(doc(db, "chatRooms", roomId), { quoteStatus: status });

  // quote 문서 상태 업데이트
  if (orderId && quoteId) {
    try {
      await updateDoc(doc(db, "homepro_orders", orderId, "quotes", quoteId), { status });
    } catch (e) {
      console.warn("quote 상태 업데이트 실패:", e.message);
    }
  }

  // 오더 상태 업데이트 (수락 시 → 매칭)
  if (status === "accepted" && orderId) {
    try {
      await updateDoc(doc(db, "homepro_orders", orderId), { orderStatus: "결제" });
    } catch (e) {
      console.warn("오더 상태 업데이트 실패:", e.message);
    }
  }
}

/**
 * 채팅방 목록 실시간 구독
 */
export function subscribeChatRooms(uid, callback) {
  const q = query(roomsRef, where("participants", "array-contains", uid), orderBy("lastMessageAt", "desc"));
  return onSnapshot(q, (snap) => {
    const rooms = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(rooms);
  });
}

/**
 * 채팅방 정보 실시간 구독
 */
export function subscribeChatRoom(roomId, callback) {
  return onSnapshot(doc(db, "chatRooms", roomId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

/**
 * 채팅방 나가기
 */
export async function leaveChatRoom(roomId, uid) {
  const roomRef = doc(db, "chatRooms", roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const remaining = (data.participants || []).filter((u) => u !== uid);

  if (remaining.length === 0) {
    // 마지막 사람 → 메시지 + 방 삭제
    const msgsSnap = await getDocs(collection(db, "chatRooms", roomId, "messages"));
    for (const m of msgsSnap.docs) await deleteDoc(m.ref);
    await deleteDoc(roomRef);
  } else {
    const names = { ...data.participantNames };
    delete names[uid];
    const photos = { ...data.participantPhotos };
    delete photos[uid];
    await updateDoc(roomRef, {
      participants: arrayRemove(uid),
      participantNames: names,
      participantPhotos: photos,
      [`unreadCount.${uid}`]: 0,
    });
  }
}

// ════════════════════════════════════════
// 메시지
// ════════════════════════════════════════

const messagesRef = (roomId) => collection(db, "chatRooms", roomId, "messages");

/**
 * 메시지 실시간 구독
 */
export function subscribeMessages(roomId, callback) {
  const q = query(messagesRef(roomId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(msgs);
  });
}

/**
 * 내부: lastMessage 업데이트 + 상대방 unreadCount +1 + messageCount +1
 */
async function updateRoomAfterSend(roomId, senderId, lastMessage) {
  const roomRef = doc(db, "chatRooms", roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const updates = {
    lastMessage,
    lastMessageAt: serverTimestamp(),
    messageCount: (data.messageCount || 0) + 1,
  };
  (data.participants || []).forEach((uid) => {
    if (uid !== senderId) {
      updates[`unreadCount.${uid}`] = (data.unreadCount?.[uid] || 0) + 1;
    }
  });
  await updateDoc(roomRef, updates);
}

/**
 * 텍스트 메시지 전송
 */
export async function sendTextMessage(roomId, text, senderId, senderName) {
  const trimmed = text.trim();
  if (!trimmed) return;
  await addDoc(messagesRef(roomId), {
    text: trimmed,
    senderId,
    senderName,
    createdAt: serverTimestamp(),
    readBy: [senderId],
  });
  await updateRoomAfterSend(roomId, senderId, trimmed);
}

/**
 * 파일/이미지 메시지 전송
 */
export async function sendFileMessage(roomId, file, senderId, senderName) {
  const isImage = file.type.startsWith("image/");
  let uploadFile = file;

  if (isImage) {
    uploadFile = await compressDetailImage(file, 400, 0.3);
  }

  const path = `chat/${roomId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, uploadFile);
  const fileUrl = await getDownloadURL(storageRef);

  await addDoc(messagesRef(roomId), {
    senderId,
    senderName,
    createdAt: serverTimestamp(),
    type: isImage ? "image" : "file",
    fileUrl,
    fileName: file.name,
    fileSize: file.size,
    text: "",
    readBy: [senderId],
  });

  const lastMsg = isImage ? "사진" : file.name;
  await updateRoomAfterSend(roomId, senderId, lastMsg);
}

/**
 * 일정 공유 메시지 전송
 */
export async function sendScheduleMessage(roomId, schedule, senderId, senderName) {
  await addDoc(messagesRef(roomId), {
    senderId,
    senderName,
    createdAt: serverTimestamp(),
    type: "schedule",
    schedule,
    readBy: [senderId],
  });
  await updateRoomAfterSend(roomId, senderId, `일정: ${schedule.title || ""}`);
}

/** 여러 일정을 하나의 메시지로 공유 */
export async function sendSchedulesMessage(roomId, schedules, senderId, senderName) {
  await addDoc(messagesRef(roomId), {
    senderId,
    senderName,
    createdAt: serverTimestamp(),
    type: "schedules",
    schedules,
    readBy: [senderId],
  });
  await updateRoomAfterSend(roomId, senderId, `일정 ${schedules.length}건 공유`);
}

/**
 * 메시지 삭제 (soft delete)
 */
export async function deleteMessage(roomId, messageId) {
  await updateDoc(doc(db, "chatRooms", roomId, "messages", messageId), {
    deleted: true,
  });
}

/**
 * 메시지 수정
 */
export async function editMessage(roomId, messageId, newText) {
  await updateDoc(doc(db, "chatRooms", roomId, "messages", messageId), {
    text: newText,
    editedAt: serverTimestamp(),
  });
}

// ════════════════════════════════════════
// 읽음 처리
// ════════════════════════════════════════

export async function clearUnread(roomId, uid) {
  const roomRef = doc(db, "chatRooms", roomId);
  const snap = await getDoc(roomRef);
  if (snap.exists() && (snap.data().unreadCount?.[uid] || 0) > 0) {
    await updateDoc(roomRef, { [`unreadCount.${uid}`]: 0 });
  }
  // 안 읽은 메시지들에 readBy 추가
  markMessagesAsRead(roomId, uid);
}

/** 메시지별 readBy에 uid 추가 */
export async function markMessagesAsRead(roomId, uid) {
  const q = query(messagesRef(roomId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const batch = [];
  for (const d of snap.docs) {
    const data = d.data();
    if (data.readBy && !data.readBy.includes(uid)) {
      batch.push(updateDoc(d.ref, { readBy: arrayUnion(uid) }));
    } else if (!data.readBy) {
      batch.push(updateDoc(d.ref, { readBy: arrayUnion(data.senderId || uid, uid) }));
    }
    if (batch.length >= 20) break; // 최근 20개만
  }
  await Promise.all(batch);
}

// ════════════════════════════════════════
// 메모
// ════════════════════════════════════════

export async function updateMemo(roomId, memo, uid) {
  await updateDoc(doc(db, "chatRooms", roomId), {
    memo: memo.trim(),
    memoUpdatedAt: serverTimestamp(),
    memoUpdatedBy: uid,
  });
}

export async function deleteMemo(roomId, uid) {
  await updateDoc(doc(db, "chatRooms", roomId), {
    memo: "",
    memoUpdatedAt: serverTimestamp(),
    memoUpdatedBy: uid,
  });
}

// ════════════════════════════════════════
// 타이핑 표시
// ════════════════════════════════════════

export async function setTyping(roomId, uid) {
  await updateDoc(doc(db, "chatRooms", roomId), {
    [`typing.${uid}`]: serverTimestamp(),
  });
}

export async function clearTyping(roomId, uid) {
  await updateDoc(doc(db, "chatRooms", roomId), {
    [`typing.${uid}`]: null,
  });
}

/** 결제 처리 */
export async function processPayment(roomId, orderId, amount) {
  await updateDoc(doc(db, "chatRooms", roomId), {
    paymentStatus: "paid",
    paidAmount: amount,
    paidAt: serverTimestamp(),
  });
  if (orderId) {
    const { COLLECTIONS } = await import("../config/homeproConfig");
    await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), { orderStatus: "결제" });
  }
  await sendSystemMessage(roomId, { text: `결제가 완료되었습니다.\n금액: ${amount.toLocaleString()}원`, type: "payment" });
}

/** 작업 완료 처리 */
export async function completeWork(roomId, orderId) {
  await updateDoc(doc(db, "chatRooms", roomId), {
    workStatus: "completed",
    completedAt: serverTimestamp(),
  });
  if (orderId) {
    const { COLLECTIONS } = await import("../config/homeproConfig");
    await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), { orderStatus: "완료" });
  }
  await sendSystemMessage(roomId, { text: "작업이 완료되었습니다.\n리뷰를 남겨주세요!", type: "work_complete" });
}

/** 리뷰 등록 */
export async function submitReview(roomId, reviewData) {
  const { addDoc, collection, increment } = await import("firebase/firestore");
  const reviewRef = await addDoc(collection(db, "homepro_reviews"), {
    ...reviewData,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "chatRooms", roomId), { reviewId: reviewRef.id });
  // 오더 상태 → 리뷰
  if (reviewData.orderId) {
    try {
      const { COLLECTIONS } = await import("../config/homeproConfig");
      await updateDoc(doc(db, COLLECTIONS.ORDERS, reviewData.orderId), { orderStatus: "리뷰" });
    } catch (e) {}
  }
  // 프로 평점 업데이트
  await updateDoc(doc(db, "users", reviewData.proUid), {
    reviewCount: increment(1),
    ratingSum: increment(reviewData.rating),
  });
  await sendSystemMessage(roomId, { text: "리뷰가 등록되었습니다. 감사합니다!", type: "review" });
  return reviewRef.id;
}

/** 요청 취소 처리 (의뢰자 전용) */
export async function cancelOrder(roomId, orderId) {
  await updateDoc(doc(db, "chatRooms", roomId), {
    quoteStatus: "cancelled",
    cancelledAt: serverTimestamp(),
  });
  if (orderId) {
    const { COLLECTIONS } = await import("../config/homeproConfig");
    await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), { orderStatus: "취소" });
  }
  await sendSystemMessage(roomId, { text: "요청이 취소되었습니다.", type: "cancelled" });
}
