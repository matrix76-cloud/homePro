/* eslint-disable */
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { CATEGORIES, THEME, COLLECTIONS } from "../../config/homeproConfig";
import { getOrdersByUser, getOrdersByMatchedPro, getOrdersByApplicant, formatOrderTime, updateOrderStatus, getOrderById, notifyOnsitePrice, notifyApplicantPrice, addOrderLog } from "../../service/OrderService";
import { subscribeChatRooms, sendSystemMessage } from "../../service/ChatService";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import { MOBILEMAINMENU } from "../../utility/constants";
import { IoChatbubbleEllipsesOutline, IoCalendarOutline, IoListOutline, IoCloseOutline } from "react-icons/io5";

/* ─── 지난오더조회 옵션 (사양: 당일/어제/3일/1주/2주/1개월/3개월/6개월) ─── */
const PERIOD_OPTIONS = ["전체", "당일", "어제", "3일", "지난1주일", "지난2주일", "지난1개월", "지난3개월", "지난6개월"];

const matchPeriod = (createdAt, period, dateRange) => {
  if (period === "전체" && !dateRange?.start) return true;
  const d = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt || 0);
  if (dateRange?.start || dateRange?.end) {
    const s = dateRange.start ? new Date(dateRange.start + "T00:00:00") : new Date(0);
    const e = dateRange.end ? new Date(dateRange.end + "T23:59:59") : new Date();
    return d >= s && d <= e;
  }
  const now = new Date();
  const isToday = now.toDateString() === d.toDateString();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = yesterday.toDateString() === d.toDateString();
  const days = (now - d) / 86400000;
  switch (period) {
    case "당일": return isToday;
    case "어제": return isYesterday;
    case "3일": return days >= 0 && days <= 3;
    case "지난1주일": return days >= 0 && days <= 7;
    case "지난2주일": return days >= 0 && days <= 14;
    case "지난1개월": return days >= 0 && days <= 30;
    case "지난3개월": return days >= 0 && days <= 90;
    case "지난6개월": return days >= 0 && days <= 180;
    default: return true;
  }
};

/* ─── 홈프로 사이드 카드 라벨 (사양: priority→수락오더, compare→지원오더, direct→지정오더) ─── */
const PRO_ROLE_TAG_BY_MATCH = { priority: "수락오더", compare: "지원오더", direct: "지정오더" };

/* ─── 홈프로 취소요청 사유 (사양: 8개) ─── */
const CANCEL_REQ_REASONS = ["시간조율불가", "안전상 작업불가", "사전정보와 상이", "작업환경 불가", "견적조건 미합의", "요청내용 변경", "연락불가", "상세사유 입력"];

/* ─── 상태 필터 탭 (사양: 전체/접수/대기/선정대기/배정/완료/취소) ─── */
const STATUS_TABS = ["전체", "접수", "대기", "선정대기", "배정", "완료", "취소"];

const STATUS_DESC = {
  "전체": "내가 등록한 일감과 받은 일감을\n한눈에 볼 수 있어요.",
  "접수": "등록된 일감 중 아직 홈프로가 수락하지 않은\n대기 상태의 오더입니다.",
  "대기": "수정을 위해 일시 보류된 오더입니다.\n재접수하면 다시 노출돼요.",
  "선정대기": "비교선정으로 홈프로가 모집된 오더입니다.\n홈프로 중 1명을 선정해 주세요.",
  "배정": "홈프로가 수락하여 진행 중인 오더입니다.\n일감을 준 프로는 취소, 받은 프로는 작업완료\n변경이 가능해요.",
  "완료": "작업이 완료된 오더입니다.",
  "취소": "취소된 오더입니다.\n취소 후에는 되돌릴 수 없어요.",
};

/* ─── 상태 배지 스타일 ─── */
const STATUS_STYLE = {
  "접수":     { bg: "#3B82F6", color: "#fff" },
  "대기":     { bg: "#F97316", color: "#fff" },
  "선정대기": { bg: "#F59E0B", color: "#fff" },
  "배정":     { bg: "#7C5CFC", color: "#fff" },
  "완료":     { bg: "#10B981", color: "#fff" },
  "취소":     { bg: "#9CA3AF", color: "#fff" },
};

// Firestore 상태값 → 표시 상태 매핑
const normalizeStatus = (s) => {
  if (s === "요청" || s === "접수") return "접수";
  if (s === "대기") return "대기";
  if (s === "선정대기" || s === "업체선택대기" || s === "업체선택") return "선정대기";
  if (s === "진행" || s === "결제") return "배정";
  if (s === "리뷰") return "완료"; // 리뷰는 완료의 하위
  if (s === "거부") return "취소"; // 거부는 차단관리로 이관, 카드에선 취소 취급
  return s; // 배정, 완료, 취소 등은 그대로
};

