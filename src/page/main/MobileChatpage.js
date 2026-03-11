/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoChatbubbleEllipsesOutline, IoPersonCircleOutline } from "react-icons/io5";
import { THEME } from "../../config/homeproConfig";
import { MOBILEMAINMENU } from "../../utility/constants";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../api/config";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
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

  const myUid = userData?.uid;

  useEffect(() => {
    if (!myUid) return;
    const q = query(
      collection(db, "chatRooms"),
      where("participants", "array-contains", myUid),
      orderBy("lastMessageAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [myUid]);

  const getRoomDisplayName = (room) => {
    if (room.roomName) return room.roomName;
    const names = room.participantNames || {};
    const otherUid = (room.participants || []).find((uid) => uid !== myUid);
    return names[otherUid] || "알 수 없음";
  };

  const getRoomAvatar = (room) => {
    const otherUid = (room.participants || []).find((uid) => uid !== myUid);
    return (room.participantPhotos || {})[otherUid] || null;
  };

  const getUnread = (room) => (room.unreadCount || {})[myUid] || 0;

  const isEmpty = !loading && rooms.length === 0;

  return (
    <MainListLayout NAME="채팅" hideBack footerType={MOBILEMAINMENU.CHAT}>
      <PageWrap>
        {loading ? (
          <EmptyWrap><EmptyDesc>로딩 중...</EmptyDesc></EmptyWrap>
        ) : isEmpty ? (
          <EmptyWrap>
            <IconCircle>
              <IoChatbubbleEllipsesOutline size={48} color={THEME.primary} />
            </IconCircle>
            <EmptyTitle>아직 채팅이 없어요</EmptyTitle>
            <EmptyDesc>전문가에게 견적을 요청하면{"\n"}채팅이 시작됩니다</EmptyDesc>
          </EmptyWrap>
        ) : (
          <RoomList>
            {rooms.map((room) => {
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
                      <IoPersonCircleOutline size={56} color="#B0B8C0" />
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
            })}
          </RoomList>
        )}
      </PageWrap>
    </MainListLayout>
  );
};

export default MobileChatpage;

/* ─── styles ─── */

const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: ${THEME.background};
`;

const EmptyWrap = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
`;

const IconCircle = styled.div`
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: ${THEME.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${THEME.cardShadow};
  margin-bottom: 24px;
`;

const EmptyTitle = styled.div`
  font-size: 18px;
  font-weight: 400;
  color: ${THEME.text};
  letter-spacing: -0.03em;
  margin-bottom: 8px;
`;

const EmptyDesc = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  text-align: center;
  line-height: 1.6;
  white-space: pre-line;
`;

const RoomList = styled.div`
  padding: 0 12px;
`;

const RoomItem = styled.div`
  display: flex;
  gap: 14px;
  padding: 16px 8px;
  border-bottom: 1px solid ${THEME.border};
  cursor: pointer;
  align-items: center;
  border-radius: 4px;
  background: ${({ $focused }) => ($focused ? THEME.surface : "transparent")};
  transition: background 0.15s;
  &:last-child { border-bottom: none; }
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
  background: #F0F0F0;
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
  font-weight: 600;
  color: ${THEME.text};
`;

const LastMessage = styled.p`
  font-size: 13px;
  color: ${THEME.muted};
  font-weight: 400;
  line-height: 1.4;
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
  min-width: 22px;
  height: 22px;
  border-radius: 11px;
  background: ${THEME.primary};
  color: white;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
`;
