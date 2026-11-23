/* eslint-disable */
/* 운영자 숨김 · 숨김 해제 · 삭제 — 사유를 받는 창 (대표 리뷰 11/22)
 *  관리자 [숨김 · 삭제 관리]와 [매칭관리]가 같이 쓴다. 한 건이든 여러 건이든 같은 창.
 *  props: action("hide"|"unhide"|"delete") · targetKey · items[] · onClose() · onDone({ done:[{item, result}], failed:[{item, message}] }) */
import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import { THEME } from "../../config/homeproConfig";
import {
  getModerationTarget, moderationReasons, moderateHide, moderateUnhide, moderateDelete, deleteBlockReason, ACTION_LABEL,
} from "../../service/ModerationService";

const GUIDE = {
  hide: "숨기면 다른 회원의 목록 · 검색 · 상세에서 바로 사라집니다. 글은 지워지지 않고, 작성자에게는 '운영자에 의해 숨김 처리되었습니다'로 보입니다. 언제든 해제할 수 있습니다.",
  unhide: "해제하면 다시 다른 회원에게 보입니다. 작성자에게 해제 알림이 갑니다.",
  delete: "삭제하면 되돌릴 수 없습니다. 지우기 전에 원본 전체가 처리 기록에 보관되어 분쟁 때 증빙으로 쓸 수 있습니다. 급하지 않으면 숨김을 먼저 쓰세요.",
};

const ModerationDialog = ({ action, targetKey, items = [], onClose, onDone }) => {
  const target = getModerationTarget(targetKey);
  const reasons = moderationReasons(targetKey);
  const [reason, setReason] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  // 처리할 대상 — 일부만 실패하면 실패한 것만 남겨 다시 누를 때 끝난 건을 또 처리하지 않게 한다
  const [pending, setPending] = useState(items);

  if (!target || !pending.length) return null;
  const needReason = action !== "unhide";
  // 삭제가 막히는 오더(배정 진행 중 · H-포인트 보관 중)는 미리 알려 준다
  const blockedItems = action === "delete" ? pending.filter((it) => deleteBlockReason(targetKey, it)) : [];

  const run = async () => {
    if (busy) return;
    if (needReason && !reason) { setError("사유를 골라 주세요."); return; }
    if (reason === "기타" && !memo.trim()) { setError("기타를 고르면 메모에 사유를 적어 주세요."); return; }
    setBusy(true); setError(""); setProgress(0);
    const done = []; const failed = [];
    for (const item of pending) {
      try {
        const opt = { reason, memo: memo.trim() };
        const result = action === "hide" ? await moderateHide(targetKey, item, opt)
          : action === "unhide" ? await moderateUnhide(targetKey, item, opt)
          : await moderateDelete(targetKey, item, opt);
        done.push({ item, result });
      } catch (e) {
        failed.push({ item, message: e?.message || "처리에 실패했습니다" });
      }
      setProgress((n) => n + 1);
    }
    setBusy(false);
    if (onDone) onDone({ done, failed, action });
    if (failed.length) {
      setPending(failed.map((f) => f.item));
      setError(`${failed.length}건은 처리하지 못했습니다 — ${failed[0].message}`);
      return;
    }
    onClose && onClose();
  };

  return (
    <Overlay onClick={() => { if (!busy) onClose && onClose(); }}>
      <Box onClick={(e) => e.stopPropagation()}>
        <Head>
          <h2>{target.label} {ACTION_LABEL[action]}</h2>
          <CloseBtn type="button" onClick={() => { if (!busy) onClose && onClose(); }}>닫기</CloseBtn>
        </Head>
        <Body>
          <Guide>{GUIDE[action]}</Guide>

          <FieldLabel>대상 {pending.length}건</FieldLabel>
          <TargetList>
            {pending.map((it) => (
              <li key={it.id}>{target.title(it)}</li>
            ))}
          </TargetList>
          {blockedItems.length > 0 && (
            <Warn>이 중 {blockedItems.length}건은 삭제할 수 없습니다 — {deleteBlockReason(targetKey, blockedItems[0])}</Warn>
          )}

          {needReason && (
            <>
              <FieldLabel>사유</FieldLabel>
              <ReasonRow>
                {reasons.map((r) => (
                  <ReasonBtn key={r} type="button" $on={reason === r} onClick={() => { setReason(r); setError(""); }}>{r}</ReasonBtn>
                ))}
              </ReasonRow>
            </>
          )}

          <FieldLabel>메모 {needReason ? "(운영자끼리만 봅니다 · 작성자에게는 사유만 갑니다)" : "(선택)"}</FieldLabel>
          <Memo
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder={action === "unhide" ? "해제하는 이유를 적어 두면 처리 기록에 남습니다" : "확인한 내용 · 증빙 위치 등을 적어 두면 처리 기록에 남습니다"}
          />
          <ErrorLine>{error}</ErrorLine>
        </Body>
        <Foot>
          {busy && <Progress><Ring />{progress} / {pending.length}건 처리 중</Progress>}
          <GhostBtn type="button" onClick={onClose} disabled={busy}>취소</GhostBtn>
          <MainBtn type="button" $danger={action === "delete"} onClick={run} disabled={busy}>
            {pending.length > 1 ? `${pending.length}건 ` : ""}{ACTION_LABEL[action]}
          </MainBtn>
        </Foot>
      </Box>
    </Overlay>
  );
};