/* ─── 단가유형/요청방식 표시 (메인화면 사양과 동일 포맷) ─── */
const PRICE_TYPE_LABEL = { fixed: "시공금액", balance: "잔금", hpoint: "H-포인트", onsite: "현장견적", estimate: "견적요청", quote: "견적요청" };
/* 금액 미정 단가유형 — 수락→배정 후 견적가 통보 (현장견적/견적요청 통합) */
const UNPRICED_TYPES = ["onsite", "estimate", "quote"];
const MATCH_TYPE_LABEL = { priority: "빠른배정", compare: "비교선정", direct: "지정배정" };

const formatPriceLine = (order) => {
  const amt = Number(order.b2bPriceAmount) || 0;
  const unit = order.b2bPriceType === "hpoint" ? "P" : "원";
  const valueText = amt > 0 ? ` ${amt.toLocaleString()}${unit}` : "";
  if (order.b2bPriceType && PRICE_TYPE_LABEL[order.b2bPriceType]) {
    return `${PRICE_TYPE_LABEL[order.b2bPriceType]}${valueText}`;
  }
  return order.price || "-";
};

const formatChatTime = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "방금";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

/* 탭 내장용 콘텐츠 컴포넌트 */
export const MyOrdersContent = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const uid = user?.uid || userData?.uid || user?.USERS_ID;
  const myName = userData?.nickname || userData?.name || "사용자";
  const [activeTab, setActiveTab] = useState("전체");
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatMap, setChatMap] = useState({});
  const [activePeriod, setActivePeriod] = useState("전체");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [viewMode, setViewMode] = useState("list"); // "list" | "calendar"
  const [cancelReqOpen, setCancelReqOpen] = useState(null); // { orderId } | null
  const [cancelReqReason, setCancelReqReason] = useState("");
  const [cancelReqDetail, setCancelReqDetail] = useState("");
  const [priceNotifyOpen, setPriceNotifyOpen] = useState(null); // { order } | null — 현장견적가 통보
  const [notifyPrice, setNotifyPrice] = useState("");
  const [notifyMsg, setNotifyMsg] = useState("");

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const [given, received, applied] = await Promise.all([
          getOrdersByUser(uid),
          getOrdersByMatchedPro(uid),
          getOrdersByApplicant(uid), // 비교선정 지원오더 (선정 전에도 노출)
        ]);
        if (!cancelled) {
          // 준 일감 + 받은 일감 + 지원한 일감 합치고 중복 제거 후 최신순 정렬
          const merged = [...given, ...received, ...applied];
          const unique = merged.filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i);
          unique.sort((a, b) => {
            const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return tb - ta;
          });
          setAllOrders(unique);
        }
      } catch (err) {
        console.error("오더 조회 실패:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  // 채팅방 실시간 구독 → orderId별 배열 매핑
  useEffect(() => {
    if (!uid) return;
    return subscribeChatRooms(uid, (rooms) => {
      const map = {};
      rooms.forEach((r) => {
        if (r.orderId) {
          // 상대방 이름 추출
          const otherUid = (r.participants || []).find((p) => p !== uid);
          const otherName = otherUid && r.participantNames ? r.participantNames[otherUid] : "프로";
          if (!map[r.orderId]) map[r.orderId] = [];
          map[r.orderId].push({
            roomId: r.id,
            lastMessage: r.lastMessage || "",
            lastMessageAt: r.lastMessageAt,
            unreadCount: r.unreadCount?.[uid] || 0,
            otherName,
          });
        }
      });
      setChatMap(map);

      // 채팅방에 있는 오더 중 allOrders에 없는 것 추가 조회 (내가 견적 보낸 오더)
      const missingIds = Object.keys(map).filter((oid) => !allOrders.find((o) => o.id === oid));
      if (missingIds.length > 0) {
        Promise.all(missingIds.map((oid) => getOrderById(oid))).then((results) => {
          const valid = results.filter(Boolean);
          if (valid.length > 0) {
            setAllOrders((prev) => {
              const merged = [...prev, ...valid];
              const unique = merged.filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i);
              unique.sort((a, b) => {
                const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return tb - ta;
              });
              return unique;
            });
          }
        });
      }
    });
  }, [uid]);

  const periodFiltered = allOrders.filter((o) => matchPeriod(o.createdAt, activePeriod, dateRange));
  const filtered = activeTab === "전체" ? periodFiltered : periodFiltered.filter((o) => normalizeStatus(o.orderStatus) === activeTab);

  const submitCancelRequest = async () => {
    if (!cancelReqReason) { alert("사유를 선택해주세요"); return; }
    try {
      const reasonText = cancelReqReason === "상세사유 입력" ? (cancelReqDetail.trim() || "상세사유") : cancelReqReason;
      const order = allOrders.find((o) => o.id === cancelReqOpen.orderId);
      // 자유취소(의뢰인 확정 A-2): 접수자 승인 게이트 없이 홈프로가 즉시 취소 처리
      await updateOrderStatus(cancelReqOpen.orderId, "취소", { cancelReason: reasonText, cancelledBy: uid, cancelledByRole: "홈프로" });
      await addOrderLog(cancelReqOpen.orderId, { type: "cancel", message: `홈프로가 취소 (사유: ${reasonText})`, byUid: uid, byName: myName, byRole: "홈프로" });
      if (order) {
        await notifyAndChat({ ...order, matchedProUid: order.createdBy }, {
          title: "오더 취소",
          body: `홈프로가 오더를 취소했습니다. 사유: ${reasonText}`,
          type: "order_cancelled",
          chatText: `홈프로가 오더를 취소했습니다.\n사유: ${reasonText}`,
          chatType: "cancelled",
        });
      }
      setAllOrders((prev) => prev.map((o) => o.id === cancelReqOpen.orderId ? { ...o, orderStatus: "취소", cancelReason: reasonText } : o));
      setCancelReqOpen(null);
      setCancelReqReason("");
      setCancelReqDetail("");
      alert("오더를 취소했습니다");
    } catch (e) {
      alert("취소 실패: " + (e.message || e));
    }
  };

  // 수락자 취소요청에 대한 접수자 알림 + 채팅 시스템메시지 (A안 승인형)
  const notifyAndChat = async (order, { title, body, type, chatText, chatType }) => {
    try {
      const { collection: col, addDoc: add, serverTimestamp: ts } = await import("firebase/firestore");
      const { db } = await import("../../api/config");
      if (order.matchedProUid) {
        await add(col(db, "notifications"), {
          targetUids: [order.matchedProUid], title, body, type,
          data: { orderId: order.id }, read: false, sent: false, createdAt: ts(),
        });
      }
      const rooms = chatMap[order.id] || [];
      for (const r of rooms) {
        try { await sendSystemMessage(r.roomId, { text: chatText, type: chatType || "system" }); } catch (_) {}
      }
    } catch (_) {}
  };

  // (자유취소 전환: 접수자 승인/반려 게이트 제거 — handleApproveCancel/handleRejectCancel 삭제)

  // 견적가 통보 (홈프로 → 접수자). 상태는 유지, 정보만 전달.
  //  - 빠른배정: 배정된 1명이 통보 (onsiteQuotedPrice)
  //  - 비교선정: 지원자가 통보 (applicant 문서 + applicantQuotes 맵)
  const submitPriceNotify = async () => {
    const order = priceNotifyOpen?.order;
    if (!order) return;
    const priceNum = Number(notifyPrice) || 0;
    if (priceNum <= 0) { alert("견적가를 입력해주세요"); return; }
    const isApplicant = !!priceNotifyOpen?.isApplicant;
    try {
      if (isApplicant) {
        await notifyApplicantPrice(order.id, uid, priceNum, notifyMsg.trim());
        await notifyAndChat({ ...order, matchedProUid: order.createdBy }, {
          title: "견적가 도착",
          body: `지원 홈프로가 견적가 ${priceNum.toLocaleString()}원을 통보했습니다.`,
          type: "applicant_quote",
          chatText: `견적가가 통보되었습니다.\n금액: ${priceNum.toLocaleString()}원`,
          chatType: "onsite_quote",
        });
        setAllOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, applicantQuotes: { ...(o.applicantQuotes || {}), [uid]: priceNum } } : o));
      } else {
        await notifyOnsitePrice(order.id, priceNum, notifyMsg.trim());
        await notifyAndChat({ ...order, matchedProUid: order.createdBy }, {
          title: "견적가 도착",
          body: `견적가 ${priceNum.toLocaleString()}원이 통보되었습니다.`,
          type: "onsite_quote",
          chatText: `견적가가 수신되었습니다.\n금액: ${priceNum.toLocaleString()}원${notifyMsg.trim() ? `\n${notifyMsg.trim()}` : ""}`,
          chatType: "onsite_quote",
        });
        setAllOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, onsiteQuotedPrice: priceNum, onsiteQuoteMessage: notifyMsg.trim() } : o));
      }
      await addOrderLog(order.id, { type: "quote", message: `견적가 통보 ${priceNum.toLocaleString()}원`, byUid: uid, byName: myName, byRole: "홈프로" });
      setPriceNotifyOpen(null);
      setNotifyPrice("");
      setNotifyMsg("");
      alert("견적가를 통보했습니다");
    } catch (err) {
      alert("통보 실패: " + (err.message || err));
    }
  };

  const handleStatusChange = async (e, orderId, newStatus) => {
    e.stopPropagation();
    const label = newStatus === "취소" ? "취소하시겠습니까?\n취소 후에는 되돌릴 수 없습니다." : `상태를 "${newStatus}"(으)로 변경하시겠습니까?`;
    if (!window.confirm(label)) return;
    try {
      await updateOrderStatus(orderId, newStatus);
      const o = allOrders.find((x) => x.id === orderId);
      const role = o && o.createdBy === uid ? "접수자" : "홈프로";
      await addOrderLog(orderId, { type: "status", message: `상태 변경 → ${newStatus}`, byUid: uid, byName: myName, byRole: role });
      setAllOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, orderStatus: newStatus } : o));
    } catch (e) {
      alert("상태 변경에 실패했습니다.");
    }
  };

  return (
    <PageWrap>
        {/* 지난오더조회 + 뷰 토글 */}
        <PeriodRow>
          <PeriodSelect value={activePeriod} onChange={(e) => { setActivePeriod(e.target.value); setDateRange({ start: "", end: "" }); }}>
            {PERIOD_OPTIONS.map((p) => <option key={p} value={p}>{p === "전체" ? "지난오더 조회" : p}</option>)}
          </PeriodSelect>
          <DateRangeInput type="date" value={dateRange.start} onChange={(e) => setDateRange((r) => ({ ...r, start: e.target.value }))} />
          <DateRangeInput type="date" value={dateRange.end} onChange={(e) => setDateRange((r) => ({ ...r, end: e.target.value }))} />
          <ViewToggleBtn $active={viewMode === "list"} onClick={() => setViewMode("list")}>
            <IoListOutline size={16} />
          </ViewToggleBtn>
          <ViewToggleBtn $active={viewMode === "calendar"} onClick={() => setViewMode("calendar")}>
            <IoCalendarOutline size={16} />
          </ViewToggleBtn>
        </PeriodRow>

        {/* 상태 필터 탭 */}
        <TabRow>
          {STATUS_TABS.map((tab) => {
            const count = tab === "전체" ? periodFiltered.length : periodFiltered.filter((o) => normalizeStatus(o.orderStatus) === tab).length;
            return (
              <TabItem key={tab} $active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                <TabCount $active={activeTab === tab}>{count}</TabCount>
                <TabLabel>{tab}</TabLabel>
              </TabItem>
            );
          })}
        </TabRow>
        <TabDescWrap>
          <TabDescArrow $idx={STATUS_TABS.indexOf(activeTab)} />
          <TabDesc>{STATUS_DESC[activeTab]}</TabDesc>
        </TabDescWrap>

        {/* 달력 뷰 (월 단위) */}
        {viewMode === "calendar" ? (
          <CalendarView orders={filtered} navigate={navigate} />
        ) : (
        <>
        {/* 오더 리스트 */}
        {loading ? (
          <EmptyWrap>
            <EmptyText>불러오는 중...</EmptyText>
          </EmptyWrap>
        ) : filtered.length === 0 ? (
          <EmptyWrap>
            <EmptyText>해당 상태의 오더가 없어요.</EmptyText>
          </EmptyWrap>
        ) : (
          filtered.map((order) => {
            const cat = CATEGORIES.find((c) => c.id === order.categoryId);
            const displayStatus = normalizeStatus(order.orderStatus);
            const st = STATUS_STYLE[displayStatus] || STATUS_STYLE["등록"];
            const chats = chatMap[order.id] || [];
            return (
              <OrderCard
                key={order.id}
                onClick={() => navigate(`/order/detail/${order.id}`, { state: { order, category: cat } })}
              >
                <CardTop>
                  <CardTopLeft>
                    <StatusBadge $bg={st.bg} $color={st.color}>{displayStatus}</StatusBadge>
                    {order.createdBy === uid
                      ? <RoleTag $type="request">내가 요청</RoleTag>
                      : <RoleTag $type="support">{PRO_ROLE_TAG_BY_MATCH[order.matchType] || "견적 지원"}</RoleTag>
                    }
                  </CardTopLeft>
                  <OrderDate>{formatOrderTime(order.createdAt)}</OrderDate>
                </CardTop>
                <CardTitle>{order.title}</CardTitle>
                <CardBottom>
                  <BottomLeft>
                    <BottomText>{order.location}</BottomText>
                    <BottomText>{order.writer}</BottomText>
                    <BottomText>{MATCH_TYPE_LABEL[order.matchType] || ""}</BottomText>
                  </BottomLeft>
                  <PriceText>{formatPriceLine(order)}</PriceText>
                </CardBottom>

                {/* 견적가 통보 내역 (배정 상태 + 통보됨) */}
                {UNPRICED_TYPES.includes(order.b2bPriceType) && order.onsiteQuotedPrice > 0 && displayStatus === "배정" && (
                  <OnsitePriceBox onClick={(e) => e.stopPropagation()}>
                    💰 통보된 견적가 <b>{Number(order.onsiteQuotedPrice).toLocaleString()}원</b>
                    {order.onsiteQuoteMessage ? <div style={{ marginTop: 4, color: THEME.muted }}>{order.onsiteQuoteMessage}</div> : null}
                  </OnsitePriceBox>
                )}

                {/* 프로별 채팅 미리보기 목록 */}
                {chats.length > 0 && (
                  <ChatListWrap>
                    <ChatListTitle>
                      {order.createdBy === uid
                        ? `견적 받은 프로 ${chats.length}명`
                        : "견적 대화"
                      }
                    </ChatListTitle>
                    {chats.map((chat) => {
                      const hasUnread = chat.unreadCount > 0;
                      return (
                        <ChatPreviewRow key={chat.roomId} $unread={hasUnread} onClick={(e) => { e.stopPropagation(); navigate(`/chat/${chat.roomId}`); }}>
                          <ChatLeft>
                            <IoChatbubbleEllipsesOutline size={14} color={hasUnread ? THEME.primary : THEME.muted} />
                            <ChatProName $unread={hasUnread}>{chat.otherName}</ChatProName>
                            <ChatMsg $unread={hasUnread}>{chat.lastMessage}</ChatMsg>
                          </ChatLeft>
                          <ChatRight>
                            <ChatTime>{formatChatTime(chat.lastMessageAt)}</ChatTime>
                            {hasUnread
                              ? <UnreadBadge>{chat.unreadCount > 99 ? "99+" : chat.unreadCount}</UnreadBadge>
                              : <ReadLabel>읽음</ReadLabel>
                            }
                          </ChatRight>
                        </ChatPreviewRow>
                      );
                    })}
                  </ChatListWrap>
                )}

                {/* 상태 변경 버튼 */}
                {displayStatus === "배정" && (
                  <ActionRow>
                    {order.createdBy === uid && <ActionBtn $variant="danger" onClick={(e) => handleStatusChange(e, order.id, "취소")}>취소</ActionBtn>}
                    {order.matchedProUid === uid && (
                      <>
                        {/* 견적가는 1회만 통보 (의뢰인 확정: 수정·재통보 불가) — 미통보 시에만 버튼 노출 */}
                        {UNPRICED_TYPES.includes(order.b2bPriceType) && !order.onsiteQuotedPrice && (
                          <ActionBtn $variant="primary" onClick={(e) => { e.stopPropagation(); setPriceNotifyOpen({ order }); setNotifyPrice(""); setNotifyMsg(""); }}>
                            견적가 통보
                          </ActionBtn>
                        )}
                        <ActionBtn $variant="success" onClick={(e) => handleStatusChange(e, order.id, "완료")}>작업완료</ActionBtn>
                        <ActionBtn $variant="danger" onClick={(e) => { e.stopPropagation(); setCancelReqOpen({ orderId: order.id }); }}>취소</ActionBtn>
                      </>
                    )}
                  </ActionRow>
                )}
                {displayStatus === "선정대기" && order.createdBy === uid && (
                  <ActionRow>
                    <ActionBtn $variant="primary" onClick={(e) => { e.stopPropagation(); navigate(`/order/detail/${order.id}`, { state: { order, category: cat } }); }}>지원자 보기</ActionBtn>
                  </ActionRow>
                )}
                {displayStatus === "접수" && order.createdBy === uid && (
                  <ActionRow>
                    <ActionBtn $variant="warning" onClick={(e) => { e.stopPropagation(); navigate("/order/create", { state: { order } }); }}>수정</ActionBtn>
                    <ActionBtn $variant="warning" onClick={(e) => handleStatusChange(e, order.id, "대기")}>대기</ActionBtn>
                    <ActionBtn $variant="danger" onClick={(e) => handleStatusChange(e, order.id, "취소")}>취소</ActionBtn>
                  </ActionRow>
                )}
                {displayStatus === "대기" && order.createdBy === uid && (
                  <ActionRow>
                    <ActionBtn $variant="primary" onClick={(e) => handleStatusChange(e, order.id, "접수")}>재접수</ActionBtn>
                    <ActionBtn $variant="warning" onClick={(e) => { e.stopPropagation(); navigate("/order/create", { state: { order } }); }}>수정</ActionBtn>
                  </ActionRow>
                )}
                {/* 비교선정 지원자(선정 전) — 현장 확인 후 견적가 통보 (1회) */}
                {order.createdBy !== uid && order.matchType === "compare" && UNPRICED_TYPES.includes(order.b2bPriceType)
                  && (order.applicantUids || []).includes(uid) && order.matchedProUid !== uid
                  && (displayStatus === "접수" || displayStatus === "선정대기") && (
                  <ActionRow>
                    {!order.applicantQuotes?.[uid] ? (
                      <ActionBtn $variant="primary" onClick={(e) => { e.stopPropagation(); setPriceNotifyOpen({ order, isApplicant: true }); setNotifyPrice(""); setNotifyMsg(""); }}>견적가 통보</ActionBtn>
                    ) : (
                      <PriceNoticeInline>내 견적가 {Number(order.applicantQuotes[uid]).toLocaleString()}원 통보됨</PriceNoticeInline>
                    )}
                  </ActionRow>
                )}
              </OrderCard>
            );
          })
        )}
        </>
        )}

        {/* 홈프로 취소요청 사유 모달 */}
        {cancelReqOpen && (
          <ModalOverlay onClick={() => setCancelReqOpen(null)}>
            <ModalSheet onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>취소 사유</ModalTitle>
                <ModalClose onClick={() => setCancelReqOpen(null)}>
                  <IoCloseOutline size={22} />
                </ModalClose>
              </ModalHeader>
              <ReasonList>
                {CANCEL_REQ_REASONS.map((r) => (
                  <ReasonRow key={r} $selected={cancelReqReason === r} onClick={() => setCancelReqReason(r)}>
                    <ReasonRadio $selected={cancelReqReason === r} />
                    <ReasonLabel>{r}</ReasonLabel>
                  </ReasonRow>
                ))}
              </ReasonList>
              {cancelReqReason === "상세사유 입력" && (
                <DetailInput
                  placeholder="사유를 입력해주세요"
                  value={cancelReqDetail}
                  onChange={(e) => setCancelReqDetail(e.target.value.slice(0, 200))}
                  rows={3}
                />
              )}
              <ConfirmBtn onClick={submitCancelRequest} disabled={!cancelReqReason}>취소하기</ConfirmBtn>
            </ModalSheet>
          </ModalOverlay>
        )}

        {/* 현장견적가 통보 모달 (배정된 수락자 전용) */}
        {priceNotifyOpen && (
          <ModalOverlay onClick={() => setPriceNotifyOpen(null)}>
            <ModalSheet onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>견적가 통보</ModalTitle>
                <ModalClose onClick={() => setPriceNotifyOpen(null)}>
                  <IoCloseOutline size={22} />
                </ModalClose>
              </ModalHeader>
              <NotifyHint>현장 확인 후 산정한 견적가를 접수자에게 통보합니다.{"\n"}한 번 통보하면 수정할 수 없으니 신중히 입력해 주세요.</NotifyHint>
              <PriceInputRow>
                <PriceInput
                  inputMode="numeric"
                  placeholder="0"
                  value={notifyPrice ? Number(notifyPrice).toLocaleString() : ""}
                  onChange={(e) => setNotifyPrice(e.target.value.replace(/[^0-9]/g, ""))}
                />
                <PriceUnit>원</PriceUnit>
              </PriceInputRow>
              <DetailInput
                placeholder="견적 내역·조건 등을 함께 전달할 수 있어요 (선택)"
                value={notifyMsg}
                onChange={(e) => setNotifyMsg(e.target.value.slice(0, 200))}
                rows={3}
              />
              <ConfirmBtn onClick={submitPriceNotify} disabled={!notifyPrice}>견적가 통보하기</ConfirmBtn>
            </ModalSheet>
          </ModalOverlay>
        )}
    </PageWrap>
  );
};

