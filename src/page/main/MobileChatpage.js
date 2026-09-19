/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import { IoChatbubbleEllipsesOutline, IoPersonCircleOutline, IoPeopleOutline } from "react-icons/io5";
import { THEME, CATEGORIES } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { subscribeChatRooms } from "../../service/ChatService";
import { getOrderById } from "../../service/OrderService";
import { format, isToday, isYesterday } from "date-fns";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import { MOBILEMAINMENU } from "../../utility/constants";
import usePcWide from "../../hooks/usePcWide";

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isToday(date)) return format(date, "a h:mm").replace("AM", "오전").replace("PM", "오후");
  if (isYesterday(date)) return "어제";
  return format(date, "M/d");
};

const MobileChatpage = () => {
  const navigate = useNavigate();
  const pcWide = usePcWide();
  const { pathname } = useLocation(); // PC 2단에서 열린 방을 목록에 표시하려고 주소 변화를 따라간다
  const { userData } = useAuth();
  const [rooms, setRooms] = useState([]);

  const [loading, setLoading] = useState(true);
  const [focusedRoom, setFocusedRoom] = useState(null);
  const [activeTab, setActiveTab] = useState("general"); // 명세: 일반/오픈 2탭
  const [orderMap, setOrderMap] = useState({}); // orderId -> order (종목명 표시용)
  const [normalCat, setNormalCat] = useState("전체");

  const myUid = userData?.uid;

  useEffect(() => {
    if (!myUid) return;
    return subscribeChatRooms(myUid, (list) => {
      setRooms(list);
      setLoading(false);
    });
  }, [myUid]);

  // 오더 연동 채팅방의 종목명 표시를 위해 오더 배치 조회
  useEffect(() => {
    const ids = [...new Set(rooms.filter((r) => r.orderId).map((r) => r.orderId))];
    const missing = ids.filter((id) => !orderMap[id]);
    if (missing.length === 0) return;
    Promise.all(missing.map((id) => getOrderById(id).catch(() => null))).then((list) => {
      setOrderMap((prev) => {
        const next = { ...prev };
        list.forEach((o) => { if (o) next[o.id] = o; });
        return next;
      });
    });
  }, [rooms]);

  // 오더 연동 방의 종목명 (카테고리)
  const getOrderCategoryName = (orderId) => {
    const o = orderMap[orderId];
    if (!o) return "";
    const cat = CATEGORIES.find((c) => c.id === o.categoryId);
    return cat?.name || o.subcategory || "오더";
  };

  // 일반 탭 카테고리 분류 (roomType 기반)
  // 탭 분류 (대표 9/10 스샷: 전체·오더·거래장터·기술전수·공동중개)
  const catOfRoom = (r) => {
    if (r.roomType === "quote" || r.orderId) return "오더";
    if (r.roomType === "training") return "기술전수";
    if (r.roomType === "supply" || r.roomType === "marketplace") return "거래장터";
    if (r.roomType === "brokerage") return "공동중개";
    return "기타";
  };
  // 오더 방은 오더명이 제목, 그 아래 상대 이름·마지막 대화 (대표 9/10)
  const getOrderTitle = (orderId) => orderMap[orderId]?.title || "";

  const getRoomDisplayName = (room) => {
    if (room.roomName) return room.roomName;
    const names = room.participantNames || {};
    const otherUid = (room.participants || []).find((uid) => uid !== myUid);
    return names[otherUid] || "알 수 없음";
  };

  const getRoomAvatar = (room) => {
    const otherUid = (room.participants || []).find((uid) => uid !== myUid);
    const photos = room.participantPhotos || {};
    return photos[otherUid] || null;
  };

  const getUnread = (room) => {
    const counts = room.unreadCount || {};
    return counts[myUid] || 0;
  };

  // 오픈채팅은 삭제했다 (대표 지시 9/10) — 오더 채팅 + 일반 채팅만
  const normalRooms = rooms.filter((r) => r.roomType !== "open");
  const openRooms = [];

  const NORMAL_CATEGORIES = ["전체", "오더", "거래장터", "기술전수", "공동중개"];
  const OPEN_CATEGORIES = ["전체", "오더", "인력", "기술교육", "매매양도", "자재.장비"];
  const [openCat, setOpenCat] = useState("전체");

  const catStat = (c) => {
    const list = c === "전체" ? normalRooms : normalRooms.filter((r) => catOfRoom(r) === c);
    return { count: list.length, unread: list.some((r) => getUnread(r) > 0) };
  };

  const visibleRooms = activeTab === "open"
    ? (openCat === "전체" ? openRooms : openRooms.filter((r) => r.openCategory === openCat))
    : (normalCat === "전체" ? normalRooms : normalRooms.filter((r) => catOfRoom(r) === normalCat));

  return (
    <MainListLayout NAME="채팅" footerType={MOBILEMAINMENU.CHAT} hideBack hideActions>
      {activeTab === "open" ? (
        <CatTabRow>
          {OPEN_CATEGORIES.map((c) => (
            <CatTab key={c} $active={openCat === c} onClick={() => setOpenCat(c)}>
              {c}
            </CatTab>
          ))}
        </CatTabRow>
      ) : (
        <CatChipRow>
          {NORMAL_CATEGORIES.filter((c) => c !== "전체").map((c) => {
            const st = catStat(c);
            const on = normalCat === c;
            return (
              <CatChip key={c} $active={on} onClick={() => setNormalCat(on ? "전체" : c)}>
                {st.unread && <CatDot />}
                {c} <CatCount $active={on}>{st.count}</CatCount>
              </CatChip>
            );
          })}
        </CatChipRow>
      )}
      <RoomList>
        {loading ? (
          <EmptyState>
            <EmptyText>로딩 중...</EmptyText>
          </EmptyState>
        ) : visibleRooms.length === 0 ? (
          <EmptyState>
            <EmptyIcon><IoChatbubbleEllipsesOutline size={30} color={THEME.primary} /></EmptyIcon>
            {normalCat !== "전체" && normalRooms.length > 0 ? (
              <>
                <EmptyTitle>{normalCat} 대화는 아직 없어요</EmptyTitle>
                <EmptyText>다른 갈래에는 대화가 {normalRooms.length}개 있습니다.</EmptyText>
                <EmptyBtnRow>
                  <EmptyGhost type="button" onClick={() => setNormalCat("전체")}>전체 보기</EmptyGhost>
                </EmptyBtnRow>
              </>
            ) : (
              <>
                <EmptyTitle>아직 시작된 대화가 없어요</EmptyTitle>
                <EmptyText>오더를 접수하거나 맡으면 상대와 이야기할 방이 여기에 생깁니다.</EmptyText>
                <EmptyBtnRow>
                  <EmptyGhost type="button" onClick={() => navigate("/MobileMain")}>오더 둘러보기</EmptyGhost>
                  <EmptyPrimary type="button" onClick={() => navigate("/order/create")}>예약접수 하기</EmptyPrimary>
                </EmptyBtnRow>
              </>
            )}
          </EmptyState>
        ) : activeTab === "open" ? (
          visibleRooms.map((room) => {
            const memberCount = (room.participants || []).length;
            const joined = (room.participants || []).includes(myUid);
            return (
              <RoomItem key={room.id} onClick={() => handleEnterOpenRoom(room)}>
                <Avatar>
                  <IoPeopleOutline size={26} color={THEME.primary} />
                </Avatar>
                <RoomInfo>
                  <RoomNameRow>
                    <RoomName>{room.roomName || "오픈채팅방"}</RoomName>
                    {room.openCategory && <CatTag>{room.openCategory}</CatTag>}
                    {joined && <JoinedTag>참여중</JoinedTag>}
                  </RoomNameRow>
                  <LastMessage>{room.description || room.lastMessage || "새로 개설된 방이에요"}</LastMessage>
                </RoomInfo>
                <RoomMeta>
                  <MemberCount>
                    <IoPeopleOutline size={13} color={THEME.muted} /> {memberCount}
                  </MemberCount>
                  <RoomTime>{formatTime(room.lastMessageAt)}</RoomTime>
                </RoomMeta>
              </RoomItem>
            );
          })
        ) : (
          visibleRooms.map((room) => {
            const unread = getUnread(room);
            return (
              <RoomItem
                key={room.id}
                $focused={focusedRoom === room.id || (pcWide && pathname.startsWith(`/chat/${room.id}`))}
                onClick={() => {
                  // PC 는 목록 옆에 대화방이 바로 열리므로 한 번에 들어간다
                  if (pcWide || focusedRoom === room.id) {
                    navigate(`/chat/${room.id}`);
                  } else {
                    setFocusedRoom(room.id);
                  }
                }}
              >
                <Avatar>
                  {getRoomAvatar(room) ? (
                    <AvatarImg src={getRoomAvatar(room)} alt="" />
                  ) : (
                    <IoPersonCircleOutline size={56} color={THEME.muted} />
                  )}
                </Avatar>
                <RoomInfo>
                  <RoomTopLine>
                    <RoomKind
                      as={room.orderId && getOrderCategoryName(room.orderId) ? "button" : "span"}
                      onClick={(e) => {
                        if (!room.orderId || !getOrderCategoryName(room.orderId)) return;
                        e.stopPropagation(); navigate(`/order/detail/${room.orderId}`);
                      }}
                    >
                      {room.orderId && getOrderCategoryName(room.orderId)
                        ? getOrderCategoryName(room.orderId) + " ›"
                        : room.roomType === "brokerage" ? "공동중개" : "채팅"}
                    </RoomKind>
                    <RoomTime>{formatTime(room.lastMessageAt)}</RoomTime>
                  </RoomTopLine>
                  <RoomName>{room.orderId && getOrderTitle(room.orderId) ? getOrderTitle(room.orderId) : getRoomDisplayName(room)}</RoomName>
                  <RoomBottomLine>
                    <LastMessage>
                      {room.orderId && getOrderTitle(room.orderId) ? getRoomDisplayName(room) + " · " : ""}
                      {room.lastMessage || "대화를 시작해보세요"}
                    </LastMessage>
                    {unread > 0 && <UnreadBadge>{unread > 99 ? "99+" : unread}</UnreadBadge>}
                  </RoomBottomLine>
                </RoomInfo>
              </RoomItem>
            );
          })
        )}
      </RoomList>

      {/* 명세: 오픈채팅 신규 생성 기능 없음 — 구독회원은 운영 개설방에 참여만 가능 */}
    </MainListLayout>
  );
};

