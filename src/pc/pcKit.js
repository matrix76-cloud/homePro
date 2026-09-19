/* eslint-disable */
/**
 * PC 화면 공통 부품 — 오더목록(PcOrdersPage)의 모양을 기준으로 뽑은 것. PC 배치를 만들 땐 이걸 쓴다.
 *
 * 두 가지 방식이 있다.
 *  1) 화면 안에서 PC 일 때만 배치를 바꾼다(권장 — 로직을 두 벌로 만들지 않는다):
 *       const Grid = styled.div`
 *         display: block;
 *         ${pcOnly`display: grid; grid-template-columns: minmax(0,1fr) 360px; gap: 24px;`}
 *       `;
 *     pcOnly 는 `.pc-mode &` 선택자다. PC 본문 틀(App 의 PcFrame)에만 .pc-mode 가 붙으므로 폰·앱에는 절대 적용되지 않는다.
 *  2) 화면 구성이 아예 달라야 하면 usePcWide() 로 갈라 아래 부품으로 PC 화면을 그린다.
 *
 * 형 취향(전역): 이모지 금지 · 왼쪽 색 띠 금지 · 연배경+진글씨 뱃지 새로 만들지 말 것 · 회색 본문 글씨 금지(#14181F/#2b2f36)
 *  · 글씨 본문 15px 이상, 라벨 14px 이상 · 말줄임(…) 금지 · 진한 면은 화면당 한 곳 · 흰 면+얇은 테두리(#dfe3e8)
 */
import styled, { css } from "styled-components";

export const PC = {
  primary: "#00963F", primaryDeep: "#007A33", tint: "#E6F7EE",
  ink: "#14181F", body: "#2b2f36", line: "#dfe3e8", bg: "#F7F8FA", head: "#e9ecf1", hover: "#f4f6f8", danger: "#E5484D",
};

// PC 본문 틀 안에서만 먹는 스타일
export const pcOnly = (...args) => css`.pc-mode & { ${css(...args)} }`;

export const PcPage = styled.div`
  max-width: 1180px; margin: 0 auto; padding: 30px 32px 80px; box-sizing: border-box; color: ${PC.ink}; word-break: keep-all;
`;
export const PcTitleRow = styled.div` display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; `;
export const PcTitle = styled.h1` font-size: 26px; font-weight: 800; margin: 0; color: ${PC.ink}; `;
export const PcSub = styled.span` font-size: 16px; color: ${PC.ink}; margin-left: 12px; font-weight: 500; `;
export const PcCard = styled.section` background: #fff; border: 1px solid ${PC.line}; padding: 24px 26px; box-sizing: border-box; `;
export const PcCardTitle = styled.h2` font-size: 18px; font-weight: 800; margin: 0 0 16px; color: ${PC.ink}; `;
// 좌우 2단: 왼쪽 내용 + 오른쪽 고정 패널(금액·실행 버튼 등)
export const PcTwoCol = styled.div` display: grid; grid-template-columns: minmax(0, 1fr) ${({ $side }) => $side || 360}px; gap: 24px; align-items: start; `;
export const PcSticky = styled.div` position: sticky; top: 24px; `;
export const PcPrimaryBtn = styled.button`
  border: none; background: ${PC.primary}; color: #fff; border-radius: 10px; padding: 12px 20px; cursor: pointer;
  font-size: 16px; font-weight: 700; font-family: inherit; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  &:hover { background: ${PC.primaryDeep}; } &:disabled { opacity: 0.55; cursor: default; }
`;
export const PcGhostBtn = styled.button`
  border: 1px solid ${PC.line}; background: #fff; color: ${PC.ink}; border-radius: 10px; padding: 11px 18px; cursor: pointer;
  font-size: 15px; font-weight: 700; font-family: inherit; &:hover { border-color: ${PC.ink}; }
`;
// 한 줄 필터 상자
export const PcFilterRow = styled.div`
  display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px 16px; margin-bottom: 18px;
  background: #fff; border: 1px solid ${PC.line}; padding: 16px 20px;
`;
export const PcField = styled.div`
  display: flex; flex-direction: column; gap: 6px; width: ${({ $w }) => $w || 150}px;
  label { font-size: 14px; font-weight: 700; color: ${PC.ink}; }
  select, input {
    height: 42px; border: 1px solid ${PC.line}; border-radius: 8px; padding: 0 10px; background: #fff; box-sizing: border-box;
    font-size: 15px; font-family: inherit; color: ${PC.ink}; outline: none; &:focus { border-color: ${PC.primary}; }
  }
`;
// 표 — $cols 에 grid-template-columns 값을 준다
export const PcTable = styled.div` background: #fff; border: 1px solid ${PC.line}; min-height: ${({ $minH }) => $minH ?? 420}px; `;
export const PcTHead = styled.div`
  display: grid; grid-template-columns: ${({ $cols }) => $cols}; gap: 12px; padding: 14px 24px; background: ${PC.head};
  font-size: 15px; font-weight: 700; color: ${PC.ink};
`;
export const PcTRow = styled.div`
  display: grid; grid-template-columns: ${({ $cols }) => $cols}; gap: 12px; padding: 16px 24px; border-top: 1px solid ${PC.line};
  font-size: 16px; color: ${PC.ink}; align-items: center; cursor: ${({ $click }) => ($click === false ? "default" : "pointer")};
  b { font-weight: 700; } &:hover { background: ${({ $click }) => ($click === false ? "transparent" : PC.hover)}; }
`;
export const PcEmpty = styled.div`
  padding: 90px 20px; text-align: center; display: grid; gap: 8px; border-top: 1px solid ${PC.line};
  b { font-size: 18px; } span { font-size: 15px; }
`;
// 카드 그리드 (목록을 여러 칸으로)
export const PcCardGrid = styled.div` display: grid; grid-template-columns: repeat(${({ $n }) => $n || 3}, minmax(0, 1fr)); gap: 16px; `;
// 입력 폼 3열
export const PcFormGrid = styled.div` display: grid; grid-template-columns: repeat(${({ $n }) => $n || 3}, minmax(0, 1fr)); gap: 24px 26px; `;