/* ─── 달력 뷰 (월 단위) ─── */
const CalendarView = ({ orders, navigate }) => {
  const [cursor, setCursor] = useState(new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const ordersByDay = {};
  orders.forEach((o) => {
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!ordersByDay[day]) ordersByDay[day] = [];
      ordersByDay[day].push(o);
    }
  });

  return (
    <CalWrap>
      <CalHeader>
        <CalNavBtn onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</CalNavBtn>
        <CalTitle>{year}년 {month + 1}월</CalTitle>
        <CalNavBtn onClick={() => setCursor(new Date(year, month + 1, 1))}>›</CalNavBtn>
      </CalHeader>
      <CalGrid>
        {["일","월","화","수","목","금","토"].map((w) => <CalWeekCell key={w}>{w}</CalWeekCell>)}
        {cells.map((d, i) => (
          <CalDayCell key={i} $empty={!d}>
            {d && (
              <>
                <CalDayNum>{d}</CalDayNum>
                {(ordersByDay[d] || []).slice(0, 2).map((o) => (
                  <CalDot key={o.id} onClick={() => navigate(`/order/detail/${o.id}`, { state: { order: o } })}>
                    {o.title?.slice(0, 6) || "오더"}
                  </CalDot>
                ))}
                {(ordersByDay[d]?.length || 0) > 2 && <CalDotMore>+{ordersByDay[d].length - 2}</CalDotMore>}
              </>
            )}
          </CalDayCell>
        ))}
      </CalGrid>
    </CalWrap>
  );
};