export default MobileChatpage;

/* ─── Styled Components ─── */


const RoomList = styled.div`
  padding: 0 12px;
  min-height: 320px;
`;

const CatChipRow = styled.div`
  display: flex;
  gap: 5px;
  padding: 12px;
  flex-wrap: nowrap;
  border-bottom: 1px solid ${THEME.border};
`;

const CatChip = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  padding: 10px 4px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
  background: ${({ $active }) => ($active ? `${THEME.primary}15` : THEME.surface)};
  color: ${({ $active }) => ($active ? THEME.primaryDark : "#2b2f36")};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  font-family: inherit;
  white-space: nowrap;
  cursor: pointer;
  &:active { opacity: 0.8; }
  &:focus { outline: none; }
`;

const CatCount = styled.b`
  font-weight: 700;
  color: ${({ $active }) => ($active ? THEME.primaryDark : THEME.muted)};
`;

const CatDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${THEME.button};
  flex-shrink: 0;
`;

const EmptyIcon = styled.div`
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: ${THEME.purpleLight};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EmptyTitle = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  word-break: keep-all;
`;

const EmptyBtnRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 6px;
`;

const EmptyGhost = styled.button`
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  color: ${THEME.text};
  font-size: 15px;
  font-family: inherit;
  cursor: pointer;
  &:focus { outline: none; }
