/* eslint-disable */
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { CATEGORIES, THEME, COLLECTIONS } from "../../config/homeproConfig";
import { getOrdersByUser, getOrdersByMatchedPro, formatOrderTime, updateOrderStatus, getOrderById } from "../../service/OrderService";
import { subscribeChatRooms } from "../../service/ChatService";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import { MOBILEMAINMENU } from "../../utility/constants";
import { IoChatbubbleEllipsesOutline } from "react-icons/io5";

/* ─── 상태 필터 탭 ─── */
const STATUS_TABS = ["전체", "등록", "배정", "업체선택", "완료", "취소", "거부"];

const STATUS_DESC = {
  "전체": "내가 등록한 일감과 받은 일감을\n한눈에 볼 수 있어요.",
  "등록": "등록된 일감 중 아직 홈프로가 수락하지 않은\n대기 상태의 오더입니다.",
  "배정": "홈프로가 수락하여 진행 중인 오더입니다.\n일감을 준 프로는 취소, 받은 프로는 작업완료\n변경이 가능해요.",
  "업체선택": "다중비교호출로 지원자가 모집된 오더입니다.\n지원자 중 1명을 선정해 주세요.",
  "완료": "작업이 완료된 오더입니다.",
  "취소": "취소된 오더입니다.\n취소 후에는 되돌릴 수 없어요.",
  "거부": "거부 등록된 오더입니다.",
};

/* ─── 상태 배지 스타일 ─── */
const STATUS_STYLE = {
  "등록": { bg: "#3B82F6", color: "#fff" },
  "배정": { bg: "#7C5CFC", color: "#fff" },
  "업체선택": { bg: "#F59E0B", color: "#fff" },
  "완료": { bg: "#10B981", color: "#fff" },
  "취소": { bg: "#9CA3AF", color: "#fff" },
  "거부": { bg: "#EF4444", color: "#fff" },
  "대기": { bg: "#F97316", color: "#fff" },
};

// Firestore 상태값 → 표시 상태 매핑
const normalizeStatus = (s) => {
  if (s === "요청" || s === "접수") return "등록";
  if (s === "진행" || s === "결제") return "배정";
  if (s === "업체선택") return "업체선택";
  if (s === "거부") return "거부";
  return s; // 배정, 완료, 취소, 대기 등은 그대로
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
  const [activeTab, setActiveTab] = useState("전체");
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatMap, setChatMap] = useState({}); // orderId → [{ roomId, lastMessage, lastMessageAt, unreadCount, otherName }]

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const [given, received] = await Promise.all([
          getOrdersByUser(uid),
          getOrdersByMatchedPro(uid),
        ]);
        if (!cancelled) {
          // 준 일감 + 받은 일감 합치고 중복 제거 후 최신순 정렬
          const merged = [...given, ...received];
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

  const filtered = activeTab === "전체" ? allOrders : allOrders.filter((o) => normalizeStatus(o.orderStatus) === activeTab);

  const handleStatusChange = async (e, orderId, newStatus) => {
    e.stopPropagation();
    const label = newStatus === "취소" ? "취소하시겠습니까?\n취소 후에는 되돌릴 수 없습니다." : `상태를 "${newStatus}"(으)로 변경하시겠습니까?`;
    if (!window.confirm(label)) return;
    try {
      await updateOrderStatus(orderId, newStatus);
      setAllOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, orderStatus: newStatus } : o));
    } catch (e) {
      alert("상태 변경에 실패했습니다.");
    }
  };

  return (
    <PageWrap>
        {/* 상태 필터 탭 */}
        <TabRow>
          {STATUS_TABS.map((tab) => {
            const count = tab === "전체" ? allOrders.length : allOrders.filter((o) => normalizeStatus(o.orderStatus) === tab).length;
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
                      : <RoleTag $type="support">견적 지원</RoleTag>
                    }
                  </CardTopLeft>
                  <OrderDate>{formatOrderTime(order.createdAt)}</OrderDate>
                </CardTop>
                <CardTitle>{order.title}</CardTitle>
                <CardBottom>
                  <BottomLeft>
                    <BottomText>{order.location}</BottomText>
                    <BottomText>{order.writer}</BottomText>
                  </BottomLeft>
                  <PriceText>{order.price}</PriceText>
                </CardBottom>

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
                    {order.matchedProUid === uid && <ActionBtn $variant="success" onClick={(e) => handleStatusChange(e, order.id, "완료")}>작업완료</ActionBtn>}
                  </ActionRow>
                )}
                {displayStatus === "업체선택" && order.createdBy === uid && (
                  <ActionRow>
                    <ActionBtn $variant="primary" onClick={(e) => { e.stopPropagation(); navigate(`/order/detail/${order.id}`, { state: { order, category: cat } }); }}>지원자 보기</ActionBtn>
                  </ActionRow>
                )}
                {displayStatus === "등록" && order.createdBy === uid && (
                  <ActionRow>
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
              </OrderCard>
            );
          })
        )}

    </PageWrap>
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