const MyOrdersPage = () => (
  <SimpleBackLayout NAME="내 요청" hideFooter>
    <MyOrdersContent />
  </SimpleBackLayout>
);

export const MyOrdersFooterPage = () => (
  <MainListLayout NAME="내 요청" footerType={MOBILEMAINMENU.MYORDERS} hideBack>
    <MyOrdersContent />
  </MainListLayout>
);

export default MyOrdersPage;

/* ===================== styles ===================== */

const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: ${THEME.background};
`;

const TabRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 12px 12px 8px;
`;

const TabItem = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 10px 0;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  border: 1px solid ${({ $active }) => $active ? THEME.primary : "#EEEEED"};
  cursor: pointer;
  transition: all 0.15s;
  &:active { transform: scale(0.96); }
`;

const TabDescWrap = styled.div`
  position: relative;
  margin: 6px 12px 8px;
`;

const TabDescArrow = styled.div`
  position: absolute;
  top: -6px;
  left: calc(${({ $idx }) => {
    const col = $idx < 4 ? $idx : $idx - 4;
    return col * 100 / 4 + 100 / 8;
  }}% - 6px);
  width: 12px;
  height: 12px;
  background: ${THEME.primary};
  transform: rotate(45deg);
  border-radius: 2px;
  transition: left 0.2s ease;
