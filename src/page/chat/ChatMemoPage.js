/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoChevronBack, IoTrashOutline } from "react-icons/io5";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { subscribeChatRoom, updateMemo, deleteMemo } from "../../service/ChatService";

const ChatMemoPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const myUid = userData?.uid;

  const [room, setRoom] = useState(null);
  const [memoText, setMemoText] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    return subscribeChatRoom(roomId, (data) => {
      setRoom(data);
      if (!loaded) {
        setMemoText(data.memo || "");
        setLoaded(true);
      }
    });
  }, [roomId, loaded]);

  const handleSave = async () => {
    if (saving || !memoText.trim()) return;
    setSaving(true);
    try {
      await updateMemo(roomId, memoText, myUid);
      navigate(-1);
    } catch (err) {
      console.error("메모 저장 실패:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await deleteMemo(roomId, myUid);
      navigate(-1);
    } catch (err) {
      console.error("메모 삭제 실패:", err);
    } finally {
      setSaving(false);
    }
  };

  const hasMemo = !!room?.memo;

  return (
    <Container>
      <Header>
        <BackBtn onClick={() => navigate(-1)}><IoChevronBack size={22} /></BackBtn>
        <HeaderTitle>게시글 {hasMemo ? "수정" : "등록"}</HeaderTitle>
        <SaveBtn onClick={handleSave} disabled={saving || !memoText.trim()}>
          {saving ? "저장 중" : "저장"}
        </SaveBtn>
      </Header>

      <Content>
        <MemoTextarea
          placeholder={"채팅방 상단에 고정할 게시글을 작성하세요.\n\n예) 공지사항, 작업 지시사항, 현장 안내 등"}
          value={memoText}
          onChange={(e) => setMemoText(e.target.value)}
          autoFocus
        />
      </Content>

      {hasMemo && (
        <DeleteArea>
          <DeleteBtn onClick={handleDelete} disabled={saving}>
            <IoTrashOutline size={16} />
            게시글 삭제
          </DeleteBtn>
        </DeleteArea>
      )}
    </Container>
  );
};

export default ChatMemoPage;

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

const SaveBtn = styled.button`
  font-size: 14px;
  font-weight: 500;
  color: ${({ disabled }) => (disabled ? "#ccc" : PRIMARY)};
  padding: 4px 0;
  white-space: nowrap;
`;

const Content = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
`;

const MemoTextarea = styled.textarea`
  width: 100%;
  min-height: 300px;
  height: 100%;
  border: none;
  border-radius: 4px;
  padding: 16px;
  font-size: 15px;
  color: ${THEME.text};
  line-height: 1.6;
  resize: none;
  outline: none;
  background: white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  &::placeholder { color: #bbb; }
`;

const DeleteArea = styled.div`
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid ${THEME.border};
  flex-shrink: 0;
`;

const DeleteBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 12px;
  border-radius: 4px;
  border: none;
  font-size: 14px;
  color: #E85830;
  background: #FFF0EC;
  &:disabled { opacity: 0.5; }
  &:active:not(:disabled) { opacity: 0.7; }
`;
