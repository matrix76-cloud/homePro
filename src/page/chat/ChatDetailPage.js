/* eslint-disable */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import {
  IoChevronBack, IoSend, IoAdd, IoDocumentOutline, IoDownloadOutline,
  IoCloseOutline, IoCalendarOutline, IoLocationOutline,
  IoTimeOutline, IoExitOutline, IoEllipsisHorizontal, IoSearchOutline,
  IoPencilOutline, IoTrashOutline, IoCloseCircle, IoStar, IoStarOutline,
  IoReceiptOutline,
} from "react-icons/io5";
import { THEME, CATEGORIES } from "../../config/homeproConfig";
import { db } from "../../api/config";
import { collection, doc, getDoc, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { GradeBadge, GradeProgressBar } from "../../utility/gradeUtils";
import { IoPersonCircleOutline } from "react-icons/io5";
import { format, isToday, isYesterday } from "date-fns";
import {
  subscribeChatRoom, subscribeMessages, clearUnread, leaveChatRoom,
  sendTextMessage, sendFileMessage, sendScheduleMessage, sendSchedulesMessage,
  deleteMessage, editMessage, setTyping, clearTyping, updateQuoteStatus,
  processPayment, completeWork, submitReview, cancelOrder, sendSystemMessage,
} from "../../service/ChatService";
import { updateOrderStatus } from "../../service/OrderService";

const formatMsgTime = (timestamp) => {
  if (!timestamp) return "";
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return format(d, "a h:mm").replace("AM", "오전").replace("PM", "오후");
};

const formatDateDivider = (timestamp) => {
  if (!timestamp) return "";
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isToday(d)) return "오늘";
  if (isYesterday(d)) return "어제";
  return format(d, "yyyy년 M월 d일");
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

const ChatDetailPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const myUid = userData?.uid;
  const myName = userData?.companyName || userData?.name || "";

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  /* ─── 인라인 일정 생성 (기간 선택, 여러 건) ─── */
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [schedStartDate, setSchedStartDate] = useState(null);
  const [schedEndDate, setSchedEndDate] = useState(null);
  const [schedSelectStep, setSchedSelectStep] = useState("start");
  const [schedTitle, setSchedTitle] = useState("");
  const [schedStartHour, setSchedStartHour] = useState(9);
  const [schedEndHour, setSchedEndHour] = useState(10);
  const [schedList, setSchedList] = useState([]); // 추가된 일정 목록

  // 수정/삭제
  const [menuMsgId, setMenuMsgId] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState("");

  // 검색
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 타이핑
  const typingTimer = useRef(null);

  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  const longPressTimer = useRef(null);
  const searchResultRefs = useRef({});

  // 채팅방 정보
  useEffect(() => {
    if (!roomId) return;
    return subscribeChatRoom(roomId, setRoom);
  }, [roomId]);

  // 입장 시 unread 초기화
  useEffect(() => {
    if (roomId && myUid) clearUnread(roomId, myUid);
  }, [roomId, myUid]);

  // 메시지 실시간 수신
  useEffect(() => {
    if (!roomId) return;
    return subscribeMessages(roomId, setMessages);
  }, [roomId]);

  // 메시지 추가 시 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 더보기 메뉴
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleBlockUser = async () => {
    setShowMoreMenu(false);
    const reason = window.prompt("거부 사유를 입력해주세요 (선택)");
    if (reason === null) return; // 취소
    try {
      const { blockUser } = await import("../../service/BlockService");
      await blockUser(myUid, otherUid, reason || "");
      alert("거부 등록되었습니다");
    } catch (e) {
      alert(e.message || "거부 등록 실패");
    }
  };

  // 타이핑 표시 — 상대방
  const otherTyping = (() => {
    if (!room?.typing || !myUid) return false;
    const entries = Object.entries(room.typing);
    for (const [uid, ts] of entries) {
      if (uid === myUid || !ts) continue;
      const t = ts.toDate ? ts.toDate() : new Date(ts);
      if (Date.now() - t.getTime() < 3000) return true;
    }
    return false;
  })();

  // 타이핑 표시 — 입력 시
  const handleTextChange = (e) => {
    setText(e.target.value);
    if (!roomId || !myUid) return;
    setTyping(roomId, myUid);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => clearTyping(roomId, myUid), 2000);
  };

  // 메시지 전송
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !myUid) return;
    setSending(true);
    setText("");
    clearTyping(roomId, myUid);
    try {
      await sendTextMessage(roomId, trimmed, myUid, myName);
    } catch (err) {
      console.error("메시지 전송 실패:", err);
    } finally {
      setSending(false);
    }
  };

  // 파일 전송
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || uploading || !myUid) return;
    e.target.value = "";
    setUploading(true);
    try {
      await sendFileMessage(roomId, file, myUid, myName);
    } catch (err) {
      console.error("파일 전송 실패:", err);
    } finally {
      setUploading(false);
    }
  };

  // 일정 공유
  const openScheduleModal = async () => {
    if (!myUid) return;
    setShowScheduleModal(true);
    const now = new Date();
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setSchedStartDate(null);
    setSchedEndDate(null);
    setSchedSelectStep("start");
    setSchedTitle("");
    setSchedStartHour(9);
    setSchedEndHour(10);
    setSchedList([]);
  };

  // 기간 선택
  const handleSchedDateClick = (day) => {
    if (!day) return;
    const key = `${calYear}-${pad2(calMonth + 1)}-${pad2(day)}`;
    if (schedSelectStep === "start") {
      setSchedStartDate(key);
      setSchedEndDate(key);
      setSchedSelectStep("end");
    } else {
      if (key < schedStartDate) { setSchedStartDate(key); }
      else { setSchedEndDate(key); }
      setSchedSelectStep("start");
    }
  };

  const isSchedInRange = (day) => {
    if (!day || !schedStartDate) return false;
    const key = `${calYear}-${pad2(calMonth + 1)}-${pad2(day)}`;
    return key >= schedStartDate && key <= (schedEndDate || schedStartDate);
  };
  const isSchedStart = (day) => day && schedStartDate && `${calYear}-${pad2(calMonth + 1)}-${pad2(day)}` === schedStartDate;
  const isSchedEnd = (day) => day && schedEndDate && `${calYear}-${pad2(calMonth + 1)}-${pad2(day)}` === schedEndDate;
  const isSchedSameDay = schedStartDate && schedStartDate === schedEndDate;

  /* 미니 캘린더 날짜 배열 */
  const calendarDays = (() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const lastDate = new Date(calYear, calMonth + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= lastDate; d++) days.push(d);
    return days;
  })();

  const pad2 = (n) => String(n).padStart(2, "0");
  const hourLabel = (h) => {
    const period = h < 12 ? "오전" : "오후";
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${period} ${display}시`;
  };

  const schedFormatRange = () => {
    if (!schedStartDate) return "";
    const [, sm, sd] = schedStartDate.split("-");
    const sDt = new Date(schedStartDate);
    const sDay = ["일","월","화","수","목","금","토"][sDt.getDay()];
    if (isSchedSameDay) return `${Number(sm)}/${Number(sd)} (${sDay})`;
    const [, em, ed] = schedEndDate.split("-");
    const eDt = new Date(schedEndDate);
    const eDay = ["일","월","화","수","목","금","토"][eDt.getDay()];
    return `${Number(sm)}/${Number(sd)} (${sDay}) ~ ${Number(em)}/${Number(ed)} (${eDay})`;
  };

  const getDatesInRange = (start, end) => {
    const dates = [];
    const cur = new Date(start);
    const e = new Date(end);
    while (cur <= e) {
      dates.push(`${cur.getFullYear()}-${pad2(cur.getMonth() + 1)}-${pad2(cur.getDate())}`);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  // 현재 입력을 리스트에 추가
  const handleAddToList = () => {
    if (!schedTitle.trim() || !schedStartDate) return;
    setSchedList((prev) => [...prev, {
      title: schedTitle.trim(),
      startDate: schedStartDate,
      endDate: schedEndDate,
      startHour: schedStartHour,
      endHour: schedEndHour,
    }]);
    // 입력 초기화
    setSchedTitle("");
    setSchedStartDate(null);
    setSchedEndDate(null);
    setSchedSelectStep("start");
    setSchedStartHour(9);
    setSchedEndHour(10);
  };

  const removeFromList = (idx) => {
    setSchedList((prev) => prev.filter((_, i) => i !== idx));
  };

  // 전체 공유
  const allSchedItems = [...schedList, ...(schedTitle.trim() && schedStartDate ? [{
    title: schedTitle.trim(), startDate: schedStartDate, endDate: schedEndDate,
    startHour: schedStartHour, endHour: schedEndHour,
  }] : [])];

  const handleCreateAndShare = async () => {
    if (allSchedItems.length === 0 || sending) return;
    setSending(true);
    try {
      const { addDoc: add, collection: col, serverTimestamp: ts } = await import("firebase/firestore");
      const chatSchedules = [];

      for (const item of allSchedItems) {
        const timeStr = `${hourLabel(item.startHour)} ~ ${hourLabel(item.endHour)}`;
        const isSingle = item.startDate === item.endDate;
        const groupId = isSingle ? null : `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const dates = getDatesInRange(item.startDate, item.endDate);

        for (const dateStr of dates) {
          await add(col(db, "homepro_schedules"), {
            uid: myUid,
            title: item.title,
            date: dateStr,
            startHour: item.startHour,
            endHour: item.endHour,
            ...(groupId && { groupId }),
            source: "chat",
            roomId,
            createdAt: ts(),
          });
        }
        chatSchedules.push({
          title: item.title,
          date: isSingle ? item.startDate : `${item.startDate} ~ ${item.endDate}`,
          time: timeStr,
        });
      }

      // 채팅에 공유
      if (chatSchedules.length === 1) {
        await sendScheduleMessage(roomId, chatSchedules[0], myUid, myName);
      } else {
        await sendSchedulesMessage(roomId, chatSchedules, myUid, myName);
      }

      setShowScheduleModal(false);
    } catch (err) {
      console.error("일정 생성/공유 실패:", err);
    } finally {
      setSending(false);
    }
  };

  // 채팅방 나가기
  const handleLeaveRoom = async () => {
    if (!window.confirm("채팅방을 나가시겠습니까?\n대화 내용은 삭제됩니다.")) return;
    try {
      await leaveChatRoom(roomId, myUid);
      navigate("/MobileChat");
    } catch (err) {
      console.error("채팅방 나가기 실패:", err);
    }
  };

  // 메시지 수정/삭제
  const handleLongPress = (msgId) => {
    longPressTimer.current = setTimeout(() => setMenuMsgId(msgId), 400);
  };
  const handleTouchEnd = () => clearTimeout(longPressTimer.current);

  const handleDelete = async (msgId) => {
    if (!window.confirm("메시지를 삭제하시겠습니까?")) return;
    setMenuMsgId(null);
    await deleteMessage(roomId, msgId);
  };

  const handleStartEdit = (msg) => {
    setMenuMsgId(null);
    setEditingMsgId(msg.id);
    setEditText(msg.text || "");
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || !editingMsgId) return;
    await editMessage(roomId, editingMsgId, editText.trim());
    setEditingMsgId(null);
    setEditText("");
  };

  const handleCancelEdit = () => {
    setEditingMsgId(null);
    setEditText("");
  };

  // 검색
  const searchResults = searchQuery.trim()
    ? messages.filter((m) => m.text && m.text.toLowerCase().includes(searchQuery.toLowerCase()) && !m.deleted)
    : [];

  const scrollToMessage = (msgId) => {
    const el = searchResultRefs.current[msgId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // 프로 프로필 (견적 카드용)
  const [proProfile, setProProfile] = useState(null);
  const [proCategories, setProCategories] = useState([]);
  const [showProSheet, setShowProSheet] = useState(false);
  const [expandedCats, setExpandedCats] = useState({});

  useEffect(() => {
    const quoteMsg = messages.find((m) => m.type === "quote" && m.senderId === "system");
    const proUid = quoteMsg?.quoteData?.proUid;
    if (!proUid || proProfile) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", proUid));
        if (snap.exists()) setProProfile({ uid: proUid, ...snap.data() });
        const prosSnap = await getDocs(query(collection(db, "homepro_pros"), where("uid", "==", proUid), where("status", "==", "approved")));
        setProCategories(prosSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {}
    })();
  }, [messages]);

  // 오더 정보 로드
  const [orderData, setOrderData] = useState(null);
  useEffect(() => {
    if (!room?.orderId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "homepro_orders", room.orderId));
        if (snap.exists()) setOrderData({ id: snap.id, ...snap.data() });
      } catch (e) { console.warn("오더 조회 실패:", e); }
    })();
  }, [room?.orderId]);

  // 오더 상태 관련
  const normalizeOrderStatus = (s) => {
    if (s === "요청" || s === "접수") return "접수";
    if (s === "진행" || s === "결제") return "배정";
    if (s === "업체선택대기" || s === "업체선택" || s === "선정대기") return "선정대기";
    if (s === "리뷰" || s === "정산") return "완료";
    return s;
  };
  const orderDisplayStatus = orderData ? normalizeOrderStatus(orderData.orderStatus) : null;
  const isOrderCreator = orderData?.createdBy === myUid;
  const isMatchedPro = orderData?.matchedProUid === myUid;

  const handleOrderStatusChange = async (newStatus, cancelReason) => {
    try {
      // 대기 전환 시 특별 처리
      if (newStatus === "대기") {
        try {
          const { setOrderWaiting } = await import("../../service/OrderService");
          await setOrderWaiting(orderData.id);
        } catch {
          await updateOrderStatus(room.orderId, "대기");
        }
      } else {
        const extra = cancelReason ? { cancelReason } : {};
        await updateOrderStatus(room.orderId, newStatus, extra);
      }
      setOrderData((prev) => prev ? { ...prev, orderStatus: newStatus } : prev);
      const statusLabel = normalizeOrderStatus(newStatus);
      await sendSystemMessage(roomId, { text: `상태가 "${statusLabel}"(으)로 변경되었습니다.`, type: "system" });
      // 상대방에게 푸시 알림
      try {
        const { addDoc, collection: col, serverTimestamp: ts } = await import("firebase/firestore");
        const other = (room?.participants || []).find((u) => u !== myUid);
        if (other) {
          await addDoc(col(db, "notifications"), {
            targetUids: [other], title: "상태 변경", body: `오더 상태가 "${statusLabel}"(으)로 변경되었습니다`,
            type: "order_status_changed", data: { orderId: room.orderId }, read: false, sent: false, createdAt: ts(),
          });
        }
      } catch {}
      showToast(`${statusLabel} 처리되었습니다`);
    } catch (e) {
      showToast("상태 변경에 실패했습니다");
    }
  };

  // 견적 연동 채팅방: 메시지 입력 잠금 여부
  const isQuoteRoom = !!room?.orderId;
  const quoteStatus = room?.quoteStatus || "";
  const isQuoteLocked = isQuoteRoom && (quoteStatus === "pending" || quoteStatus === "rejected" || quoteStatus === "cancelled");
  const isOrderOwner = orderData
    ? orderData.createdBy === myUid
    : room?.orderId && room?.participants
      ? (() => {
          const quoteMsg = messages.find((m) => m.type === "quote" && m.senderId === "system");
          if (quoteMsg?.quoteData?.proUid) return myUid !== quoteMsg.quoteData.proUid;
          return false;
        })()
      : false;

  const handleAcceptQuote = async () => {
    if (!room?.orderId) return;
    await updateQuoteStatus(roomId, room.quoteId || "", "accepted", room.orderId);
    // 시스템 메시지 추가
    try {
      const { sendSystemMessage } = await import("../../service/ChatService");
      await sendSystemMessage(roomId, { text: "견적이 수락되었습니다. 대화를 시작하세요!", type: "system" });
    } catch (e) {}
    // 푸시 알림
    try {
      const { addDoc, collection: col, serverTimestamp: ts } = await import("firebase/firestore");
      const otherUid = (room.participants || []).find((uid) => uid !== myUid);
      if (otherUid) {
        await addDoc(col(db, "notifications"), {
          targetUids: [otherUid], title: "견적 수락", body: "견적이 수락되었습니다! 대화를 시작하세요",
          type: "quote_accepted", data: { orderId: room.orderId }, read: false, sent: false, createdAt: ts(),
        });
      }
    } catch (e) {}
  };

  const handleRejectQuote = async () => {
    if (!room?.orderId) return;
    await updateQuoteStatus(roomId, room.quoteId || "", "rejected", room.orderId);
    // 시스템 메시지 추가
    try {
      const { sendSystemMessage } = await import("../../service/ChatService");
      await sendSystemMessage(roomId, { text: "견적이 거절되었습니다.", type: "system" });
    } catch (e) {}
    // 푸시 알림
    try {
      const { addDoc, collection: col, serverTimestamp: ts } = await import("firebase/firestore");
      const otherUid = (room.participants || []).find((uid) => uid !== myUid);
      if (otherUid) {
        await addDoc(col(db, "notifications"), {
          targetUids: [otherUid], title: "견적 거절", body: "견적이 거절되었습니다",
          type: "quote_rejected", data: { orderId: room.orderId }, read: false, sent: false, createdAt: ts(),
        });
      }
    } catch (e) {}
  };

  // ── 결제 / 작업완료 / 리뷰 상태 ──
  const paymentStatus = room?.paymentStatus || "unpaid";
  const workStatus = room?.workStatus || "";
  const hasReview = !!room?.reviewId;
  const quoteAmount = (() => {
    const qm = messages.find((m) => m.type === "quote" && m.senderId === "system");
    return qm?.quoteData?.price || room?.paidAmount || 0;
  })();
  const otherUid = (room?.participants || []).find((u) => u !== myUid);

  const [showPaySheet, setShowPaySheet] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [showReviewSheet, setShowReviewSheet] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSending, setReviewSending] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2000); };
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleOpenPay = () => {
    setPayAmount(String(quoteAmount || ""));
    setShowPaySheet(true);
  };

  const handlePay = async () => {
    if (paying) return;
    const amount = Number(payAmount) || 0;
    setPaying(true);
    try {
      await processPayment(roomId, room?.orderId, amount);
      // 프로에게 푸시
      try {
        const { addDoc, collection: col, serverTimestamp: ts } = await import("firebase/firestore");
        if (otherUid) {
          await addDoc(col(db, "notifications"), {
            targetUids: [otherUid], title: "결제 완료", body: "결제가 완료되었습니다. 작업을 진행해주세요",
            type: "payment", data: { orderId: room?.orderId }, read: false, sent: false, createdAt: ts(),
          });
        }
      } catch {}
      setShowPaySheet(false);
      showToast("결제가 완료되었습니다");
    } catch (e) {
      showToast("결제 처리에 실패했습니다");
    } finally { setPaying(false); }
  };

  const handleCompleteWork = async () => {
    if (!window.confirm("작업이 완료되었나요? 완료 처리하면 되돌릴 수 없습니다.")) return;
    try {
      await completeWork(roomId, room?.orderId);
      try {
        const { addDoc, collection: col, serverTimestamp: ts } = await import("firebase/firestore");
        if (otherUid) {
          await addDoc(col(db, "notifications"), {
            targetUids: [otherUid], title: "작업 완료", body: "작업 완료가 확인되었습니다",
            type: "work_complete", data: { orderId: room?.orderId }, read: false, sent: false, createdAt: ts(),
          });
        }
      } catch {}
      showToast("작업 완료 처리되었습니다");
    } catch (e) {
      showToast("처리에 실패했습니다");
    }
  };

  const handleOpenReview = () => {
    setReviewRating(5);
    setReviewText("");
    setShowReviewSheet(true);
  };

  const handleSubmitReview = async () => {
    if (reviewSending) return;
    setReviewSending(true);
    try {
      const proUid = otherUid;
      const proName = room?.participantNames?.[proUid] || "전문가";
      await submitReview(roomId, {
        orderId: room?.orderId || "",
        roomId,
        writerUid: myUid,
        writerName: userData?.nickname || userData?.name || "",
        proUid,
        proName,
        rating: reviewRating,
        text: reviewText.trim(),
      });
      // 포인트 지급
      try {
        const { grantPoints } = await import("../../service/PointService");
        await grantPoints(myUid, userData?.nickname || "", "review", { relatedDocId: roomId });
      } catch {}
      // 프로에게 푸시
      try {
        const { addDoc, collection: col, serverTimestamp: ts } = await import("firebase/firestore");
        if (proUid) {
          await addDoc(col(db, "notifications"), {
            targetUids: [proUid], title: "리뷰 등록", body: "리뷰가 등록되었습니다",
            type: "review", data: { orderId: room?.orderId }, read: false, sent: false, createdAt: ts(),
          });
        }
      } catch {}
      setShowReviewSheet(false);
      showToast("리뷰가 등록되었습니다");
    } catch (e) {
      showToast("리뷰 등록에 실패했습니다");
    } finally { setReviewSending(false); }
  };

  // 요청 취소 (의뢰자 전용)
  const isCancelled = quoteStatus === "cancelled";
  const handleCancelOrder = async () => {
    if (!window.confirm("요청을 취소하시겠습니까?\n취소 후에는 되돌릴 수 없습니다.")) return;
    try {
      await cancelOrder(roomId, room?.orderId);
      try {
        const { addDoc, collection: col, serverTimestamp: ts } = await import("firebase/firestore");
        if (otherUid) {
          await addDoc(col(db, "notifications"), {
            targetUids: [otherUid], title: "요청 취소", body: "의뢰자가 요청을 취소했습니다",
            type: "order_cancelled", data: { orderId: room?.orderId }, read: false, sent: false, createdAt: ts(),
          });
        }
      } catch {}
      showToast("요청이 취소되었습니다");
    } catch (e) {
      showToast("취소 처리에 실패했습니다");
    }
  };

  const roomName = (() => {
    if (!room) return "";
    if (room.roomName) return room.roomName;
    const names = room.participantNames || {};
    const otherUid = (room.participants || []).find((uid) => uid !== myUid);
    return names[otherUid] || "채팅";
  })();

  const getOtherPhoto = () => {
    if (!room) return null;
    const otherUid = (room.participants || []).find((uid) => uid !== myUid);
    return room.participantPhotos?.[otherUid] || null;
  };

  const getDateKey = (msg) => {
    if (!msg.createdAt) return "";
    const d = msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
    return format(d, "yyyy-MM-dd");
  };

  const highlightText = (text, query) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <HighlightSpan key={i}>{part}</HighlightSpan> : part
    );
  };

  return (
    <Container>
      <Header>
        <BackBtn onClick={() => {
          if (window.history.length > 1) navigate(-1);
          else navigate("/MobileMain", { state: { resetTab: Date.now(), initialTab: "my_orders" } });
        }}><IoChevronBack size={22} /></BackBtn>
        <HeaderTitle>{roomName}</HeaderTitle>
        <HeaderRight>
          <HeaderIconBtn onClick={() => setShowSearch(!showSearch)}><IoSearchOutline size={20} /></HeaderIconBtn>
          <HeaderIconBtn onClick={() => setShowMoreMenu(!showMoreMenu)}><IoEllipsisHorizontal size={20} /></HeaderIconBtn>
          <LeaveBtn onClick={handleLeaveRoom}><IoExitOutline size={20} /></LeaveBtn>
        </HeaderRight>
      </Header>

      {/* 오더 상세 + 상태 안내 바 — 종목 클릭 시 오더 상세로 이동 (명세 J167~174) */}
      {orderData && (
        <OrderInfoBar onClick={() => navigate(`/order/detail/${orderData.id}`, { state: { order: orderData, category: CATEGORIES.find(c => c.id === orderData.categoryId) } })}>
          {orderDisplayStatus && <OrderStatusBadge $status={orderDisplayStatus}>{orderDisplayStatus}</OrderStatusBadge>}
          <OrderInfoText>{orderData.title || "오더 상세 보기"}</OrderInfoText>
          <OrderInfoArrow>상세보기 ›</OrderInfoArrow>
        </OrderInfoBar>
      )}

      {/* 상태 변경은 채팅이 아니라 나의오더현황/오더상세에서만 (명세 J190) — 채팅은 소통 전용 */}
      {orderData && (
        <StatusNoticeBar onClick={() => navigate(`/order/detail/${orderData.id}`, { state: { order: orderData, category: CATEGORIES.find(c => c.id === orderData.categoryId) } })}>
          ℹ️ 수락·작업완료·취소 등 <b>상태 변경</b>은 나의오더현황(오더 상세)에서 처리해요 ›
        </StatusNoticeBar>
      )}

      {showSearch && (
        <SearchBar>
          <SearchInput
            placeholder="메시지 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <SearchCount>{searchResults.length}건</SearchCount>
          )}
          <SearchCloseBtn onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
            <IoCloseOutline size={20} />
          </SearchCloseBtn>
        </SearchBar>
      )}

      {showSearch && searchQuery && searchResults.length > 0 && (
        <SearchResultBar>
          {searchResults.map((m) => (
            <SearchResultItem key={m.id} onClick={() => scrollToMessage(m.id)}>
              <SearchResultName>{m.senderName}</SearchResultName>
              <SearchResultText>{m.text.substring(0, 40)}</SearchResultText>
            </SearchResultItem>
          ))}
        </SearchResultBar>
      )}

      {room?.memo && (
        <MemoBanner onClick={() => navigate(`/chat/${roomId}/memo`)}>
          <MemoBadge>게시글</MemoBadge>
          <MemoContent>{room.memo}</MemoContent>
        </MemoBanner>
      )}

      {showScheduleModal && (
        <ModalOverlay onClick={() => setShowScheduleModal(false)}>
          <ScheduleModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>일정 공유</ModalTitle>
              <ModalCloseBtn onClick={() => setShowScheduleModal(false)}>
                <IoCloseOutline size={20} />
              </ModalCloseBtn>
            </ModalHeader>

            <SchedCreateWrap>
                {/* 미니 달력 */}
                <MiniCalHeader>
                  <MiniCalNav onClick={() => {
                    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
                    else setCalMonth(calMonth - 1);
                  }}>◀</MiniCalNav>
                  <MiniCalTitle>{calYear}년 {calMonth + 1}월</MiniCalTitle>
                  <MiniCalNav onClick={() => {
                    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
                    else setCalMonth(calMonth + 1);
                  }}>▶</MiniCalNav>
                </MiniCalHeader>
                <MiniCalDayRow>
                  {["일","월","화","수","목","금","토"].map((d) => (
                    <MiniCalDayLabel key={d} $sun={d === "일"} $sat={d === "토"}>{d}</MiniCalDayLabel>
                  ))}
                </MiniCalDayRow>
                {/* 주 단위 렌더링 + 바 */}
                {(() => {
                  // 주 단위로 분할
                  const weeks = [];
                  for (let i = 0; i < calendarDays.length; i += 7) {
                    weeks.push(calendarDays.slice(i, i + 7));
                  }
                  // 바 계산 함수
                  const getBarForWeek = (week) => {
                    const weekDates = week.map((d) => d ? `${calYear}-${pad2(calMonth + 1)}-${pad2(d)}` : null);
                    const ws = weekDates.find((x) => x);
                    const we = [...weekDates].reverse().find((x) => x);
                    if (!ws || !we) return [];
                    return schedList.map((item) => {
                      if (item.startDate > we || item.endDate < ws) return null;
                      const startCol = weekDates.findIndex((x) => x && x >= item.startDate);
                      const endCol = 6 - [...weekDates].reverse().findIndex((x) => x && x <= item.endDate);
                      return { ...item, col: Math.max(0, startCol) + 1, colEnd: Math.min(7, endCol) + 2 };
                    }).filter(Boolean);
                  };
                  return weeks.map((week, wi) => {
                    const bars = getBarForWeek(week);
                    // 레인 분배 (겹치는 바 분리)
                    const barRows = [];
                    const lanes = [];
                    bars.forEach((bar) => {
                      let lane = lanes.findIndex((l) => l <= bar.col);
                      if (lane === -1) lane = lanes.length;
                      lanes[lane] = bar.colEnd;
                      if (!barRows[lane]) barRows[lane] = [];
                      barRows[lane].push(bar);
                    });
                    return (
                      <React.Fragment key={wi}>
                        <MiniCalGrid>
                          {week.map((d, i) => {
                            const inRange = isSchedInRange(d);
                            const start = isSchedStart(d);
                            const end = isSchedEnd(d);
                            const same = isSchedSameDay && start;
                            return (
                              <MiniCalCellWrap key={i}
                                $inRange={inRange} $isStart={start} $isEnd={end} $isSame={same}
                                onClick={() => handleSchedDateClick(d)}>
                                <MiniCalCell $empty={!d}
                                  $selected={start || end}
                                  $today={d === new Date().getDate() && calMonth === new Date().getMonth() && calYear === new Date().getFullYear()}>
                                  {d || ""}
                                </MiniCalCell>
                              </MiniCalCellWrap>
                            );
                          })}
                        </MiniCalGrid>
                        {barRows.map((bRow, bri) => (
                          <MiniCalBarRow key={bri}>
                            {bRow.map((bar, bi) => (
                              <MiniCalBar key={bi} $col={bar.col} $colEnd={bar.colEnd}
                                onClick={() => removeFromList(schedList.indexOf(bar))}>
                                {bar.title}
                              </MiniCalBar>
                            ))}
                          </MiniCalBarRow>
                        ))}
                      </React.Fragment>
                    );
                  });
                })()}
                <SchedHint>
                  {schedSelectStep === "end" ? "종료일을 선택하세요" : "시작일을 터치하세요"}
                </SchedHint>

                {/* 선택된 기간 + 입력 */}
                {schedStartDate && (
                  <>
                    <SchedRangeLabel>{schedFormatRange()}</SchedRangeLabel>
                    <SchedFormInput placeholder="작업 내용 (예: 욕실 타일 시공)"
                      value={schedTitle}
                      onChange={(e) => setSchedTitle(e.target.value)} />
                    {schedTitle.trim() && (
                      <SchedAddBtn onClick={handleAddToList}>+ 일정 추가하고 계속 만들기</SchedAddBtn>
                    )}
                  </>
                )}

                <SchedShareBtnModal onClick={handleCreateAndShare} disabled={allSchedItems.length === 0 || sending}>
                  {sending ? "공유 중..." : allSchedItems.length > 1 ? `${allSchedItems.length}건 일정 공유하기` : "일정 만들고 공유하기"}
                </SchedShareBtnModal>
              </SchedCreateWrap>
          </ScheduleModalContent>
        </ModalOverlay>
      )}

      {/* 메시지 메뉴 오버레이 */}
      {menuMsgId && (
        <MenuOverlay onClick={() => setMenuMsgId(null)}>
          <MsgMenu onClick={(e) => e.stopPropagation()}>
            {(() => {
              const msg = messages.find((m) => m.id === menuMsgId);
              if (!msg || msg.deleted) return null;
              const isRead = msg.readBy && msg.readBy.length > 1;
              return (
                <>
                  {msg.text && !msg.type && (
                    <MsgMenuItem onClick={() => handleStartEdit(msg)}>
                      <IoPencilOutline size={16} /> 수정
                    </MsgMenuItem>
                  )}
                  {!isRead ? (
                    <MsgMenuItem $danger onClick={() => handleDelete(menuMsgId)}>
                      <IoTrashOutline size={16} /> 삭제
                    </MsgMenuItem>
                  ) : (
                    <MsgMenuDisabled>
                      <IoTrashOutline size={16} /> 읽은 메시지는 삭제 불가
                    </MsgMenuDisabled>
                  )}
                </>
              );
            })()}
          </MsgMenu>
        </MenuOverlay>
      )}

      <MessageList ref={listRef}>
        {messages.map((msg, i) => {
          const isMine = msg.senderId === myUid;
          const isSystem = msg.senderId === "system";
          const dateKey = getDateKey(msg);
          const prevDateKey = i > 0 ? getDateKey(messages[i - 1]) : "";
          const showDate = dateKey && dateKey !== prevDateKey;
          const isEditing = editingMsgId === msg.id;
          const otherPhoto = !isMine && !isSystem ? (room?.participantPhotos?.[msg.senderId] || null) : null;

          // 견적 시스템 메시지 카드 (프로→오른쪽, 의뢰자→왼쪽)
          if (isSystem && msg.type === "quote") {
            const isMyQuote = msg.quoteData?.proUid === myUid;
            const price = msg.quoteData?.price;
            const message = msg.quoteData?.message;
            return (
              <React.Fragment key={msg.id}>
                {showDate && <DateDivider><DateLabel>{formatDateDivider(msg.createdAt)}</DateLabel></DateDivider>}
                <QuoteCardWrap $isMine={isMyQuote}>
                  <QuoteCard>
                    <QuoteCardTopBar />
                    {/* 프로 프로필 헤더 */}
                    {proProfile && (
                      <ProInfoRow>
                        {proProfile.profileImage || proProfile.photoURL ? (
                          <ProAvatar src={proProfile.profileImage || proProfile.photoURL} alt="" />
                        ) : (
                          <ProAvatarPlaceholder><IoPersonCircleOutline size={40} color={THEME.border} /></ProAvatarPlaceholder>
                        )}
                        <ProInfoText>
                          <ProName>{proProfile.nickname || proProfile.name || "전문가"}</ProName>
                        </ProInfoText>
                        <GradeBadge grade={proProfile.grade} size="sm" />
                      </ProInfoRow>
                    )}
                    <QuoteCardHeader>
                      <QuoteCardLabel>견적 안내</QuoteCardLabel>
                    </QuoteCardHeader>
                    {price > 0 && <QuoteCardPrice>{price.toLocaleString()}원</QuoteCardPrice>}
                    {message && <QuoteCardMessage>{message}</QuoteCardMessage>}
                    {/* 전문가 프로필 보기 — 의뢰자에게만 */}
                    {isOrderOwner && proProfile && (
                      <ProProfileLink onClick={() => navigate("/biz-profile", { state: { viewUid: proProfile.uid } })}>
                        전문가 프로필 보기
                      </ProProfileLink>
                    )}
                    {isOrderOwner && quoteStatus === "pending" && (
                      <QuoteNotice onClick={() => orderData && navigate(`/order/detail/${orderData.id}`, { state: { order: orderData, category: CATEGORIES.find(c => c.id === orderData.categoryId) } })}>
                        견적 수락은 오더 상세 · 나의오더현황에서 처리해요 ›
                      </QuoteNotice>
                    )}
                    {quoteStatus === "accepted" && <QuoteStatusBadge $type="accepted">수락됨</QuoteStatusBadge>}
                    {quoteStatus === "rejected" && <QuoteStatusBadge $type="rejected">거절됨</QuoteStatusBadge>}
                    {!isOrderOwner && quoteStatus === "pending" && <QuoteStatusBadge $type="pending">수락 대기중</QuoteStatusBadge>}
                  </QuoteCard>
                  <MsgTime style={{ textAlign: isMyQuote ? "right" : "left", marginTop: 4 }}>{formatMsgTime(msg.createdAt)}</MsgTime>
                </QuoteCardWrap>
              </React.Fragment>
            );
          }

          // 일반 시스템 메시지 (수락/거절 결과 등)
          if (isSystem) {
            return (
              <React.Fragment key={msg.id}>
                {showDate && <DateDivider><DateLabel>{formatDateDivider(msg.createdAt)}</DateLabel></DateDivider>}
                <SystemMsgWrap>
                  <SystemMsgText>{msg.text}</SystemMsgText>
                </SystemMsgWrap>
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={msg.id}>
              {showDate && (
                <DateDivider><DateLabel>{formatDateDivider(msg.createdAt)}</DateLabel></DateDivider>
              )}
              <MsgRow
                $isMine={isMine}
                ref={(el) => { searchResultRefs.current[msg.id] = el; }}
                onTouchStart={isMine && !msg.deleted ? () => handleLongPress(msg.id) : undefined}
                onTouchEnd={isMine ? handleTouchEnd : undefined}
                onMouseEnter={isMine && !msg.deleted ? () => {} : undefined}
              >
                {!isMine && (
                  otherPhoto ? (
                    <AvatarImg src={otherPhoto} alt="" />
                  ) : (
                    <SenderAvatar>{(msg.senderName || "?").charAt(0)}</SenderAvatar>
                  )
                )}
                <MsgContent $isMine={isMine}>
                  {!isMine && <SenderName>{msg.senderName}</SenderName>}
                  <BubbleRow $isMine={isMine}>
                    {isMine && (
                      <MsgTimeWrap>
                        {!msg.deleted && !(msg.readBy && msg.readBy.length > 1) && <UnreadBadge>1</UnreadBadge>}
                        <MsgTime>{formatMsgTime(msg.createdAt)}</MsgTime>
                      </MsgTimeWrap>
                    )}
                    {isMine && !msg.deleted && !msg.type && (
                      <MsgMenuBtn onClick={() => setMenuMsgId(msg.id)}>
                        <IoEllipsisHorizontal size={14} />
                      </MsgMenuBtn>
                    )}

                    {msg.deleted ? (
                      <DeletedBubble $isMine={isMine}>삭제된 메시지입니다</DeletedBubble>
                    ) : isEditing ? (
                      <EditWrap>
                        <EditInput value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                        <EditActions>
                          <EditCancelBtn onClick={handleCancelEdit}>취소</EditCancelBtn>
                          <EditSaveBtn onClick={handleSaveEdit}>저장</EditSaveBtn>
                        </EditActions>
                      </EditWrap>
                    ) : msg.type === "image" ? (
                      <ImageBubble $isMine={isMine} onClick={() => window.open(msg.fileUrl, "_blank")}>
                        <ChatImage src={msg.fileUrl} alt="이미지" />
                      </ImageBubble>
                    ) : (msg.type === "schedule" || msg.type === "schedules") ? (
                      (() => {
                        // 단일/다건 통합 처리
                        const rawItems = msg.type === "schedule"
                          ? [msg.schedule]
                          : (msg.schedules || []);
                        // date에 ~ 있으면 기간, 아니면 단일
                        const barItems = rawItems.map((s) => {
                          if (s.date.includes("~")) {
                            const [sd, ed] = s.date.split("~").map((x) => x.trim());
                            return { ...s, startDate: sd, endDate: ed };
                          }
                          return { ...s, startDate: s.date, endDate: s.date };
                        });
                        // 전체 기간의 월 범위 구하기
                        const allDates = barItems.flatMap((b) => [b.startDate, b.endDate]).sort();
                        const minDate = new Date(allDates[0]);
                        const maxDate = new Date(allDates[allDates.length - 1]);
                        // 시작 월의 1일부터 종료 월 말일까지 주 단위 생성
                        const startY = minDate.getFullYear();
                        const startM = minDate.getMonth();
                        const endY = maxDate.getFullYear();
                        const endM = maxDate.getMonth();

                        const allWeeks = [];
                        let cy = startY, cm = startM;
                        while (cy < endY || (cy === endY && cm <= endM)) {
                          const firstDay = new Date(cy, cm, 1).getDay();
                          const daysInMonth = new Date(cy, cm + 1, 0).getDate();
                          let row = [];
                          for (let i = 0; i < firstDay; i++) row.push(null);
                          for (let d = 1; d <= daysInMonth; d++) {
                            row.push({ y: cy, m: cm, d });
                            if (row.length === 7) { allWeeks.push(row); row = []; }
                          }
                          if (row.length > 0) { while (row.length < 7) row.push(null); allWeeks.push(row); }
                          if (cm === 11) { cy++; cm = 0; } else cm++;
                        }

                        // 주별 바 계산
                        const p2 = (n) => String(n).padStart(2, "0");
                        const getWeekBars = (week) => {
                          const wDates = week.map((c) => c ? `${c.y}-${p2(c.m + 1)}-${p2(c.d)}` : null);
                          const ws = wDates.find((x) => x);
                          const we = [...wDates].reverse().find((x) => x);
                          if (!ws || !we) return [];
                          return barItems.filter((b) => b.startDate <= we && b.endDate >= ws).map((b) => {
                            const sc = wDates.findIndex((x) => x && x >= b.startDate);
                            const ec = 6 - [...wDates].reverse().findIndex((x) => x && x <= b.endDate);
                            return { ...b, col: Math.max(0, sc) + 1, colEnd: Math.min(7, ec) + 2 };
                          });
                        };

                        // 바가 있는 주만 필터
                        const relevantWeeks = allWeeks.filter((week) => getWeekBars(week).length > 0);
                        // 바가 있는 주 + 앞뒤 1주 포함
                        const relevantIdxs = new Set();
                        allWeeks.forEach((week, idx) => {
                          if (getWeekBars(week).length > 0) {
                            if (idx > 0) relevantIdxs.add(idx - 1);
                            relevantIdxs.add(idx);
                            if (idx < allWeeks.length - 1) relevantIdxs.add(idx + 1);
                          }
                        });
                        const displayWeeks = [...relevantIdxs].sort((a, b) => a - b).map((i) => allWeeks[i]);

                        return (
                          <BubbleCalWrap $isMine={isMine}>
                            <SchedBubbleHeader><IoCalendarOutline size={14} /><span>일정 공유</span></SchedBubbleHeader>
                            <BubbleCalDayRow>
                              {["일","월","화","수","목","금","토"].map((d) => (
                                <BubbleCalDayLabel key={d}>{d}</BubbleCalDayLabel>
                              ))}
                            </BubbleCalDayRow>
                            {displayWeeks.map((week, wi) => {
                              const bars = getWeekBars(week);
                              const barRows = [];
                              const lanes = [];
                              bars.forEach((bar) => {
                                let lane = lanes.findIndex((l) => l <= bar.col);
                                if (lane === -1) lane = lanes.length;
                                lanes[lane] = bar.colEnd;
                                if (!barRows[lane]) barRows[lane] = [];
                                barRows[lane].push(bar);
                              });
                              return (
                                <React.Fragment key={wi}>
                                  <BubbleCalRow>
                                    {week.map((cell, ci) => (
                                      <BubbleCalCell key={ci} $isMine={isMine}>
                                        {cell ? cell.d : ""}
                                      </BubbleCalCell>
                                    ))}
                                  </BubbleCalRow>
                                  {barRows.map((bRow, bri) => (
                                    <BubbleCalBarRow key={bri}>
                                      {bRow.map((bar, bi) => (
                                        <BubbleCalBar key={bi} $col={bar.col} $colEnd={bar.colEnd} $isMine={isMine}>
                                          {bar.title}
                                        </BubbleCalBar>
                                      ))}
                                    </BubbleCalBarRow>
                                  ))}
                                </React.Fragment>
                              );
                            })}
                          </BubbleCalWrap>
                        );
                      })()
                    ) : msg.type === "file" ? (
                      <FileBubble $isMine={isMine} onClick={() => window.open(msg.fileUrl, "_blank")}>
                        <FileIcon $isMine={isMine}><IoDocumentOutline size={20} /></FileIcon>
                        <FileInfo>
                          <FileName $isMine={isMine}>{msg.fileName}</FileName>
                          <FileSize $isMine={isMine}>{formatFileSize(msg.fileSize || 0)}</FileSize>
                        </FileInfo>
                        <DownloadIcon $isMine={isMine}><IoDownloadOutline size={18} /></DownloadIcon>
                      </FileBubble>
                    ) : (
                      <Bubble $isMine={isMine}>
                        {searchQuery ? highlightText(msg.text, searchQuery) : msg.text}
                        {msg.editedAt && <EditedTag>(수정됨)</EditedTag>}
                      </Bubble>
                    )}
                    {!isMine && <MsgTime>{formatMsgTime(msg.createdAt)}</MsgTime>}
                  </BubbleRow>
                </MsgContent>
              </MsgRow>
            </React.Fragment>
          );
        })}
        {otherTyping && (
          <TypingRow>
            <TypingDots>
              <TypingDot $d="0s" /><TypingDot $d="0.2s" /><TypingDot $d="0.4s" />
            </TypingDots>
            <TypingText>입력 중...</TypingText>
          </TypingRow>
        )}
        <div ref={bottomRef} />
      </MessageList>

      {/* 전문가 프로필 바텀시트 제거 — 비즈프로필 페이지로 직접 이동 */}

      {isQuoteLocked ? (
        <LockedInputArea>
          <LockedText>{
            quoteStatus === "cancelled" ? "취소된 요청입니다" :
            quoteStatus === "rejected" ? "거절된 견적입니다" :
            isOrderOwner ? "견적을 확인해주세요" : "견적 수락 대기중입니다"
          }</LockedText>
        </LockedInputArea>
      ) : (
        <>
          {/* 상태 변경은 상단 StatusStepBar로 이동 */}
          <InputArea>
            <HiddenFileInput ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.hwp,.zip,.txt" onChange={handleFileSelect} />
            <InputWrap>
              <AttachBtn onClick={() => fileInputRef.current?.click()} disabled={uploading}><IoAdd size={22} /></AttachBtn>
              <ScheduleShareBtn onClick={openScheduleModal}><IoCalendarOutline size={18} /></ScheduleShareBtn>
              <TextInput
                placeholder={uploading ? "파일 전송 중..." : "메시지를 입력하세요"}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={uploading}
            />
            <SendBtn onClick={handleSend} disabled={!text.trim() || sending || uploading}><IoSend size={18} /></SendBtn>
          </InputWrap>
        </InputArea>
        </>
      )}

      {/* 결제 바텀시트 */}
      {showPaySheet && (
        <PayOverlay onClick={() => setShowPaySheet(false)}>
          <PaySheet onClick={(e) => e.stopPropagation()}>
            <PaySheetHandle />
            <PaySheetTitle>결제하기</PaySheetTitle>
            <PayLabel>결제 금액</PayLabel>
            <PayInputRow>
              <PayInput
                inputMode="numeric"
                value={payAmount ? Number(payAmount).toLocaleString() : ""}
                onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
              />
              <PayUnit>원</PayUnit>
            </PayInputRow>
            <PaySubmitBtn onClick={handlePay} disabled={paying}>
              {paying ? "처리 중..." : "결제하기"}
            </PaySubmitBtn>
          </PaySheet>
        </PayOverlay>
      )}

      {/* 리뷰 바텀시트 */}
      {showReviewSheet && (
        <PayOverlay onClick={() => setShowReviewSheet(false)}>
          <PaySheet onClick={(e) => e.stopPropagation()}>
            <PaySheetHandle />
            <PaySheetTitle>리뷰 작성</PaySheetTitle>
            <ReviewStarRow>
              {[1, 2, 3, 4, 5].map((n) => (
                <ReviewStarBtn key={n} onClick={() => setReviewRating(n)}>
                  {n <= reviewRating ? <IoStar size={32} color="#F59E0B" /> : <IoStarOutline size={32} color={THEME.border} />}
                </ReviewStarBtn>
              ))}
            </ReviewStarRow>
            <ReviewTextarea
              placeholder="리뷰를 작성해주세요"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value.slice(0, 300))}
              maxLength={300}
              rows={4}
            />
            <ReviewCharCount>{reviewText.length}/300</ReviewCharCount>
            <PaySubmitBtn onClick={handleSubmitReview} disabled={reviewSending}>
              {reviewSending ? "등록 중..." : "등록"}
            </PaySubmitBtn>
          </PaySheet>
        </PayOverlay>
      )}

      {/* 더보기 메뉴 */}
      {showMoreMenu && (
        <MenuOverlay onClick={() => setShowMoreMenu(false)}>
          <MsgMenu onClick={(e) => e.stopPropagation()}>
            <MsgMenuItem onClick={handleBlockUser}>
              <IoCloseCircle size={16} /> 거부 등록
            </MsgMenuItem>
          </MsgMenu>
        </MenuOverlay>
      )}

      {/* 취소 사유 선택 바텀시트 */}
      {showCancelModal && (
        <CancelModalOverlay onClick={() => setShowCancelModal(false)}>
          <CancelModalSheet onClick={(e) => e.stopPropagation()}>
            <CancelTitle>취소 사유를 선택해주세요</CancelTitle>
            {["잘못접수", "일정변경", "오더수정", "기타"].map((reason) => (
              <CancelOption key={reason} onClick={() => {
                handleOrderStatusChange("취소", reason);
                setShowCancelModal(false);
              }}>
                {reason}
              </CancelOption>
            ))}
          </CancelModalSheet>
        </CancelModalOverlay>
      )}

      {toast && <ChatToast>{toast}</ChatToast>}
    </Container>
  );
};

