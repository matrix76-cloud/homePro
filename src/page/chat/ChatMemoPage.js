/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoChevronBackOutline, IoTrashOutline } from "react-icons/io5";
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

  const handleBack = () => {
    if (saving) return;
    navigate(-1);
  };

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
    const ok = window.confirm("게시글을 삭제할까요?");
    if (!ok) return;
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
  const canSave = !saving && !!memoText.trim();

  return (
    <Container>
      <Header>
        <BackBtn onClick={handleBack} aria-label="뒤로가기">
          <IoChevronBackOutline size={24} color={THEME.text} />
        </BackBtn>
        <HeaderTitle>게시글 {hasMemo ? "수정" : "등록"}</HeaderTitle>
        <HeaderSpacer />
      </Header>

      <Content>
        <Guide>채팅방 상단에 고정되어 상대방에게 보여집니다.</Guide>
        <MemoTextarea
          placeholder={"채팅방 상단에 고정할 게시글을 작성하세요.\n\n예) 공지사항, 작업 지시사항, 현장 안내 등"}
          value={memoText}
          onChange={(e) => setMemoText(e.target.value)}
          autoFocus
        />
        {hasMemo && (
          <DeleteBtn type="button" onClick={handleDelete} disabled={saving}>
            <IoTrashOutline size={16} />
            게시글 삭제
          </DeleteBtn>
        )}
      </Content>

      <Footer>
        <SaveBtn onClick={handleSave} disabled={!canSave}>
          {saving ? "저장 중..." : "저장"}
        </SaveBtn>
      </Footer>
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
  background: ${THEME.bg || "#F7F8FA"};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  height: 52px;
  padding: 0 12px;
  background: #fff;
  border-bottom: 1px solid ${THEME.border};
  flex-shrink: 0;
`;

const BackBtn = styled.button`
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
`;

const HeaderTitle = styled.p`
  flex: 1;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.text};
`;

const HeaderSpacer = styled.div`
  width: 36px;
  flex-shrink: 0;
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow-y: auto;
`;

const Guide = styled.p`
  font-size: 13px;
  color: ${THEME.textSecondary || "#4E5968"};
  margin-bottom: 10px;
  line-height: 1.5;
`;

const MemoTextarea = styled.textarea`
  width: 100%;
  flex: 1;
  min-height: 260px;
  border: 1px solid ${THEME.border};
  border-radius: 12px;
  padding: 16px;
  font-size: 15px;
  color: ${THEME.text};
  line-height: 1.6;
  resize: none;
  outline: none;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: border-color 0.15s ease;
  &:focus {
    border-color: ${PRIMARY};
  }
  &::placeholder {
    color: #bbb;
  }
`;

const DeleteBtn = styled.button`
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding: 8px 4px;
  background: none;
  border: none;
  font-size: 14px;
  color: ${THEME.textLight || "#6B7280"};
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
  }
  &:active:not(:disabled) {
    opacity: 0.6;
  }
`;

const Footer = styled.div`
  flex-shrink: 0;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  background: #fff;
  border-top: 1px solid ${THEME.border};
`;

const SaveBtn = styled.button`
  width: 100%;
  height: 50px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  background: ${PRIMARY};
  cursor: pointer;
  transition: opacity 0.15s ease;
  &:disabled {
    background: #C7CBD1;
    cursor: default;
  }
  &:active:not(:disabled) {
    opacity: 0.9;
  }
`;