`;

const TabDesc = styled.div`
  font-size: 12px;
  color: #fff;
  text-align: left;
  padding: 10px 14px;
  background: ${THEME.primary};
  border-radius: 10px;
  line-height: 1.5;
  white-space: pre-line;
  min-height: 56px;
  display: flex;
  align-items: center;
`;

const TabCount = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ $active }) => $active ? THEME.primary : THEME.muted};
  line-height: 1;
`;

const TabLabel = styled.div`
  font-size: 12px;
  color: ${THEME.muted};
  margin-top: 4px;
  font-weight: 500;
`;

const OrderCard = styled.div`
  background: ${THEME.surface};
  margin: 6px 12px;
  padding: 16px;
  border-radius: 4px;
  border: 1px solid ${THEME.border};
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const CardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const CardTopLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const RoleTag = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: ${({ $type }) => $type === "request" ? "#EFF6FF" : "#FEF3C7"};
  color: ${({ $type }) => $type === "request" ? "#3B82F6" : "#B45309"};
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 400;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`;

const OrderDate = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const CardTitle = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.text};
  letter-spacing: -0.02em;
  margin-bottom: 8px;
`;

const TagRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
`;

const Tag = styled.span`
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 400;
  background: ${THEME.background};
  color: ${THEME.textSecondary};
`;