export default ChatDetailPage;

/* ─── Styled Components ──────────────────── */

const PRIMARY = THEME.primary;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: ${THEME.background};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  height: 52px;
  padding: 0 16px;
  background: ${THEME.surface};
  border-bottom: 1px solid ${THEME.border};
  flex-shrink: 0;
`;

const OrderInfoBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: ${THEME.purpleLight || "#F3EEFF"};
  border-bottom: 1px solid ${THEME.border};
  cursor: pointer;
  flex-shrink: 0;
  &:active { opacity: 0.7; }
`;

const OrderInfoText = styled.div`
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: ${THEME.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const OrderInfoArrow = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${THEME.primary};
  flex-shrink: 0;
`;

const StatusNoticeBar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  font-size: 12px;
  color: ${THEME.muted};
  background: ${THEME.background};
  border-bottom: 1px solid ${THEME.border};
  cursor: pointer;
  b { color: ${THEME.text}; font-weight: 600; }
  &:active { opacity: 0.7; }
`;

const QuoteNotice = styled.div`
  margin-top: 8px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 500;
  color: ${THEME.primary};
  background: ${THEME.purpleLight || "#F3F0FF"};
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

const StatusStepBar = styled.div`
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  background: ${THEME.surface};
  border-bottom: 1px solid ${THEME.border};
  flex-shrink: 0;
`;

