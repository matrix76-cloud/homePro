/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoChatbubbleEllipsesOutline, IoPersonCircleOutline } from "react-icons/io5";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { subscribeChatRooms } from "../../service/ChatService";
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
  const [loading, setLoading] = useState(true);
  const [focusedRoom, setFocusedRoom] = useState(null);
  const [activeTab, setActiveTab] = useState("quote");

  const myUid = userData?.uid;

  useEffect(() => {
    if (!myUid) return;
    return subscribeChatRooms(myUid, (list) => {
      setRooms(list);
      setLoading(false);
    });
  }, [myUid]);

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

  const quoteRooms = rooms.filter((r) => r.roomType === "quote");
  const generalRooms = rooms.filter((r) => r.roomType !== "quote");
  const filteredRooms = activeTab === "quote" ? quoteRooms : generalRooms;

  return (
    <MainListLayout NAME="채팅" footerType="CHAT" hideBack>
      <TabRow>
        <Tab $active={activeTab === "quote"} onClick={() => setActiveTab("quote")}>
          견적 채팅{quoteRooms.length > 0 ? ` (${quoteRooms.length})` : ""}
        </Tab>
        <Tab $active={activeTab === "general"} onClick={() => setActiveTab("general")}>
          일반 채팅{generalRooms.length > 0 ? ` (${generalRooms.length})` : ""}
        </Tab>
      </TabRow>
      <RoomList>
        {loading ? (
          <EmptyState>
            <EmptyText>로딩 중...</EmptyText>
          </EmptyState>
        ) : filteredRooms.length === 0 ? (
          <EmptyState>
            <IoChatbubbleEllipsesOutline size={40} color={THEME.muted} />
            <EmptyText>채팅방이 없습니다</EmptyText>
          </EmptyState>
        ) : (
          filteredRooms.map((room) => {
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
                  <RoomName>{getRoomDisplayName(room)}</RoomName>
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

const RoomName = styled.p`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
  margin: 0;
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
