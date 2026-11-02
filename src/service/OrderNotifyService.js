/* eslint-disable */
/**
 * 오더 사건 알림 — 푸시(notifications 문서) + 그 오더 채팅방 시스템 메시지를 한 번에 (대표 리뷰 11/02)
 *
 *  "배차(배정) 및 견적서 전송 · 작업시작 · 소개비 송금 · 입금 등 해당 오더에 대한 알림을 푸시 및 채팅 창을 통해"
 *  "오더가 취소처리 되면 채팅 안내 푸시메세지 전달"
 *
 *  - 푸시: notifications 문서 1개 → 서버 onNotificationSend 가 FCM 발송. 바꾼 본인(actorUid)은 받는 사람에서 뺀다.
 *  - 채팅: 그 오더의 채팅방 중 받는 사람과 바꾼 사람이 같이 있는 방에 시스템 메시지.
 *          (시스템 메시지는 서버 onChatMessageCreated 가 푸시하지 않으므로 같은 일로 두 번 울리지 않는다)
 *          방이 없으면 접수자 ↔ 배정 홈프로 방을 만들어 거기에 남긴다.
 *  - 알림이 실패해도 본 동작(상태 변경 · 체크인 등)을 막지 않는다 — 전부 try/catch.
 */
import { collection, addDoc, doc, getDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../api/config";
import { createChatRoom, sendSystemMessage } from "./ChatService";

const uniq = (arr) => [...new Set((arr || []).filter(Boolean))];

/** 회원 이름 · 사진 (users 문서) */
export async function getUserBrief(uid) {
  if (!uid) return { name: "", photo: "" };
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const u = snap.exists() ? snap.data() || {} : {};
    return {
      name: u.nickname || u.companyName || u.name || "",
      photo: u.profileImage || u.photoURL || "",
    };
  } catch (e) {
    return { name: "", photo: "" };
  }
}

/** 접수자 ↔ 배정 홈프로 방 (없으면 만든다). 둘 중 하나라도 없으면 null */
async function ensurePairRoom(order) {
  const a = order?.createdBy;
  const b = order?.matchedProUid;
  if (!a || !b || a === b) return null;
  const [ua, ub] = await Promise.all([getUserBrief(a), getUserBrief(b)]);
  return createChatRoom(
    a, ua.name || order.writer || "접수자", ua.photo,
    b, ub.name || "홈프로", ub.photo,
    { orderId: order.id },
  );
}

/**
 * @param {object} order  오더 문서({ id, createdBy, matchedProUid, ... })
 * @param {object} opts
 *   toUids    받을 사람들 (actorUid 는 자동으로 빠진다)
 *   title, body, type   푸시 문구 · 종류
 *   chatText, chatType  채팅 시스템 메시지 (없으면 채팅은 건너뛴다)
 *   actorUid  이 일을 일으킨 사람 (없으면 지금 로그인한 사람)
 */
export async function notifyOrderEvent(order, {
  toUids = [], title = "", body = "", type = "order", chatText = "", chatType = "system",
  actorUid, actorName, actorPhoto, // actorName · actorPhoto 는 방을 새로 만들 때를 위해 받아 둔다(지금은 users 문서 값을 쓴다)
} = {}) {
  if (!order?.id) return;
  const actor = actorUid || auth?.currentUser?.uid || "";
  const targets = uniq(toUids).filter((u) => u !== actor);

  // 1) 푸시
  if (targets.length && (title || body)) {
    try {
      await addDoc(collection(db, "notifications"), {
        targetUids: targets, title, body, type,
        data: { orderId: order.id },
        read: false, sent: false, createdAt: serverTimestamp(),
      });
    } catch (e) { console.warn("[notifyOrderEvent] 푸시 문서 실패:", e?.message); }
  }

  // 2) 채팅 시스템 메시지
  if (!chatText) return;
  try {
    const want = uniq(toUids);
    const snap = await getDocs(query(collection(db, "chatRooms"), where("orderId", "==", order.id)));
    const rooms = snap.docs.map((d) => ({ id: d.id, participants: d.data().participants || [] }));
    const hasTarget = (r) => want.some((u) => r.participants.includes(u));
    const isPair = (r) => order.createdBy && order.matchedProUid
      && r.participants.includes(order.createdBy) && r.participants.includes(order.matchedProUid);
    // 받는 사람 + 바꾼 사람이 같이 있는 방 → 없으면 접수자 ↔ 배정 홈프로 방
    let list = rooms.filter((r) => hasTarget(r) && (!actor || r.participants.includes(actor)));
    if (!list.length) list = rooms.filter((r) => hasTarget(r) && isPair(r));
    if (!list.length) {
      const pairInvolved = want.includes(order.createdBy) || want.includes(order.matchedProUid);
      if (pairInvolved) {
        const roomId = await ensurePairRoom(order);
        if (roomId) list = [{ id: roomId, participants: [order.createdBy, order.matchedProUid] }];
      }
    }
    for (const r of list) {
      try { await sendSystemMessage(r.id, { text: chatText, type: chatType || "system" }); } catch (_) {}
    }
  } catch (e) { console.warn("[notifyOrderEvent] 채팅 안내 실패:", e?.message); }
}