const StatusStepBtn = styled.button`
  flex: 1;
  padding: 10px 4px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid ${({ $active, $enabled }) => $active ? THEME.primary : $enabled ? THEME.primary : "#E0E0E0"};
  background: ${({ $active }) => $active ? THEME.primary : "#fff"};
  color: ${({ $active, $enabled }) => $active ? "#fff" : $enabled ? THEME.primary : "#999"};
  cursor: ${({ $enabled }) => $enabled ? "pointer" : "default"};
  opacity: 1;
  transition: all 0.15s;
  &:active {
    ${({ $enabled }) => $enabled ? "transform: scale(0.95);" : ""}
  }
`;

const ORDER_STATUS_COLORS = {
  "접수": "#3B82F6",
  "등록": "#3B82F6",
  "배정": "#2571e3",
  "선정대기": "#F59E0B",
  "업체선택대기": "#F59E0B",
  "완료": "#10B981",
  "대기": "#F97316",
  "취소": "#9CA3AF",
  "거부": "#EF4444",
};

const OrderStatusBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ $status }) => ORDER_STATUS_COLORS[$status] || "#9CA3AF"};
  color: #fff;
  flex-shrink: 0;
`;

const StatusActionBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  background: #fff;
  border-top: 1px solid ${THEME.border};
  flex-shrink: 0;
`;