export default ModerationDialog;

const LINE = "#D9DDE3";
const spin = keyframes` to { transform: rotate(360deg); } `;

const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 1200; background: rgba(20, 24, 31, 0.45);
  display: flex; align-items: center; justify-content: center; padding: 24px;
`;
/* 창 높이는 숨김 · 해제 · 삭제 어느 것이든 같게 */
const Box = styled.div`
  width: 560px; max-width: 100%; height: 620px; max-height: calc(100vh - 48px);
  background: #fff; border: 1px solid ${LINE}; border-radius: 4px;
  display: flex; flex-direction: column; font-family: inherit; color: ${THEME.text};
`;
const Head = styled.div`
  display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid ${LINE};
  h2 { margin: 0; font-size: 18px; font-weight: 600; }
`;
const CloseBtn = styled.button`
  padding: 6px 12px; font-size: 14px; font-family: inherit; color: ${THEME.text};
  background: #fff; border: 1px solid ${LINE}; border-radius: 4px; cursor: pointer;
`;
const Body = styled.div` flex: 1; min-height: 0; overflow-y: auto; padding: 18px 20px; `;
const Guide = styled.p` margin: 0 0 16px; font-size: 15px; line-height: 1.6; word-break: keep-all; `;
const FieldLabel = styled.div` margin: 14px 0 8px; font-size: 14px; font-weight: 500; `;
const TargetList = styled.ul`
  margin: 0; padding: 10px 14px 10px 30px; max-height: 124px; overflow-y: auto;
  border: 1px solid ${LINE}; border-radius: 4px; background: ${THEME.background};
  li { font-size: 15px; line-height: 1.6; word-break: keep-all; }
`;
const Warn = styled.div` margin-top: 8px; font-size: 14px; line-height: 1.5; color: ${THEME.danger}; word-break: keep-all; `;
const ReasonRow = styled.div` display: flex; flex-wrap: wrap; gap: 8px; `;
const ReasonBtn = styled.button`
  min-height: 40px; padding: 8px 14px; font-size: 15px; font-family: inherit; cursor: pointer; border-radius: 4px;
  background: #fff; color: ${(p) => (p.$on ? THEME.primaryDark : THEME.text)};
  border: 1px solid ${(p) => (p.$on ? THEME.primaryDark : LINE)};
  font-weight: ${(p) => (p.$on ? 600 : 400)};
`;
const Memo = styled.textarea`
  width: 100%; height: 96px; box-sizing: border-box; resize: none; padding: 10px 12px;
  font-size: 15px; line-height: 1.5; font-family: inherit; color: ${THEME.text};
  border: 1px solid ${LINE}; border-radius: 4px; outline: none;
  &:focus { border-color: ${THEME.primaryDark}; }
`;
const ErrorLine = styled.div` min-height: 22px; margin-top: 8px; font-size: 14px; line-height: 1.5; color: ${THEME.danger}; word-break: keep-all; `;
const Foot = styled.div`
  display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 14px 20px; border-top: 1px solid ${LINE};
`;
const Progress = styled.div` margin-right: auto; display: flex; align-items: center; gap: 8px; font-size: 14px; `;
const Ring = styled.i`
  width: 16px; height: 16px; border-radius: 50%; border: 2px solid ${LINE}; border-top-color: ${THEME.primaryDark};
  animation: ${spin} 0.8s linear infinite;
`;
const GhostBtn = styled.button`
  min-width: 84px; height: 42px; padding: 0 16px; font-size: 15px; font-family: inherit; cursor: pointer;
  color: ${THEME.text}; background: #fff; border: 1px solid ${LINE}; border-radius: 4px;
  &:disabled { opacity: 0.5; cursor: default; }
`;
const MainBtn = styled.button`
  min-width: 110px; height: 42px; padding: 0 18px; font-size: 15px; font-weight: 500; font-family: inherit; cursor: pointer;
  color: #fff; border: none; border-radius: 4px;
  background: ${(p) => (p.$danger ? "#C62828" : THEME.primaryDark)};
  &:disabled { opacity: 0.5; cursor: default; }
`;
