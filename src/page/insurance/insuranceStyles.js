/**
 * 보험·결제 화면 공통 스타일 (에이전트 B 소유 — InsurancePage 기존 스타일을 그대로 뽑아 공유)
 * 규칙: 이모지 금지 · 좌측 색 테두리 바 금지 · 연배경+진글씨 뱃지 금지 · 보라 금지 · 본문 15px 이상 · 알약 금지
 */
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";

export const Wrap = styled.div`
  padding: 12px;
  padding-bottom: ${({ $bottom }) => $bottom || 40}px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 560px;
`;

export const Card = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
`;

export const CardTitle = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
`;

export const CardText = styled.div`
  margin-top: 10px;
  font-size: 16px;
  line-height: 1.7;
  color: ${THEME.textSecondary};
  word-break: keep-all;
`;

export const CardNote = styled.div`
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: ${THEME.muted};
  word-break: keep-all;
`;

export const PageTitle = styled.div`
  font-size: 23px;
  font-weight: 700;
  color: ${THEME.text};
  letter-spacing: -0.03em;
`;

export const PageSub = styled.div`
  margin-top: 8px;
  font-size: 16px;
  color: ${THEME.textSecondary};
  line-height: 1.6;
  word-break: keep-all;
`;

/* 라벨·값 한 줄 표 */
export const KV = styled.div`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${THEME.border};
`;
export const KVRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 11px 0;
  border-bottom: 1px solid ${THEME.border};
  font-size: 15px;
  line-height: 1.5;
`;
export const K = styled.div`
  width: 92px;
  flex-shrink: 0;
  color: ${THEME.muted};
  font-weight: 600;
`;
export const V = styled.div`
  flex: 1;
  color: ${THEME.text};
  font-weight: ${({ $bold }) => ($bold ? 700 : 500)};
  font-size: ${({ $big }) => ($big ? "19px" : "15px")};
  word-break: break-all;
`;

export const PrimaryBtn = styled.button`
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 10px;
  background: ${THEME.button};
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: default; }
  &:active:not(:disabled) { background: ${THEME.buttonDark}; }
`;

export const GhostBtn = styled.button`
  width: 100%;
  padding: 15px;
  border: 1px solid #d9dde3;
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.text};
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: default; }
  &:active:not(:disabled) { background: ${THEME.background}; }
`;

export const SmallBtn = styled.button`
  padding: 9px 14px;
  border: 1px solid #d9dde3;
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.text};
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  &:disabled { opacity: 0.5; cursor: default; }
  &:active:not(:disabled) { background: ${THEME.background}; }
`;

export const BtnRow = styled.div`
  display: flex;
  gap: 8px;
  & > * { flex: 1; }
`;

/* 하단 고정 버튼 바 — 탭 페이지($tab)는 하단 탭(65px) 위에 얹는다 */
export const FixedBar = styled.div`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px;
  box-sizing: border-box;
  bottom: ${({ $tab }) => ($tab ? "calc(65px + env(safe-area-inset-bottom, 0px))" : "env(safe-area-inset-bottom, 0px)")};
  padding: 10px 12px 12px;
  background: ${THEME.surface};
  border-top: 1px solid ${THEME.border};
  z-index: 900;
`;

export const Toast = styled.div`
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20,24,31,0.92);
  color: #fff;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 15px;
  z-index: 1400;
  max-width: 320px;
  text-align: center;
  word-break: keep-all;
`;

export const Notice = styled.div`
  padding: 14px 16px;
  background: ${THEME.surface};
  border: 1px solid #d9dde3;
  border-radius: 10px;
  font-size: 15px;
  line-height: 1.6;
  color: ${({ $danger }) => ($danger ? THEME.danger : THEME.text)};
  font-weight: ${({ $danger }) => ($danger ? 600 : 500)};
  word-break: keep-all;
`;

export const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
  margin-bottom: 8px;
`;

export const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 14px;
  border: 1px solid #d9dde3;
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.text};
  font-size: 16px;
  font-family: inherit;
  outline: none;
  &:focus { border-color: ${THEME.primary}; }
  &:disabled { background: ${THEME.background}; color: ${THEME.textSecondary}; }