const StatusActionBtn = styled.button`
  flex: 1;
  padding: 10px 0;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: ${({ $color }) => $color || THEME.primary};
  color: #fff;
  &:active { opacity: 0.8; }
`;

const BackBtn = styled.button`
  color: ${THEME.text};
  display: flex;
  align-items: center;
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
  &:active { opacity: 0.6; }
`;

const HeaderTitle = styled.p`
  flex: 1;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.text};
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeaderIconBtn = styled.button`
  color: ${THEME.muted};
  display: flex;
  align-items: center;
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
  &:active { color: ${PRIMARY}; }
`;

const MemoBtnBadge = styled.button`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $hasMemo }) => ($hasMemo ? PRIMARY : THEME.muted)};
  background: transparent;
  padding: 6px 0;
  white-space: nowrap;
`;

const LeaveBtn = styled.button`
  color: ${THEME.muted};
  display: flex;
  align-items: center;
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
  &:active { color: #E85830; }
`;

/* ─── 검색 ─── */

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: ${THEME.surface};
  border-bottom: 1px solid ${THEME.border};
  flex-shrink: 0;
`;

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: ${THEME.text};
  background: ${THEME.background};
  border-radius: 10px;
  padding: 8px 12px;
  &::placeholder { color: #bbb; }
`;

const SearchCount = styled.span`
  font-size: 12px;
  color: ${THEME.muted};
  flex-shrink: 0;
`;

const SearchCloseBtn = styled.button`
  color: ${THEME.muted};
  display: flex;
  align-items: center;
  padding: 2px;
`;

const SearchResultBar = styled.div`
  max-height: 120px;
  overflow-y: auto;
  background: ${THEME.surface};
  border-bottom: 1px solid ${THEME.border};
  flex-shrink: 0;
`;

const SearchResultItem = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const SearchResultName = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${THEME.text};
  flex-shrink: 0;
`;

const SearchResultText = styled.span`
  font-size: 12px;
  color: ${THEME.muted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const HighlightSpan = styled.span`
  background: #FEF3C7;
  border-radius: 2px;
  padding: 0 1px;
`;

/* ─── 메모 배너 ─── */

const MemoBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 16px;
  background: ${THEME.purpleLight};
  border-bottom: 1px solid ${THEME.border};
  cursor: pointer;
  flex-shrink: 0;
`;

const MemoBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${PRIMARY};
  background: ${THEME.surface};
  padding: 2px 8px;
  border-radius: 20px;
  flex-shrink: 0;
  line-height: 1.4;
`;

const MemoContent = styled.p`
  font-size: 13px;
  color: #2A3A50;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

/* ─── 모달 ─── */

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  margin-bottom: 8px;
`;

const ModalTitle = styled.p`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
`;

const ModalCloseBtn = styled.button`
  border: none;
  background: transparent;
  color: ${THEME.muted};
  display: flex;
  align-items: center;
  padding: 2px;
  cursor: pointer;
`;

/* ─── 메시지 수정/삭제 메뉴 ─── */

const MenuOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 110;
`;

const MsgMenu = styled.div`
  position: fixed;
  bottom: 80px;
  right: 20px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  overflow: hidden;
  min-width: 120px;
  z-index: 111;
`;

const MsgMenuItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 14px;
  color: ${({ $danger }) => ($danger ? "#E85830" : THEME.text)};
  cursor: pointer;
  &:active { background: ${THEME.background}; }
  & + & { border-top: 1px solid ${THEME.border}; }
`;

const MsgMenuDisabled = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 13px;
  color: ${THEME.muted};
  border-top: 1px solid ${THEME.border};
`;

const MsgMenuBtn = styled.button`
  color: ${THEME.muted};
  display: flex;
  align-items: center;
  padding: 2px;
  opacity: 0;
  transition: opacity 0.15s;
  ${() => `
    *:hover > & { opacity: 1; }
  `}
`;

/* ─── 메시지 목록 ─── */

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  -webkit-overflow-scrolling: touch;
`;

const DateDivider = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px 0 12px;
`;

const DateLabel = styled.span`
  font-size: 11px;
  color: ${THEME.muted};
  background: #E8E8EC;
  padding: 4px 12px;
  border-radius: 20px;
`;

const MsgRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 10px;
  justify-content: ${({ $isMine }) => ($isMine ? "flex-end" : "flex-start")};
`;

const SenderAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 12px;
  background: #E8E8EC;
  color: #666;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 2px;
`;

const AvatarImg = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 12px;
  object-fit: cover;
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 2px;
`;

const MsgContent = styled.div`
  max-width: 70%;
  display: flex;
  flex-direction: column;
  align-items: ${({ $isMine }) => ($isMine ? "flex-end" : "flex-start")};
`;

const SenderName = styled.span`
  font-size: 12px;
  color: ${THEME.muted};
  margin-bottom: 4px;
  padding-left: 2px;
`;

const BubbleRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 6px;
`;

const Bubble = styled.div`
  padding: 10px 14px;
  border-radius: ${({ $isMine }) => ($isMine ? "14px 14px 4px 14px" : "14px 14px 14px 4px")};
  background: ${({ $isMine }) => ($isMine ? PRIMARY : "#FFFFFF")};
  color: ${({ $isMine }) => ($isMine ? "#FFFFFF" : THEME.text)};
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
  box-shadow: ${({ $isMine }) => ($isMine ? "none" : "0 1px 3px rgba(0,0,0,0.04)")};
`;

const DeletedBubble = styled.div`
  padding: 10px 14px;
  border-radius: ${({ $isMine }) => ($isMine ? "14px 14px 4px 14px" : "14px 14px 14px 4px")};
  background: #F0F0F0;
  color: #999;
  font-size: 13px;
  font-style: italic;
`;

const EditedTag = styled.span`
  display: inline;
  font-size: 11px;
  opacity: 0.6;
  margin-left: 4px;
`;

/* ─── 인라인 편집 ─── */

const EditWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 200px;
`;

const EditInput = styled.textarea`
  border: 1px solid ${PRIMARY};
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 14px;
  color: ${THEME.text};
  resize: none;
  outline: none;
  min-height: 40px;
`;

const EditActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const EditCancelBtn = styled.button`
  font-size: 12px;
  color: ${THEME.muted};
  padding: 4px 12px;
  border-radius: 6px;
  &:active { background: ${THEME.background}; }
`;

const EditSaveBtn = styled.button`
  font-size: 12px;
  color: white;
  background: ${PRIMARY};
  padding: 4px 12px;
  border-radius: 6px;
  border: none;
  &:active { opacity: 0.8; }
`;

const MsgTime = styled.span`
  font-size: 10px;
  color: ${THEME.muted};
  flex-shrink: 0;
  white-space: nowrap;
`;

const MsgTimeWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  flex-shrink: 0;
`;

const UnreadBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${PRIMARY};
  line-height: 1;
`;

/* ─── 이미지/파일/일정 버블 ─── */

const ImageBubble = styled.div`
  border-radius: ${({ $isMine }) => ($isMine ? "14px 14px 4px 14px" : "14px 14px 14px 4px")};
  overflow: hidden;
  cursor: pointer;
  max-width: 200px;
`;

const ChatImage = styled.img`
  display: block;
  width: 100%;
  max-height: 250px;
  object-fit: cover;
`;

const FileBubble = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: ${({ $isMine }) => ($isMine ? "14px 14px 4px 14px" : "14px 14px 14px 4px")};
  background: ${({ $isMine }) => ($isMine ? PRIMARY : "#FFFFFF")};
  box-shadow: ${({ $isMine }) => ($isMine ? "none" : "0 1px 3px rgba(0,0,0,0.04)")};
  cursor: pointer;
  min-width: 180px;
`;

const FileIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ $isMine }) => ($isMine ? "rgba(255,255,255,0.15)" : "#F4F3F8")};
  color: ${({ $isMine }) => ($isMine ? "#fff" : PRIMARY)};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const FileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FileName = styled.p`
  font-size: 13px;
  font-weight: 500;
  color: ${({ $isMine }) => ($isMine ? "#fff" : THEME.text)};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FileSize = styled.p`
  font-size: 11px;
  color: ${({ $isMine }) => ($isMine ? "rgba(255,255,255,0.6)" : THEME.muted)};
  margin-top: 2px;
