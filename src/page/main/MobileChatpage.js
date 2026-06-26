/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoChatbubbleEllipsesOutline, IoPersonCircleOutline, IoPeopleOutline } from "react-icons/io5";
import { THEME, CATEGORIES } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { subscribeChatRooms, subscribeOpenRooms, joinOpenRoom } from "../../service/ChatService";
import { getOrderById } from "../../service/OrderService";
import { format, isToday, isYesterday } from "date-fns";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isToday(date)) return format(date, "a h:mm").replace("AM", "오전").replace("PM", "오후");
  if (isYesterday(date)) return "어제";
  return format(date, "M/d");
};

const MobileChatpage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [openAll, setOpenAll] = useState([]);
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

  // 오픈채팅 둘러보기: 전체 공개방 구독 (참여 여부 무관)
  useEffect(() => {
    return subscribeOpenRooms((list) => setOpenAll(list));
  }, []);

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
  const catOfRoom = (r) => {
    if (r.roomType === "quote" || r.orderId) return "오더";
    if (r.roomType === "training") return "기술전수";
    if (r.roomType === "supply") return "자재.장비";
    return "기타";
  };

  const handleEnterOpenRoom = async (room) => {
    const joined = (room.participants || []).includes(myUid);
    if (!joined && myUid) {
      try {
        await joinOpenRoom(
          room.id,
          myUid,
          userData?.nickname || userData?.name || "익명",
          userData?.profileImage || userData?.photoURL || ""
        );
      } catch (e) {
        console.error("오픈채팅 입장 실패:", e);
      }
    }
    navigate(`/chat/${room.id}`);
  };

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

  // 일반 탭 = 오픈 제외 전부 (오더 채팅 + 일반 채팅 통합)
  const normalRooms = rooms.filter((r) => r.roomType !== "open");
  const openRooms = openAll; // 둘러보기: 전체 공개방

  const NORMAL_CATEGORIES = ["전체", "오더", "기술전수", "자재.장비", "기타"];
  const OPEN_CATEGORIES = ["전체", "오더", "인력", "기술교육", "매매양도", "자재.장비"];
  const [openCat, setOpenCat] = useState("전체");

  const visibleRooms = activeTab === "open"
    ? (openCat === "전체" ? openRooms : openRooms.filter((r) => r.openCategory === openCat))
    : (normalCat === "전체" ? normalRooms : normalRooms.filter((r) => catOfRoom(r) === normalCat));

  return (
    <MainListLayout NAME="채팅" footerType="CHAT" hideBack>
      <TabRow>
        <Tab $active={activeTab === "general"} onClick={() => setActiveTab("general")}>
          일반{normalRooms.length > 0 ? ` (${normalRooms.length})` : ""}
        </Tab>
        <Tab $active={activeTab === "open"} onClick={() => setActiveTab("open")}>
          오픈채팅{openRooms.length > 0 ? ` (${openRooms.length})` : ""}
        </Tab>
      </TabRow>
      {activeTab === "open" ? (
        <OpenCatRow>
          {OPEN_CATEGORIES.map((c) => (
            <OpenCatChip key={c} $active={openCat === c} onClick={() => setOpenCat(c)}>
              {c}
            </OpenCatChip>
          ))}
        </OpenCatRow>
      ) : (
        <OpenCatRow>
          {NORMAL_CATEGORIES.map((c) => (
            <OpenCatChip key={c} $active={normalCat === c} onClick={() => setNormalCat(c)}>
              {c}
            </OpenCatChip>
          ))}
        </OpenCatRow>
      )}
      <RoomList>
        {loading ? (
          <EmptyState>
            <EmptyText>로딩 중...</EmptyText>
          </EmptyState>
        ) : visibleRooms.length === 0 ? (
          <EmptyState>
            <IoChatbubbleEllipsesOutline size={40} color={THEME.muted} />
            <EmptyText>{activeTab === "open" ? "개설된 오픈채팅방이 없습니다" : "채팅방이 없습니다"}</EmptyText>
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
                $focused={focusedRoom === room.id}
                onClick={() => {
                  if (focusedRoom === room.id) {
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
                  <RoomNameRow>
                    <RoomName>{getRoomDisplayName(room)}</RoomName>
                    {room.orderId && getOrderCategoryName(room.orderId) && (
                      <OrderCatTag onClick={(e) => { e.stopPropagation(); navigate(`/order/detail/${room.orderId}`); }}>
                        {getOrderCategoryName(room.orderId)} ›
                      </OrderCatTag>
                    )}
                  </RoomNameRow>
                  <LastMessage>{room.lastMessage || "대화를 시작해보세요"}</LastMessage>
                </RoomInfo>
                <RoomMeta>
                  <RoomTime>{formatTime(room.lastMessageAt)}</RoomTime>
                  {unread > 0 && (
                    <UnreadBadge>{unread > 99 ? "99+" : unread}</UnreadBadge>
                  )}
                </RoomMeta>
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

const TabRow = styled.div`
  display: flex;
  border-bottom: 1px solid ${THEME.border};
`;

const Tab = styled.button`
  flex: 1;
  padding: 12px 0;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? THEME.primary : "transparent")};
  background: none;
  color: ${({ $active }) => ($active ? THEME.primary : THEME.muted)};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

const RoomList = styled.div`
  padding: 0 12px;
`;

const OpenCatRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  overflow-x: auto;
  &::-webkit-scrollbar { display: none; }
  scrollbar-width: none;
`;

const OpenCatChip = styled.button`
  flex-shrink: 0;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
  border-radius: 20px;
  background: ${({ $active }) => ($active ? THEME.primary : "#fff")};
  color: ${({ $active }) => ($active ? "#fff" : THEME.muted)};
  cursor: pointer;
  white-space: nowrap;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 0;
`;

const EmptyText = styled.p`
  font-size: 14px;
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
  flex-wrap: wrap;
`;

const RoomName = styled.p`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
  margin: 0;
`;

const CatTag = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${THEME.primary};
  background: ${THEME.purpleLight};
  padding: 2px 8px;
  border-radius: 20px;
`;

const OrderCatTag = styled.span`
  font-size: 11px;
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
  font-size: 11px;
  font-weight: 600;
  color: ${THEME.success};
  background: #ecfdf5;
  padding: 2px 8px;
  border-radius: 20px;
`;

const MemberCount = styled.span`
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 600;
  color: ${THEME.muted};
`;

const OpenFab = styled.button`
  position: fixed;
  bottom: calc(70px + env(safe-area-inset-bottom, 0px));
  right: calc(50% - 163px);
  padding: 10px 18px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  cursor: pointer;
  z-index: 90;
  &:active { opacity: 0.85; }
`;

const LastMessage = styled.p`
  font-size: 13px;
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
  font-size: 12px;
  color: ${THEME.muted};
  white-space: nowrap;
`;

const UnreadBadge = styled.span`
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
`;
