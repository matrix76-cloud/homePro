/**
 * 보험대리점 관리자 공용 styled 요소
 * 규칙: 이모지 X · 좌측 accent bar X · pill 뱃지 X · 보라 X · stat 카드 X · 알약 X
 *       본문 15px · 라벨 14px · 제목 23px · 검은 면은 화면당 주 버튼 하나
 */
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";

export const INK = "#14181F";
export const LINE = "#d9dee5";
export const LINE_SOFT = "#e9ecf1";
export const FILL_SOFT = "#f1f4f8";
export const ACTIVE_FILL = "#e9ecf1";
export const BTN_DARK = "#1b1f27";

export const Page = styled.div`display: flex; flex-direction: column; gap: 18px;`;

export const PageHead = styled.div`display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap;`;
export const PageTitle = styled.h1`font-size: 23px; font-weight: 700; color: ${INK}; margin: 0; letter-spacing: -0.01em;`;
export const PageDesc = styled.p`font-size: 15px; color: ${INK}; margin: 6px 0 0;`;
export const HeadRight = styled.div`display: flex; align-items: center; gap: 8px; flex-wrap: wrap;`;

/* 버튼 — 주 버튼(먹색)은 화면당 하나, 나머지는 흰 면 + 얇은 테두리 */
export const Btn = styled.button`
    height: 40px; padding: 0 16px; font-size: 15px; font-weight: 600; border-radius: 4px; cursor: pointer;
    white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; line-height: 1;
    border: 1px solid ${(p) => (p.$primary ? BTN_DARK : p.$danger ? "#b91c1c" : LINE)};
    background: ${(p) => (p.$primary ? BTN_DARK : "#fff")};
    color: ${(p) => (p.$primary ? "#fff" : p.$danger ? "#b91c1c" : INK)};
    &:hover:not(:disabled) { background: ${(p) => (p.$primary ? "#2b303a" : FILL_SOFT)}; }
    &:disabled { opacity: 0.45; cursor: default; }
`;
export const SmallBtn = styled(Btn)`height: 34px; padding: 0 12px; font-size: 14px;`;

/* 필터 줄 */
export const FilterRow = styled.div`display: flex; align-items: center; gap: 10px; flex-wrap: wrap;`;
export const FilterLabel = styled.span`font-size: 14px; font-weight: 600; color: ${INK};`;
export const Select = styled.select`
    height: 40px; padding: 0 12px; border: 1px solid ${LINE}; border-radius: 4px; font-size: 15px; color: ${INK};
    background: #fff; outline: none; &:focus { border-color: ${INK}; }
`;
export const Input = styled.input`
    height: 40px; padding: 0 12px; border: 1px solid ${LINE}; border-radius: 4px; font-size: 15px; color: ${INK};
    background: #fff; outline: none; width: ${(p) => p.$w || "auto"}; &:focus { border-color: ${INK}; }
`;
export const Textarea = styled.textarea`
    width: 100%; padding: 10px 12px; border: 1px solid ${LINE}; border-radius: 4px; font-size: 15px; color: ${INK};
    line-height: 1.5; background: #fff; outline: none; resize: vertical; min-height: ${(p) => p.$h || "120px"};
    font-family: inherit; &:focus { border-color: ${INK}; }
`;
export const Count = styled.span`font-size: 15px; color: ${INK}; margin-left: auto;`;

/* 한 줄 요약 표 — 회색 라벨 칸 + 흰 값 칸 (stat 카드 대체) */
export const SummaryTable = styled.table`
    border-collapse: collapse; width: 100%; border: 1px solid ${LINE}; background: #fff;
    td { padding: 11px 14px; font-size: 15px; border: 1px solid ${LINE_SOFT}; white-space: nowrap; }
    td.l { background: ${FILL_SOFT}; font-weight: 600; color: ${INK}; width: 1%; }
    td.v { color: ${INK}; font-weight: 700; }
`;