`;

const DownloadIcon = styled.div`
  color: ${({ $isMine }) => ($isMine ? "rgba(255,255,255,0.6)" : THEME.muted)};
  flex-shrink: 0;
`;

const ScheduleBubble = styled.div`
  padding: 12px 14px;
  border-radius: ${({ $isMine }) => ($isMine ? "14px 14px 4px 14px" : "14px 14px 14px 4px")};
  background: ${({ $isMine }) => ($isMine ? THEME.primaryDark : THEME.surface)};
  box-shadow: ${({ $isMine }) => ($isMine ? "none" : "0 1px 3px rgba(0,0,0,0.04)")};
  min-width: 180px;
`;

const SchedBubbleHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${THEME.text};
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 6px;
`;

const SchedBubbleTitle = styled.p`
  font-size: 14px;
  font-weight: 600;
  color: ${({ $isMine }) => ($isMine ? "#fff" : THEME.text)};
  margin-bottom: 6px;
`;

const SchedBubbleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${THEME.muted};
  margin-bottom: 2px;
`;

const SchedBubbleText = styled.span`
  font-size: 12px;
  color: ${({ $isMine }) => ($isMine ? "rgba(255,255,255,0.7)" : THEME.muted)};
`;

const SchedBubbleMemo = styled.p`
  font-size: 11px;
  color: ${({ $isMine }) => ($isMine ? "rgba(255,255,255,0.5)" : "#B0B8BF")};
  margin-top: 4px;
  border-top: 1px solid ${({ $isMine }) => ($isMine ? "rgba(255,255,255,0.1)" : "#F0F0F0")};
  padding-top: 4px;
