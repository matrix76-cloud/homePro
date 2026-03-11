/* eslint-disable */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import {
  IoChevronBack, IoSend, IoAdd, IoDocumentOutline, IoDownloadOutline,
  IoCloseOutline, IoCalendarOutline, IoCheckmarkCircle, IoLocationOutline,
  IoTimeOutline, IoExitOutline,
} from "react-icons/io5";
import { THEME } from "../../config/homeproConfig";
import { db, storage } from "../../api/config";
import {
  doc, collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc, getDocs, where, arrayRemove,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../context/AuthContext";
import { format, isToday, isYesterday } from "date-fns";
import { compressDetailImage } from "../../utility/imageUtils";

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

const ChatDetailPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const myUid = userData?.uid;

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [mySchedules, setMySchedules] = useState([]);
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);

  // 채팅방 정보
  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(doc(db, "chatRooms", roomId), (snap) => {
      if (snap.exists()) setRoom({ id: snap.id, ...snap.data() });
    });
    return () => unsub();
  }, [roomId]);

  // 입장 시 unread 초기화
  const clearUnread = useCallback(async () => {
    if (!roomId || !myUid) return;
    const roomRef = doc(db, "chatRooms", roomId);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;
    if ((snap.data().unreadCount?.[myUid] || 0) > 0) {
      await updateDoc(roomRef, { [`unreadCount.${myUid}`]: 0 });
    }
  }, [roomId, myUid]);

  useEffect(() => { clearUnread(); }, [clearUnread]);

  // 메시지 실시간 수신
  useEffect(() => {
    if (!roomId) return;
    const q = query(
      collection(db, "chatRooms", roomId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [roomId]);

  // 메시지 추가 시 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 메시지 전송
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !myUid) return;
    setSending(true);
    setText("");
    try {
      await addDoc(collection(db, "chatRooms", roomId, "messages"), {
        text: trimmed,
        senderId: myUid,
        senderName: userData?.companyName || userData?.name || "",
        createdAt: serverTimestamp(),
      });
      const roomRef = doc(db, "chatRooms", roomId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const roomData = roomSnap.data();
        const updates = { lastMessage: trimmed, lastMessageAt: serverTimestamp() };
        (roomData.participants || []).forEach((uid) => {
          if (uid !== myUid) {
            updates[`unreadCount.${uid}`] = (roomData.unreadCount?.[uid] || 0) + 1;
          }
        });
        await updateDoc(roomRef, updates);
      }
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
      const isImage = file.type.startsWith("image/");
      let uploadFile = file;
      let fileName = file.name;
      if (isImage) {
        uploadFile = await compressDetailImage(file, 800, 0.7);
        fileName = uploadFile.name;
      }
      const storageRef = ref(storage, `chat/${roomId}/${Date.now()}_${fileName}`);
      await uploadBytes(storageRef, uploadFile);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, "chatRooms", roomId, "messages"), {
        senderId: myUid,
        senderName: userData?.companyName || userData?.name || "",
        createdAt: serverTimestamp(),
        type: isImage ? "image" : "file",
        fileUrl: url,
        fileName: file.name,
        fileSize: file.size,
        text: "",
      });
      const roomRef = doc(db, "chatRooms", roomId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const roomData = roomSnap.data();
        const updates = {
          lastMessage: isImage ? "사진을 보냈습니다" : `파일: ${file.name}`,
          lastMessageAt: serverTimestamp(),
        };
        (roomData.participants || []).forEach((uid) => {
          if (uid !== myUid) {
            updates[`unreadCount.${uid}`] = (roomData.unreadCount?.[uid] || 0) + 1;
          }
        });
        await updateDoc(roomRef, updates);
      }
    } catch (err) {
      console.error("파일 전송 실패:", err);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  // 일정 공유 모달
  const openScheduleModal = async () => {
    if (!myUid) return;
    setShowScheduleModal(true);
    setSelectedSchedules([]);
    setLoadingSchedules(true);
    try {
      const q = query(collection(db, "schedules"), where("uid", "==", myUid));
      const snap = await getDocs(q);
      setMySchedules(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      );
    } catch (err) {
      console.error("일정 로드 실패:", err);
      setMySchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const toggleSchedule = (id) => {
    setSelectedSchedules((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleShareSchedules = async () => {
    if (selectedSchedules.length === 0 || sending) return;
    setSending(true);
    setShowScheduleModal(false);
    try {
      for (const schedId of selectedSchedules) {
        const sched = mySchedules.find((s) => s.id === schedId);
        if (!sched) continue;
        await addDoc(collection(db, "chatRooms", roomId, "messages"), {
          senderId: myUid,
          senderName: userData?.companyName || userData?.name || "",
          createdAt: serverTimestamp(),
          type: "schedule",
          schedule: {
            title: sched.title,
            date: sched.date,
            time: sched.time || "종일",
            address: sched.address || "",
            memo: sched.memo || "",
          },
        });
      }
      const roomRef = doc(db, "chatRooms", roomId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const roomData = roomSnap.data();
        const updates = {
          lastMessage: `일정 ${selectedSchedules.length}건을 공유했습니다`,
          lastMessageAt: serverTimestamp(),
        };
        (roomData.participants || []).forEach((uid) => {
          if (uid !== myUid) {
            updates[`unreadCount.${uid}`] = (roomData.unreadCount?.[uid] || 0) + selectedSchedules.length;
          }
        });
        await updateDoc(roomRef, updates);
      }
    } catch (err) {
      console.error("일정 공유 실패:", err);
    } finally {
      setSending(false);
    }
  };

  // 채팅방 나가기
  const handleLeaveRoom = async () => {
    if (!window.confirm("채팅방을 나가시겠습니까?\n대화 내용은 삭제됩니다.")) return;
    try {
      const roomRef = doc(db, "chatRooms", roomId);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) { navigate("/MobileChat"); return; }
      const roomData = roomSnap.data();
      const remaining = (roomData.participants || []).filter((uid) => uid !== myUid);
      if (remaining.length === 0) {
        const msgSnap = await getDocs(collection(db, "chatRooms", roomId, "messages"));
        for (const m of msgSnap.docs) await deleteDoc(m.ref);
        await deleteDoc(roomRef);
      } else {
        const nameUpdates = { ...roomData.participantNames };
        delete nameUpdates[myUid];
        await updateDoc(roomRef, {
          participants: arrayRemove(myUid),
          participantNames: nameUpdates,
          [`unreadCount.${myUid}`]: 0,
        });
      }
      navigate("/MobileChat");
    } catch (err) {
      console.error("채팅방 나가기 실패:", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const roomName = (() => {
    if (!room) return "";
    if (room.roomName) return room.roomName;
    const names = room.participantNames || {};
    const otherUid = (room.participants || []).find((uid) => uid !== myUid);
    return names[otherUid] || "채팅";
  })();

  const getDateKey = (msg) => {
    if (!msg.createdAt) return "";
    const d = msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
    return format(d, "yyyy-MM-dd");
  };

  return (
    <Container>
      <Header>
        <BackBtn onClick={() => navigate(-1)}><IoChevronBack size={22} /></BackBtn>
        <HeaderTitle>{roomName}</HeaderTitle>
        <HeaderRight>
          <MemoBtnBadge onClick={() => navigate(`/chat/${roomId}/memo`)} $hasMemo={!!room?.memo}>
            게시글
          </MemoBtnBadge>
          <LeaveBtn onClick={handleLeaveRoom}><IoExitOutline size={20} /></LeaveBtn>
        </HeaderRight>
      </Header>

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
                <IoCloseOutline size={22} />
              </ModalCloseBtn>
            </ModalHeader>
            <ScheduleList>
              {loadingSchedules ? (
                <SchedEmptyText>일정을 불러오는 중...</SchedEmptyText>
              ) : mySchedules.length === 0 ? (
                <SchedEmptyText>등록된 일정이 없습니다</SchedEmptyText>
              ) : (
                mySchedules.map((s) => {
                  const checked = selectedSchedules.includes(s.id);
                  return (
                    <SchedItem key={s.id} onClick={() => toggleSchedule(s.id)} $checked={checked}>
                      <SchedCheckIcon $checked={checked}><IoCheckmarkCircle size={20} /></SchedCheckIcon>
                      <SchedItemInfo>
                        <SchedItemDate>{s.date} · {s.time || "종일"}</SchedItemDate>
                        <SchedItemTitle>{s.title}</SchedItemTitle>
                        {s.address && <SchedItemAddr>{s.address}</SchedItemAddr>}
                      </SchedItemInfo>
                    </SchedItem>
                  );
                })
              )}
            </ScheduleList>
            {mySchedules.length > 0 && (
              <SchedShareBtn onClick={handleShareSchedules} disabled={selectedSchedules.length === 0 || sending}>
                {selectedSchedules.length > 0 ? `${selectedSchedules.length}건 공유하기` : "일정을 선택하세요"}
              </SchedShareBtn>
            )}
          </ScheduleModalContent>
        </ModalOverlay>
      )}

      <MessageList ref={listRef}>
        {messages.map((msg, i) => {
          const isMine = msg.senderId === myUid;
          const dateKey = getDateKey(msg);
          const prevDateKey = i > 0 ? getDateKey(messages[i - 1]) : "";
          const showDate = dateKey && dateKey !== prevDateKey;

          return (
            <React.Fragment key={msg.id}>
              {showDate && (
                <DateDivider><DateLabel>{formatDateDivider(msg.createdAt)}</DateLabel></DateDivider>
              )}
              <MsgRow $isMine={isMine}>
                {!isMine && <SenderAvatar>{(msg.senderName || "?").charAt(0)}</SenderAvatar>}
                <MsgContent $isMine={isMine}>
                  {!isMine && <SenderName>{msg.senderName}</SenderName>}
                  <BubbleRow $isMine={isMine}>
                    {isMine && <MsgTime>{formatMsgTime(msg.createdAt)}</MsgTime>}
                    {msg.type === "image" ? (
                      <ImageBubble $isMine={isMine} onClick={() => window.open(msg.fileUrl, "_blank")}>
                        <ChatImage src={msg.fileUrl} alt="이미지" />
                      </ImageBubble>
                    ) : msg.type === "schedule" ? (
                      <ScheduleBubble $isMine={isMine}>
                        <SchedBubbleHeader><IoCalendarOutline size={14} /><span>일정 공유</span></SchedBubbleHeader>
                        <SchedBubbleTitle $isMine={isMine}>{msg.schedule?.title}</SchedBubbleTitle>
                        <SchedBubbleRow><IoTimeOutline size={12} /><SchedBubbleText $isMine={isMine}>{msg.schedule?.date} · {msg.schedule?.time}</SchedBubbleText></SchedBubbleRow>
                        {msg.schedule?.address && (
                          <SchedBubbleRow><IoLocationOutline size={12} /><SchedBubbleText $isMine={isMine}>{msg.schedule.address}</SchedBubbleText></SchedBubbleRow>
                        )}
                        {msg.schedule?.memo && <SchedBubbleMemo $isMine={isMine}>{msg.schedule.memo}</SchedBubbleMemo>}
                      </ScheduleBubble>
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
                      <Bubble $isMine={isMine}>{msg.text}</Bubble>
                    )}
                    {!isMine && <MsgTime>{formatMsgTime(msg.createdAt)}</MsgTime>}
                  </BubbleRow>
                </MsgContent>
              </MsgRow>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </MessageList>

      <InputArea>
        <HiddenFileInput ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.hwp,.zip,.txt" onChange={handleFileSelect} />
        <InputWrap>
          <AttachBtn onClick={() => fileInputRef.current?.click()} disabled={uploading}><IoAdd size={22} /></AttachBtn>
          <ScheduleShareBtn onClick={openScheduleModal}><IoCalendarOutline size={18} /></ScheduleShareBtn>
          <TextInput
            placeholder={uploading ? "파일 전송 중..." : "메시지를 입력하세요"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={uploading}
          />
          <SendBtn onClick={handleSend} disabled={!text.trim() || sending || uploading}><IoSend size={18} /></SendBtn>
        </InputWrap>
      </InputArea>
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
  background: #F4F3F8;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  height: 52px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid ${THEME.border};
  flex-shrink: 0;
`;

const BackBtn = styled.button`
  color: #2C3640;
  display: flex;
  align-items: center;
  padding: 4px;
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
  &:active { color: #E85830; }
`;

const MemoBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 16px;
  background: #EBF2FF;
  border-bottom: 1px solid #D4E2F7;
  cursor: pointer;
  flex-shrink: 0;
`;

const MemoBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${PRIMARY};
  background: #fff;
  padding: 2px 8px;
  border-radius: 4px;
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
  padding: 0 20px;
  margin-bottom: 16px;
`;

const ModalTitle = styled.p`
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.text};
`;

const ModalCloseBtn = styled.button`
  color: ${THEME.muted};
  display: flex;
  align-items: center;
  padding: 2px;
`;

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
  border-radius: 10px;
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
  border-radius: 4px;
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

const MsgTime = styled.span`
  font-size: 10px;
  color: ${THEME.muted};
  flex-shrink: 0;
  white-space: nowrap;
`;

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
  border-radius: 4px;
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

const HiddenFileInput = styled.input`display: none;`;

const AttachBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  color: ${({ disabled }) => (disabled ? "#ccc" : PRIMARY)};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &:active:not(:disabled) { background: rgba(37,99,235,0.1); }
`;

const InputArea = styled.div`
  padding: 8px 12px;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid ${THEME.border};
  flex-shrink: 0;
`;

const InputWrap = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: #F4F3F8;
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
  border-radius: 50%;
  background: transparent;
  color: ${PRIMARY};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &:active { background: rgba(37,99,235,0.1); }
`;

const ScheduleBubble = styled.div`
  padding: 12px 14px;
  border-radius: ${({ $isMine }) => ($isMine ? "14px 14px 4px 14px" : "14px 14px 14px 4px")};
  background: ${({ $isMine }) => ($isMine ? "#1D4ED8" : "#FFFFFF")};
  box-shadow: ${({ $isMine }) => ($isMine ? "none" : "0 1px 3px rgba(0,0,0,0.04)")};
  min-width: 180px;
`;

const SchedBubbleHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: #F59E0B;
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

const ScheduleModalContent = styled.div`
  background: white;
  border-radius: 4px;
  width: 100%;
  max-width: 360px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  padding-top: 20px;
`;

const ScheduleList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 20px;
`;

const SchedEmptyText = styled.p`
  font-size: 14px;
  color: #bbb;
  text-align: center;
  padding: 40px 0;
`;

const SchedItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid ${THEME.border};
  cursor: pointer;
  &:last-child { border-bottom: none; }
  &:active { opacity: 0.7; }
`;

const SchedCheckIcon = styled.div`
  color: ${({ $checked }) => ($checked ? PRIMARY : "#ddd")};
  flex-shrink: 0;
  margin-top: 2px;
  transition: color 0.15s;
`;

const SchedItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const SchedItemDate = styled.p`
  font-size: 12px;
  color: ${THEME.muted};
  margin-bottom: 2px;
`;

const SchedItemTitle = styled.p`
  font-size: 14px;
  font-weight: 500;
  color: ${THEME.text};
`;

const SchedItemAddr = styled.p`
  font-size: 12px;
  color: #B0B8BF;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SchedShareBtn = styled.button`
  margin: 12px 20px 20px;
  padding: 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  background: ${({ disabled }) => (disabled ? "#ccc" : PRIMARY)};
  flex-shrink: 0;
  &:disabled { cursor: default; }
  &:active:not(:disabled) { opacity: 0.8; }
`;

const SendBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ disabled }) => (disabled ? "#D0D0D0" : PRIMARY)};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &:active:not(:disabled) { opacity: 0.8; }
`;