/* 목록 표 */
export const TableWrap = styled.div`background: #fff; border: 1px solid ${LINE}; overflow-x: auto;`;
export const Table = styled.table`width: 100%; border-collapse: collapse; min-width: ${(p) => p.$minW || "900px"};`;
export const Th = styled.th`
    text-align: left; padding: 11px 14px; font-size: 14px; font-weight: 600; color: ${INK};
    background: ${FILL_SOFT}; border-bottom: 1px solid ${LINE}; white-space: nowrap;
`;
export const Td = styled.td`padding: 11px 14px; font-size: 15px; color: ${INK}; border-bottom: 1px solid ${LINE_SOFT}; white-space: nowrap;`;
export const Tr = styled.tr`
    cursor: ${(p) => (p.$clickable ? "pointer" : "default")};
    &:hover { background: ${(p) => (p.$clickable ? FILL_SOFT : "transparent")}; }
`;
export const Empty = styled.div`text-align: center; padding: 48px 0; color: ${INK}; font-size: 15px;`;
export const Loading = styled.div`text-align: center; padding: 64px 0; color: ${INK}; font-size: 15px;`;

/* 상태 텍스트 — 뱃지 없이 색·굵기만 */
export const Status = styled.span`font-size: 15px; color: ${(p) => p.$color || INK}; font-weight: ${(p) => p.$weight || 500};`;
export const Mono = styled.span`font-family: monospace; font-size: 14px; color: ${INK};`;

/* 페이지네이션 */
export const PageNav = styled.div`display: flex; align-items: center; justify-content: center; gap: 12px; padding: 4px 0;`;
export const PageBtn = styled.button`
    height: 36px; padding: 0 14px; font-size: 15px; font-weight: 600; border: 1px solid ${LINE}; border-radius: 4px;
    background: #fff; color: ${INK}; cursor: pointer;
    &:disabled { opacity: 0.4; cursor: default; } &:hover:not(:disabled) { background: ${FILL_SOFT}; }
`;
export const PageInfo = styled.span`font-size: 15px; color: ${INK};`;

/* 상세 모달 */
export const Overlay = styled.div`position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000;`;
export const Modal = styled.div`
    background: #fff; width: ${(p) => p.$w || "640px"}; max-width: calc(100vw - 32px); height: min(82vh, 760px);
    display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.18); border: 1px solid ${LINE};
`;
export const ModalHead = styled.div`display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid ${LINE};`;
export const ModalTitle = styled.h3`font-size: 19px; font-weight: 700; color: ${INK}; margin: 0;`;
export const ModalClose = styled.button`background: none; border: none; cursor: pointer; color: ${INK}; padding: 4px; display: flex; &:hover { background: ${FILL_SOFT}; }`;
export const ModalBody = styled.div`padding: 20px 24px; overflow-y: auto; flex: 1;`;
export const ModalFoot = styled.div`display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 14px 24px; border-top: 1px solid ${LINE}; flex-wrap: wrap;`;

/* 상세 필드 — 라벨 칸 + 값 칸 */
export const Fields = styled.table`
    width: 100%; border-collapse: collapse; border: 1px solid ${LINE};
    td { padding: 10px 14px; font-size: 15px; border: 1px solid ${LINE_SOFT}; vertical-align: top; }
    td.l { background: ${FILL_SOFT}; font-weight: 600; color: ${INK}; width: 130px; white-space: nowrap; }
    td.v { color: ${INK}; word-break: break-all; }
`;

/* 섹션(설정 탭) */
export const Section = styled.section`background: #fff; border: 1px solid ${LINE};`;
export const SectionHead = styled.div`padding: 16px 24px; border-bottom: 1px solid ${LINE};`;
export const SectionTitle = styled.h2`font-size: 17px; font-weight: 700; color: ${INK}; margin: 0;`;
export const SectionDesc = styled.p`font-size: 14px; color: ${INK}; margin: 6px 0 0;`;
export const SectionBody = styled.div`padding: 22px 24px;`;

export const FormGrid = styled.div`display: grid; grid-template-columns: repeat(${(p) => p.$cols || 3}, minmax(0, 1fr)); gap: 20px 24px;`;
export const Field = styled.div`display: flex; flex-direction: column; gap: 8px; min-width: 0;`;
export const FieldLabel = styled.label`font-size: 14px; font-weight: 600; color: ${INK};`;
export const Hint = styled.span`font-size: 13px; color: ${INK};`;
export const CheckLabel = styled.label`display: inline-flex; align-items: center; gap: 8px; font-size: 15px; color: ${INK}; cursor: pointer; input { width: 18px; height: 18px; }`;

export const Note = styled.p`font-size: 14px; color: ${INK}; margin: 0; line-height: 1.55;`;
export const SavedText = styled.span`font-size: 14px; color: ${THEME.primaryDark}; font-weight: 600;`;
export const ErrorText = styled.span`font-size: 14px; color: #b91c1c; font-weight: 600;`;