`;

/* ─── 여러 일정 묶음 (타임라인) ─── */

const SchedulesBubble = styled.div`
  background: ${({ $isMine }) => ($isMine ? PRIMARY : "#f2f7fe")};
  border-radius: 14px;
  padding: 12px 14px;
  max-width: 280px;
`;

/* ─── 채팅 버블 내 미니 캘린더 ─── */
const BubbleCalWrap = styled.div`
  background: #fff;
  border-radius: 14px;
  padding: 12px 10px;
  max-width: 280px;
  min-width: 260px;
  border: 1px solid ${THEME.border};
`;

const BubbleCalDayRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-top: 8px;
`;

const BubbleCalDayLabel = styled.div`
  text-align: center;
  font-size: 10px;
  font-weight: 500;
  color: ${THEME.muted};
  padding: 2px 0;
`;

const BubbleCalRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
`;

const BubbleCalCell = styled.div`
  text-align: center;
  font-size: 11px;
  font-weight: 400;
  color: ${THEME.text};
  padding: 4px 0;
`;

const BubbleCalBarRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-top: -2px;
`;

const BubbleCalBar = styled.div`
  grid-column: ${({ $col, $colEnd }) => `${$col} / ${$colEnd}`};
  background: ${PRIMARY};
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  padding: 3px 5px;
  border-radius: 3px;
  margin: 1px 1px 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
`;