const MatchTag = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.purple};
`;

const CardBottom = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid ${THEME.border};
`;

const BottomLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const BottomText = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const PriceText = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.primary};
`;

const ChatListWrap = styled.div`
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid ${THEME.border};
`;

const ChatListTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${THEME.muted};
  margin-bottom: 4px;
`;

const ChatPreviewRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px;
  gap: 8px;
  cursor: pointer;
  border-radius: 6px;
  background: ${({ $unread }) => $unread ? "#F8F6FF" : "transparent"};
  &:not(:last-child) {
    border-bottom: 1px solid ${THEME.border};
  }
  &:active { opacity: 0.7; }
`;

const ChatLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
`;

const ChatProName = styled.span`
  font-size: 13px;
  font-weight: ${({ $unread }) => $unread ? 700 : 500};
  color: ${({ $unread }) => $unread ? THEME.text : THEME.textSecondary};
  flex-shrink: 0;
`;

const ChatMsg = styled.div`
  font-size: 13px;
  font-weight: ${({ $unread }) => $unread ? 600 : 400};
  color: ${({ $unread }) => $unread ? THEME.text : THEME.muted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ChatRight = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`;

const ChatTime = styled.div`
  font-size: 11px;
  color: ${THEME.muted};
`;

const UnreadBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 11px;
  font-weight: 600;
