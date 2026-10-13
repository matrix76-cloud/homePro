/* eslint-disable */
// 신고 · 거부 등록 창 — 커뮤니티 글·댓글, 채팅방에서 같이 쓴다 (애플 심사 1.2, 2026-10-01)
//   target: { type: "post"|"comment"|"chat", postId, commentId, roomId, targetUid, targetName, snippet }
//   startAt: "menu"(신고·거부 고르기) | "report"(바로 신고 사유)
import React, { useState } from "react";
import styled from "styled-components";
import { IoAlertCircleOutline, IoCloseCircleOutline, IoCheckmark } from "react-icons/io5";
import { THEME } from "../config/homeproConfig";
import { reportContent, REPORT_REASONS } from "../service/ReportService";
import { blockUser } from "../service/BlockService";

const ReportSheet = ({ target, myUid, startAt = "menu", onClose, onReported, onBlocked, showToast }) => {
  const [step, setStep] = useState(startAt);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  if (!target) return null;

  const toast = (m) => { if (showToast) showToast(m); };
  const who = target.targetName ? `${target.targetName} 님` : "이 사용자";

  const submitReport = async () => {
    if (busy || !reason) return;
    setBusy(true);
    try {
      await reportContent(myUid, target, { reasonType: reason, content: detail.trim() });
      toast("신고가 접수되었습니다. 운영자가 확인 후 조치합니다");
      onReported?.(target);
      onClose?.();
    } catch (e) {
      toast(e.message || "신고 접수에 실패했습니다");
    } finally {
      setBusy(false);
    }
  };

  const submitBlock = async () => {
    if (busy || !target.targetUid) return;
    setBusy(true);
    try {
      await blockUser(myUid, target.targetUid, target.type === "chat" ? "채팅에서 등록" : "커뮤니티에서 등록");
      toast("거부 등록되었습니다");
      onBlocked?.(target);
      onClose?.();
    } catch (e) {
      toast(e.message || "거부 등록 실패");
      onClose?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <Sheet onClick={(e) => e.stopPropagation()}>
        {step === "menu" && (
          <>
            <MenuRow type="button" onClick={() => setStep("report")}>
              <IoAlertCircleOutline size={24} color={THEME.text} />
              <div><b>신고하기</b><span>운영자가 확인하고 조치합니다</span></div>
            </MenuRow>
            {target.targetUid && (
              <MenuRow type="button" onClick={() => setStep("block")}>
                <IoCloseCircleOutline size={24} color={THEME.text} />
                <div><b>이 사용자 거부 등록</b><span>이 사용자의 글·댓글이 보이지 않게 됩니다</span></div>
              </MenuRow>
            )}
            <BtnRow><CancelBtn type="button" onClick={onClose}>닫기</CancelBtn></BtnRow>
          </>
        )}

        {step === "report" && (
          <>
            <Title>신고 사유</Title>
            <ReasonList>
              {REPORT_REASONS.map((r) => (
                <ReasonRow key={r} type="button" $on={reason === r} onClick={() => setReason(r)}>
                  {r}
                  {reason === r && <IoCheckmark size={20} color={THEME.primary} />}
                </ReasonRow>
              ))}
            </ReasonList>
            <DetailInput
              placeholder="자세한 내용을 적어 주세요 (선택)"
              value={detail}
              onChange={(e) => setDetail(e.target.value.slice(0, 500))}
              rows={3}
            />
            <BtnRow>
              <CancelBtn type="button" onClick={onClose}>닫기</CancelBtn>
              <ConfirmBtn type="button" onClick={submitReport} disabled={busy || !reason}>
                {busy ? "처리 중..." : "신고하기"}
              </ConfirmBtn>
            </BtnRow>
          </>
        )}

        {step === "block" && (
          <>
            <Title>거부 등록</Title>
            <Hint>
              {who}을 거부 등록합니다.{"\n"}
              거부하면 이 사용자의 글·댓글이 보이지 않고, 서로 오더 공유·수락도 되지 않습니다. 마이의 거부 목록에서 언제든 해제할 수 있어요.
            </Hint>
            <BtnRow>
              <CancelBtn type="button" onClick={onClose}>닫기</CancelBtn>
              <ConfirmBtn type="button" onClick={submitBlock} disabled={busy}>
                {busy ? "처리 중..." : "거부 등록"}
              </ConfirmBtn>
            </BtnRow>
          </>
        )}
      </Sheet>
    </Overlay>
  );
};

export default ReportSheet;

const Overlay = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 1000;
  .pc-mode & { align-items: center; }
`;
const Sheet = styled.div`
  background: #fff; border-radius: 16px 16px 0 0;
  padding: 20px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  width: 100%; max-width: var(--app-max, 400px); box-sizing: border-box;
  word-break: keep-all;
  .pc-mode & { max-width: 440px; border-radius: 12px; padding: 24px; }
`;
const Title = styled.div`
  font-size: 18px; font-weight: 700; color: ${THEME.text}; margin-bottom: 14px;
`;
const MenuRow = styled.button`
  display: flex; align-items: center; gap: 14px; width: 100%; min-height: 64px;
  padding: 10px 0; background: none; border: none; border-bottom: 1px solid #E5E7EB;
  font-family: inherit; text-align: left; cursor: pointer;
  div { display: grid; gap: 2px; }
  b { font-size: 17px; font-weight: 700; color: ${THEME.text}; }
  span { font-size: 14px; color: ${THEME.textSecondary}; }
  &:active { background: ${THEME.background}; }
`;
const ReasonList = styled.div`
  display: grid; gap: 8px;
`;
const ReasonRow = styled.button`
  display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 52px;
  padding: 0 14px; background: #fff; border-radius: 10px; cursor: pointer;
  border: 1px solid ${({ $on }) => ($on ? THEME.primary : "#D9DDE3")};
  font-family: inherit; font-size: 16px; text-align: left;
  font-weight: ${({ $on }) => ($on ? 700 : 500)};
  color: ${({ $on }) => ($on ? THEME.primaryDark : THEME.text)};
`;
const DetailInput = styled.textarea`
  width: 100%; box-sizing: border-box; margin-top: 12px; padding: 12px;
  font-size: 16px; font-family: inherit; line-height: 1.5; color: ${THEME.text};
  border: 1px solid #D9DDE3; border-radius: 10px; resize: none; outline: none;
  &:focus { border-color: ${THEME.primary}; }
  &::placeholder { color: ${THEME.muted}; }
`;
const Hint = styled.p`
  margin: 0; font-size: 16px; line-height: 1.55; color: ${THEME.textSecondary}; white-space: pre-line;
`;
const BtnRow = styled.div`
  display: flex; gap: 10px; margin-top: 16px;
`;
const CancelBtn = styled.button`
  flex: 1; height: 52px; border-radius: 10px; border: 1px solid #D1D5DB; background: #fff;
  font-size: 16px; font-weight: 600; font-family: inherit; color: ${THEME.text}; cursor: pointer;
  &:active { background: ${THEME.background}; }
`;
const ConfirmBtn = styled.button`
  flex: 1; height: 52px; border-radius: 10px; border: none;
  background: ${({ disabled }) => (disabled ? "#D0D0D0" : THEME.button)};
  font-size: 16px; font-weight: 700; font-family: inherit; color: #fff;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  &:active:not(:disabled) { opacity: 0.85; }
`;