const SchedsTimelineItem = styled.div`
  padding: 8px 0;
  &:not(:last-child) {
    border-bottom: 1px solid ${({ $isMine }) => $isMine ? "rgba(255,255,255,0.15)" : "rgba(37, 113, 227, 0.1)"};
  }
`;

const SchedsDateLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${({ $isMine }) => ($isMine ? "rgba(255,255,255,0.8)" : PRIMARY)};
  margin-bottom: 4px;
`;

const SchedsTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ $isMine }) => ($isMine ? "#fff" : THEME.text)};
`;

const SchedsTime = styled.div`
  font-size: 11px;
  color: ${({ $isMine }) => ($isMine ? "rgba(255,255,255,0.7)" : THEME.muted)};
  margin-top: 2px;
`;

const SchedsMemo = styled.div`
  font-size: 11px;
  color: ${({ $isMine }) => ($isMine ? "rgba(255,255,255,0.5)" : "#B0B8BF")};
  margin-top: 2px;
`;

/* ─── 타이핑 표시 ─── */

const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
`;

const TypingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0 4px 42px;
`;

const TypingDots = styled.div`
  display: flex;
  gap: 3px;
`;

const TypingDot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${THEME.muted};
  animation: ${bounce} 1.2s infinite ease-in-out;
  animation-delay: ${({ $d }) => $d};
`;

const TypingText = styled.span`
  font-size: 11px;
  color: ${THEME.muted};
`;

/* ─── 입력 영역 ─── */

const HiddenFileInput = styled.input`display: none;`;

const AttachBtn = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ disabled }) => (disabled ? "#ccc" : PRIMARY)};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &:active:not(:disabled) { background: ${THEME.purpleLight}; }
`;

const InputArea = styled.div`
  padding: 8px 12px;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
  background: ${THEME.surface};
  flex-shrink: 0;
`;

const InputWrap = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: ${THEME.background};
  border-radius: 22px;
  padding: 6px 6px 6px 16px;
`;

const TextInput = styled.textarea`
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: ${THEME.text};
  background: transparent;
  resize: none;
  max-height: 100px;
  line-height: 1.5;
  padding: 6px 0;
  &::placeholder { color: #bbb; }
`;

const ScheduleShareBtn = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${PRIMARY};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &:active { background: ${THEME.purpleLight}; }
`;

const ScheduleModalContent = styled.div`
  background: white;
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  padding-top: 14px;
  overflow: hidden;
  position: fixed;
  bottom: 0;
`;


const SchedShareBtnModal = styled.button`
  margin: 8px 0 4px;
  padding: 12px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  color: white;
  background: ${({ disabled }) => (disabled ? "#ccc" : PRIMARY)};
  flex-shrink: 0;
  &:disabled { cursor: default; }
  &:active:not(:disabled) { opacity: 0.8; }
`;

/* ─── 일정 생성 ─── */

const SchedCreateWrap = styled.div`
  padding: 0 16px 16px;
  overflow-y: auto;
  flex: 1;
`;

const SchedHint = styled.div`
  text-align: center;
  font-size: 11px;
  color: ${THEME.muted};
  margin: 6px 0 4px;
`;

const SchedRangeLabel = styled.div`
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: ${PRIMARY};
  margin: 8px 0;
`;

const SchedAddBtn = styled.div`
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: ${PRIMARY};
  padding: 10px 0 4px;
  cursor: pointer;
  &:active { opacity: 0.6; }
`;

const SchedAddedList = styled.div`
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SchedAddedItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${THEME.background};
  border-radius: 8px;
  padding: 10px 12px;
  border-left: 3px solid ${PRIMARY};
`;

const SchedAddedInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const SchedAddedDate = styled.div`
  font-size: 11px;
  color: ${PRIMARY};
  font-weight: 600;
`;

const SchedAddedTitle = styled.div`
  font-size: 13px;
  color: ${THEME.text};
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SchedRemoveBtn = styled.div`
  font-size: 14px;
  color: ${THEME.muted};
  cursor: pointer;
  padding: 4px;
  flex-shrink: 0;
  &:active { opacity: 0.5; }
`;

const SchedEmptyHint = styled.div`
  text-align: center;
  font-size: 13px;
  color: ${THEME.muted};
  padding: 20px 0;
`;

const SchedItemCard = styled.div`
  background: ${THEME.background};
  border-radius: 10px;
  padding: 12px;
  margin-top: 8px;
  border-left: 3px solid ${PRIMARY};
`;

const SchedItemDate2 = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${PRIMARY};
  margin-bottom: 8px;
`;

/* 미니 캘린더 */
const MiniCalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
`;

const MiniCalNav = styled.button`
  border: none;
  background: transparent;
  font-size: 12px;
  color: ${THEME.muted};
  padding: 4px 8px;
  cursor: pointer;
  &:active { opacity: 0.5; }
`;

const MiniCalTitle = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.text};
`;

const MiniCalDayRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 2px;
`;

const MiniCalDayLabel = styled.span`
  font-size: 11px;
  color: ${({ $sun, $sat }) => ($sun ? "#EF5350" : $sat ? "#42A5F5" : THEME.muted)};
  padding: 2px 0;
`;

const MiniCalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 12px;
`;

const MiniCalBarRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0;
  margin-top: -6px;
`;

const MiniCalBar = styled.div`
  grid-column: ${({ $col, $colEnd }) => `${$col} / ${$colEnd}`};
  background: ${PRIMARY};
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 5px 6px;
  border-radius: 4px;
  margin: 1px 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  line-height: 1.4;
`;

const MiniCalCellWrap = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2px 0;
  background: ${({ $inRange, $isSame }) => $isSame ? "transparent" : $inRange ? `${PRIMARY}18` : "transparent"};
  border-radius: ${({ $isStart, $isEnd, $isSame }) =>
    $isSame ? "0" : $isStart ? "20px 0 0 20px" : $isEnd ? "0 20px 20px 0" : "0"};
  cursor: pointer;
`;

const MiniCalCell = styled.div`
  font-size: 12px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: ${({ $selected, $today }) => ($selected ? "white" : $today ? PRIMARY : THEME.text)};
  background: ${({ $selected }) => ($selected ? PRIMARY : "transparent")};
  font-weight: ${({ $selected, $today }) => ($selected || $today ? 600 : 400)};
`;

const SchedFormGroup = styled.div`
  margin-bottom: 8px;
`;

const SchedFormInput = styled.input`
  width: 100%;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  color: ${THEME.text};
  outline: none;
  box-sizing: border-box;
  margin-bottom: 8px;
  &:focus { border-color: ${PRIMARY}; }
  &::placeholder { color: #bbb; }
`;

const SchedTimeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const SchedTimeSelect = styled.select`
  flex: 1;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  padding: 10px 8px;
  font-size: 13px;
  color: ${THEME.text};
  background: white;
  outline: none;
  &:focus { border-color: ${PRIMARY}; }
`;

const SchedTimeSep = styled.span`
  font-size: 13px;
  color: ${THEME.muted};
`;

/* ─── 견적 카드 ─── */

const QuoteCardWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${({ $isMine }) => $isMine ? "flex-end" : "flex-start"};
  margin: 12px 0;
  padding: 0 4px;
`;

const QuoteCard = styled.div`
  width: 80%;
  max-width: 280px;
  background: ${THEME.surface};
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(37, 113, 227, 0.12);
`;

const QuoteCardTopBar = styled.div`
  height: 4px;
  background: linear-gradient(90deg, ${PRIMARY}, ${THEME.purple});
`;

const QuoteCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 0;
`;

const QuoteCardLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${PRIMARY};
`;

const QuoteCardPrice = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${PRIMARY};
  padding: 10px 16px 0;
`;

const QuoteCardMessage = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.text};
  line-height: 1.5;
  padding: 8px 16px 0;
  white-space: pre-line;