`;

const ReadLabel = styled.span`
  font-size: 10px;
  color: ${THEME.muted};
`;

const ActionRow = styled.div`
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid ${THEME.border};
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const CancelReqBanner = styled.div`
  margin-top: 10px;
  padding: 12px 14px;
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 10px;
`;

const CancelReqText = styled.div`
  font-size: 13px;
  color: #92400E;
  line-height: 1.5;
  b { color: #B45309; font-weight: 700; }
`;

const CancelReqReason = styled.div`
  font-size: 12px;
  color: #B45309;
  margin-top: 4px;
`;

const CancelReqBtns = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
`;

const VARIANT_COLORS = {
  danger: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
  primary: "#7C5CFC",
};

const ActionBtn = styled.button`
  border: 1px solid ${({ $variant }) => VARIANT_COLORS[$variant] || THEME.primary};
  background: ${({ $variant }) => (VARIANT_COLORS[$variant] || THEME.primary) + "10"};
  color: ${({ $variant }) => VARIANT_COLORS[$variant] || THEME.primary};
  font-size: 13px;
  font-weight: 500;
  padding: 6px 16px;
  border-radius: 8px;
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

const EmptyWrap = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 12px;
`;

const EmptyText = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.muted};
`;

/* ─── 지난오더조회 row + 뷰 토글 ─── */
const PeriodRow = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 8px 12px 4px;
`;

const PeriodSelect = styled.select`
  font-size: 12px;
  padding: 6px 8px;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  background: #fff;
  color: ${THEME.text};
  flex: 1.2;
  min-width: 0;