`;

export const Textarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  min-height: 180px;
  padding: 14px;
  border: 1px solid #d9dde3;
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.text};
  font-size: 16px;
  line-height: 1.6;
  font-family: inherit;
  resize: vertical;
  outline: none;
  &:focus { border-color: ${THEME.primary}; }
`;

export const Field = styled.div`
  & + & { margin-top: 16px; }
`;

export const Hint = styled.div`
  margin-top: 6px;
  font-size: 13px;
  color: ${THEME.muted};
  line-height: 1.5;
  word-break: keep-all;
`;

/* 선택 카드 (가입 유형·오더 선택·라디오) */
export const SelectCard = styled.button`
  width: 100%;
  text-align: left;
  box-sizing: border-box;
  padding: 18px 20px;
  border-radius: 16px;
  border: 1.5px solid ${({ $on }) => ($on ? THEME.primary : THEME.border)};
  background: ${THEME.surface};
  box-shadow: ${THEME.cardShadow};
  font-family: inherit;
  cursor: pointer;
  &:disabled { opacity: 0.55; cursor: default; }
`;

export const SelectTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;
export const SelectTitle = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
`;
export const SelectPrice = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${({ $on }) => ($on ? THEME.primaryDark : THEME.text)};
  white-space: nowrap;
`;
export const SelectDesc = styled.div`
  margin-top: 8px;
  font-size: 15px;
  line-height: 1.6;
  color: ${THEME.textSecondary};
  word-break: keep-all;
`;
export const SelectMeta = styled.div`
  margin-top: 6px;
  font-size: 14px;
  color: ${THEME.muted};
  line-height: 1.5;
`;

export const CheckRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 15px;
  line-height: 1.6;
  color: ${THEME.text};
  cursor: pointer;
  input { width: 20px; height: 20px; margin: 2px 0 0; accent-color: ${THEME.primary}; flex-shrink: 0; }
`;

export const StatusText = styled.span`
  font-weight: 700;
  color: ${({ $tone }) => ($tone === "on" ? THEME.primaryDark : $tone === "off" ? THEME.danger : THEME.muted)};
`;

export const ListRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid ${THEME.border};
  &:last-child { border-bottom: none; }
`;
export const ListMain = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 15px;
  color: ${THEME.text};
  font-weight: 600;
  line-height: 1.5;
  word-break: keep-all;
`;
export const ListSub = styled.div`
  margin-top: 3px;
  font-size: 14px;
  color: ${THEME.muted};
  font-weight: 500;
`;
export const ListRight = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
  white-space: nowrap;
  text-align: right;
`;

export const Empty = styled.div`
  padding: 28px 0;
  text-align: center;
  font-size: 15px;
  color: ${THEME.muted};
`;

export const Centered = styled.div`
  min-height: 260px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 0 12px;
`;

export const LinkLine = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.primaryDark};
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

export const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 10px;
`;
export const PhotoCell = styled.div`
  position: relative;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  background: ${THEME.background};
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;
export const PhotoRemove = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 8px;
  background: rgba(20,24,31,0.8);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`;
export const PhotoAdd = styled.label`
  aspect-ratio: 1;
  border-radius: 10px;
  border: 1px dashed #c9ced6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.textSecondary};
  cursor: pointer;
  input { display: none; }
`;

export const RadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
export const RadioCard = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 1.5px solid ${({ $on }) => ($on ? THEME.primary : "#d9dde3")};
  border-radius: 10px;
  background: ${THEME.surface};
  font-size: 15px;
  font-weight: ${({ $on }) => ($on ? 700 : 500)};
  color: ${THEME.text};
  cursor: pointer;
  input { width: 18px; height: 18px; margin: 0; accent-color: ${THEME.primary}; }
`;

export const StepText = styled.div`
  font-size: 15px;
  color: ${THEME.textSecondary};
  line-height: 1.6;
  word-break: keep-all;
`;