`;

const QuoteCardActions = styled.div`
  display: flex;
  gap: 8px;
  padding: 14px 16px 16px;
`;

const QuoteAcceptBtn = styled.button`
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 10px;
  background: ${PRIMARY};
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const QuoteRejectBtn = styled.button`
  flex: 1;
  padding: 10px;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.textSecondary};
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const QuoteStatusBadge = styled.div`
  margin: 14px 16px 16px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 0;
  border-radius: 8px;
  color: ${({ $type }) => $type === "accepted" ? THEME.success : $type === "rejected" ? THEME.danger : THEME.muted};
  background: ${({ $type }) => $type === "accepted" ? "#D1FAE5" : $type === "rejected" ? "#FEE2E2" : THEME.background};
`;

/* ─── 견적 카드 프로 정보 ─── */

const ProInfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 0;
`;

const ProAvatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`;

const ProAvatarPlaceholder = styled.div`
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ProInfoText = styled.div`
  flex: 1;
  min-width: 0;
`;

const ProName = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.text};
`;

const ProProfileLink = styled.div`
  padding: 8px 16px 0;
  font-size: 13px;
  font-weight: 500;
  color: ${PRIMARY};
  cursor: pointer;
  &:active { opacity: 0.6; }
`;

/* ─── 전문가 프로필 바텀시트 ─── */

const ProSheetOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

const ProSheetContent = styled.div`
  width: 100%;
  max-width: 400px;
  max-height: 85vh;
  background: ${THEME.background};
  border-radius: 20px 20px 0 0;
  overflow-y: auto;
  padding-bottom: max(20px, env(safe-area-inset-bottom));
  animation: sheetUp 0.25s ease-out;
  @keyframes sheetUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;

const ProSheetHandle = styled.div`
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: ${THEME.border};
  margin: 10px auto 0;
`;

const ProSheetProfileCard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 12px 12px 0;
  padding: 24px 20px;
  background: ${THEME.surface};
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
`;

const ProSheetAvatar = styled.img`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`;

const ProSheetAvatarPlaceholder = styled.div`
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ProSheetProfileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ProSheetNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ProSheetName = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ProSheetIntro = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 6px;
  line-height: 1.4;
`;

const ProSheetStatsCard = styled.div`
  margin: 12px 12px 0;
  padding: 20px;
  background: ${THEME.surface};
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
`;

const ProSheetStatRow = styled.div`
  display: flex;
  align-items: center;
  margin-top: 16px;
`;

const ProSheetStatItem = styled.div`
  flex: 1;
  text-align: center;
`;

const ProSheetStatNum = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ProSheetStatLabel = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 4px;
`;

const ProSheetStatDivider = styled.div`
  width: 1px;
  height: 32px;
  background: ${THEME.border};
`;

const ProSheetCatCard = styled.div`
  margin: 12px 12px 0;
  padding: 20px;
  background: ${THEME.surface};
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
`;

const ProSheetCatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const ProSheetCatName = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ProSheetCatBadge = styled.span`
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: ${({ $status }) => $status === "approved" ? THEME.success : "#F59E0B"};
`;

const ProSheetChipGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
`;

const ProSheetChip = styled.span`
  padding: 6px 14px;
  border-radius: 20px;
  background: ${THEME.background};
  font-size: 13px;
  font-weight: 500;
  color: ${THEME.text};
`;

const ProSheetRegionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: ${THEME.textSecondary};
`;

const ProSheetDetailBtn = styled.button`
  width: 100%;
  margin-top: 12px;
  padding: 10px;
  border: 1.5px solid ${THEME.border};
  border-radius: 6px;
  background: ${THEME.surface};
  color: ${THEME.textSecondary};
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const ProSheetCloseBtn = styled.button`
  display: block;
  width: calc(100% - 24px);
  margin: 16px 12px 0;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.textSecondary};
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  box-shadow: ${THEME.cardShadow};
  &:active { background: ${THEME.background}; }
`;

/* ─── 시스템 메시지 (수락/거절 결과) ─── */

const SystemMsgWrap = styled.div`
  display: flex;
  justify-content: center;
  margin: 8px 0;
`;

const SystemMsgText = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
  background: ${THEME.background};
  padding: 6px 14px;
  border-radius: 20px;
`;

/* ─── 잠금 입력 영역 ─── */

const LockedInputArea = styled.div`
  padding: 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  background: ${THEME.surface};
  border-top: 1px solid ${THEME.border};
  flex-shrink: 0;
  text-align: center;
`;

const LockedText = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
`;

/* ─── 결제/작업완료/리뷰 버튼 + 바텀시트 ─── */
const ActionBtnArea = styled.div`
  padding: 8px 16px;
  background: ${THEME.surface};
  flex-shrink: 0;
  display: flex;
  gap: 8px;
`;

const CancelBtn = styled.button`
  padding: 13px 20px;
  border: 1px solid ${THEME.danger};
  border-radius: 10px;
  background: transparent;
  color: ${THEME.danger};
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  &:active { opacity: 0.7; }
`;

const ActionBtnFull = styled.button`
  flex: 1;
  padding: 13px;
  border: none;
  border-radius: 10px;
  background: ${({ $green, $gold }) => $green ? THEME.success : $gold ? "#F59E0B" : PRIMARY};
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.85; }
`;

const PayOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 9000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

const PaySheet = styled.div`
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 0 16px 24px;
`;

const PaySheetHandle = styled.div`
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: ${THEME.border};
  margin: 10px auto 14px;
`;

const PaySheetTitle = styled.div`
  font-size: 17px;
  font-weight: 600;
  color: ${THEME.text};
  margin-bottom: 16px;
`;

const PayLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
  margin-bottom: 8px;
`;

const PayInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PayInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  font-size: 18px;
  font-weight: 600;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  &:focus { border-color: ${PRIMARY}; }
  &::placeholder { color: ${THEME.muted}; font-weight: 400; }
`;

const PayUnit = styled.span`
  font-size: 16px;
  color: ${THEME.text};
  flex-shrink: 0;
`;

const PaySubmitBtn = styled.button`
  width: 100%;
  margin-top: 16px;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: ${PRIMARY};
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.85; }
  &:disabled { opacity: 0.5; }
`;

const ReviewStarRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
`;

const ReviewStarBtn = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  &:active { transform: scale(1.2); }
`;

const ReviewTextarea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  resize: none;
  box-sizing: border-box;
  &:focus { border-color: ${PRIMARY}; }
  &::placeholder { color: ${THEME.muted}; }
`;

const ReviewCharCount = styled.div`
  text-align: right;
  font-size: 12px;
  color: ${THEME.muted};
  margin-top: 4px;
`;

const CancelModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 1000;
`;
const CancelModalSheet = styled.div`
  background: #fff; border-radius: 16px 16px 0 0;
  padding: 20px; width: 100%; max-width: 400px;
`;
const CancelTitle = styled.div`
  font-size: 16px; font-weight: 700; margin-bottom: 16px;
`;
const CancelOption = styled.div`
  padding: 14px 0; font-size: 15px; color: #333;
  border-bottom: 1px solid #F0F0F4; cursor: pointer;
  &:last-child { border-bottom: none; }
  &:active { background: #F7F8FA; }
`;

const ChatToast = styled.div`
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: #333;
  color: #fff;
  font-size: 14px;
  border-radius: 10px;
  z-index: 9999;
  white-space: nowrap;
`;

const SendBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: ${({ disabled }) => (disabled ? "#D0D0D0" : PRIMARY)};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &:active:not(:disabled) { opacity: 0.8; }
`;