`;

const DateRangeInput = styled.input`
  font-size: 11px;
  padding: 6px 6px;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  background: #fff;
  color: ${THEME.text};
  flex: 1;
  min-width: 0;
`;

const ViewToggleBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  background: ${(p) => p.$active ? THEME.primary : "#fff"};
  color: ${(p) => p.$active ? "#fff" : THEME.muted};
  cursor: pointer;
`;

/* ─── 취소요청 모달 ─── */
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
`;

const ModalSheet = styled.div`
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 16px 20px 24px;
  box-sizing: border-box;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const ModalTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ModalClose = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${THEME.muted};
`;

const ReasonList = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 300px;
  overflow-y: auto;
`;

const ReasonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 4px;
  border-bottom: 1px solid ${THEME.border};
  cursor: pointer;
  background: ${(p) => p.$selected ? "#F7F4FF" : "transparent"};
`;

const ReasonRadio = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid ${(p) => p.$selected ? THEME.primary : THEME.border};
  background: ${(p) => p.$selected ? THEME.primary : "transparent"};
  flex-shrink: 0;
`;

const ReasonLabel = styled.div`
  font-size: 14px;
  color: ${THEME.text};
`;

const DetailInput = styled.textarea`
  width: 100%;
  margin-top: 12px;
  padding: 10px 12px;
  font-size: 13px;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  resize: none;
  box-sizing: border-box;
  font-family: inherit;
`;

const NotifyHint = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
  line-height: 1.5;
  margin-bottom: 12px;
  white-space: pre-line;
`;

const PriceInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PriceInput = styled.input`
  flex: 1;
  padding: 12px 14px;
  font-size: 18px;
  font-weight: 700;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  box-sizing: border-box;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  &:focus { border-color: ${THEME.primary}; }
  &::placeholder { color: ${THEME.muted}; font-weight: 400; }
`;

const PriceUnit = styled.span`
  font-size: 16px;
  color: ${THEME.text};
  flex-shrink: 0;
`;

const PriceNoticeInline = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.primary};
  padding: 6px 4px;
`;

const OnsitePriceBox = styled.div`
  margin-top: 10px;
  padding: 10px 14px;
  background: #F3F0FF;
  border: 1px solid #E0D7FF;
  border-radius: 10px;
  font-size: 13px;
  color: ${THEME.text};
  b { color: ${THEME.primary}; font-weight: 700; }
`;

const ConfirmBtn = styled.button`
  width: 100%;
  margin-top: 16px;
  padding: 14px;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: ${(p) => p.disabled ? THEME.muted : THEME.primary};
  border: none;
  border-radius: 10px;
  cursor: ${(p) => p.disabled ? "not-allowed" : "pointer"};
`;

/* ─── 달력 뷰 ─── */
const CalWrap = styled.div`
  margin: 8px 12px;
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
`;

const CalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const CalNavBtn = styled.button`
  width: 28px;
  height: 28px;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  background: #fff;
  font-size: 16px;
  cursor: pointer;
  color: ${THEME.text};
`;

const CalTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
`;

const CalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
`;

const CalWeekCell = styled.div`
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: ${THEME.muted};
  padding: 6px 0;
`;

const CalDayCell = styled.div`
  min-height: 56px;
  padding: 4px;
  border-radius: 6px;
  background: ${(p) => p.$empty ? "transparent" : "#F7F8FA"};
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const CalDayNum = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${THEME.text};
`;

const CalDot = styled.div`
  font-size: 9px;
  background: ${THEME.primary};
  color: #fff;
  padding: 1px 4px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CalDotMore = styled.div`
  font-size: 9px;
  color: ${THEME.muted};
  text-align: center;
`;