`;

const EmptyPrimary = styled.button`
  padding: 12px 18px;
  border-radius: 8px;
  border: none;
  background: ${THEME.button};
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  &:focus { outline: none; }
`;

const CatTabRow = styled.div`
  display: flex;
  gap: 18px;
  padding: 0 12px;
  border-bottom: 1px solid ${THEME.border};
  overflow-x: auto;
  &::-webkit-scrollbar { display: none; }
  scrollbar-width: none;
`;

const CatTab = styled.button`
  flex-shrink: 0;
  padding: 11px 2px;
  margin-bottom: -1px;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? THEME.primary : "transparent")};
  background: none;
  font-size: 15px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ $active }) => ($active ? THEME.primary : THEME.muted)};
  cursor: pointer;
  white-space: nowrap;
  &:active { opacity: 0.7; }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 60px 24px;
`;

const EmptyText = styled.p`
  font-size: 16px;
  color: ${THEME.muted};
`;

const RoomItem = styled.div`
  display: flex;
  gap: 14px;
  padding: 14px 8px;
  border-bottom: 1px solid ${THEME.border};
  cursor: pointer;
  align-items: center;
  border-radius: 12px;
  background: ${({ $focused }) => ($focused ? THEME.background : "transparent")};
  transition: background 0.15s;
  &:last-child { border-bottom: none; }
  &:active { background: ${THEME.background}; }
`;

const Avatar = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${THEME.background};
`;

const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const RoomInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
`;

const RoomNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  min-width: 0;
`;

const RoomName = styled.p`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  margin: 0;
  line-height: 1.4;
  word-break: keep-all;
`;

const RoomTopLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const RoomKind = styled.span`
  font-size: 13px;
  color: ${THEME.muted};
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  cursor: ${({ as }) => (as === "button" ? "pointer" : "default")};
  white-space: nowrap;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  &:focus { outline: none; }
`;

const RoomBottomLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CatTag = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.primary};
  background: ${THEME.purpleLight};
  padding: 2px 8px;
  border-radius: 20px;
  flex-shrink: 0;
  white-space: nowrap;
`;

const OrderCatTag = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.primary};
  background: ${THEME.purpleLight || "#F3F0FF"};
  padding: 2px 8px;
  border-radius: 20px;
  flex-shrink: 0;
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

const JoinedTag = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.success};
  background: #ecfdf5;
  padding: 2px 8px;
  border-radius: 20px;
  flex-shrink: 0;
  white-space: nowrap;
`;

const MemberCount = styled.span`
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.muted};
`;

const OpenFab = styled.button`
  position: fixed;
  bottom: calc(70px + env(safe-area-inset-bottom, 0px));
  right: calc(50% - 163px);
  padding: 10px 18px;
  background: ${THEME.button};
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  cursor: pointer;
  z-index: 90;
  &:active { opacity: 0.85; }
`;

const SubName = styled.div` font-size: 14px; color: ${THEME.muted}; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; `;
const LastMessage = styled.p`
  font-size: 15px;
  color: ${THEME.muted};
  font-weight: 400;
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const RoomMeta = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
  align-self: flex-start;
  padding-top: 2px;
`;

const RoomTime = styled.span`
  font-size: 14px;
  color: ${THEME.muted};
  white-space: nowrap;
`;

const UnreadBadge = styled.span`
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  background: ${THEME.button};
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
`;
