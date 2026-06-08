/* eslint-disable */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { createOpenChatRoom } from "../../service/ChatService";

const CATEGORIES = ["오더", "인력", "기술교육", "매매양도", "자재.장비"];

const OpenChatCreatePage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [roomName, setRoomName] = useState("");
  const [category, setCategory] = useState("오더");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const handleSubmit = async () => {
    if (!userData?.uid) return showToast("로그인이 필요합니다");
    if (!roomName.trim()) return showToast("채팅방 이름을 입력해주세요");

    setSaving(true);
    try {
      const roomId = await createOpenChatRoom({
        ownerUid: userData.uid,
        ownerName: userData?.nickname || userData?.name || "익명",
        ownerPhoto: userData?.profileImage || userData?.photoURL || "",
        roomName: roomName.trim(),
        openCategory: category,
        description: description.trim(),
      });
      navigate(`/chat/${roomId}`, { replace: true });
    } catch (err) {
      console.error("오픈채팅 개설 실패:", err);
      showToast("개설에 실패했습니다");
      setSaving(false);
    }
  };

  return (
    <SimpleBackLayout NAME="오픈채팅 개설" hideFooter>
      <ToastWrap $show={!!toast}>{toast}</ToastWrap>

      <PageWrap>
        <Section>
          <FieldGap>
            <Label>채팅방 이름<Required>*</Required></Label>
            <Input
              placeholder="예: 강북권 에어컨 청소 협업방"
              value={roomName}
              maxLength={30}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </FieldGap>

          <FieldGap>
            <Label>카테고리</Label>
            <ChipRow>
              {CATEGORIES.map((c) => (
                <Chip key={c} $active={category === c} type="button" onClick={() => setCategory(c)}>
                  {c}
                </Chip>
              ))}
            </ChipRow>
          </FieldGap>

          <FieldGap>
            <Label>방 소개</Label>
            <Textarea
              placeholder="어떤 주제로 대화하는 방인지 적어주세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FieldGap>
        </Section>

        <Notice>
          개설하면 누구나 참여할 수 있는 공개 채팅방이 만들어져요. 방장은 회원님이 됩니다.
        </Notice>
      </PageWrap>

      <SubmitBar>
        <SubmitBtn onClick={handleSubmit} disabled={saving}>
          {saving ? "개설 중..." : "채팅방 개설하기"}
        </SubmitBtn>
      </SubmitBar>
    </SimpleBackLayout>
  );
};

export default OpenChatCreatePage;

/* ===== styles ===== */
const ToastWrap = styled.div`
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: ${THEME.text};
  color: #fff;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  z-index: 9999;
  opacity: ${({ $show }) => ($show ? 1 : 0)};
  transition: opacity 0.25s;
  pointer-events: none;
`;

const PageWrap = styled.div`
  padding: 12px 12px 100px;
`;

const Section = styled.div`
  background: ${THEME.surface};
  padding: 20px;
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
`;

const FieldGap = styled.div`
  margin-bottom: 16px;
  &:last-child { margin-bottom: 0; }
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
  margin-bottom: 8px;
`;

const Required = styled.span`
  color: ${THEME.danger};
  margin-left: 2px;
`;

const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  color: ${THEME.text};
  background: ${THEME.surface};
  outline: none;
  &:focus { border-color: ${THEME.primary}; }
  &::placeholder { color: ${THEME.muted}; }
`;

const Textarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  color: ${THEME.text};
  background: ${THEME.surface};
  outline: none;
  min-height: 100px;
  resize: vertical;
  &:focus { border-color: ${THEME.primary}; }
  &::placeholder { color: ${THEME.muted}; }
`;

const ChipRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Chip = styled.button`
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
  border-radius: 20px;
  background: ${({ $active }) => ($active ? THEME.primary : "#fff")};
  color: ${({ $active }) => ($active ? "#fff" : THEME.muted)};
  cursor: pointer;
`;

const Notice = styled.div`
  margin: 10px 4px;
  font-size: 12px;
  color: ${THEME.muted};
  line-height: 1.6;
`;

const SubmitBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px;
  padding: 12px;
  box-sizing: border-box;
  background: ${THEME.surface};
  box-shadow: 0 -1px 4px rgba(0,0,0,0.06);
  z-index: 100;
`;

const SubmitBtn = styled.button`
  width: 100%;
  padding: 14px 0;
  border: none;
  border-radius: 10px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  &:active { opacity: 0.85; }
`;
