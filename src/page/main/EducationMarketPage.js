/* eslint-disable */
// 교육.장터 — 기술교육 + 양도·매매 + 자재·장비 3영역을 한 탭에 세그먼트로 통합
import React from "react";
import { useSearchParams } from "react-router-dom";
import styled from "styled-components";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import { THEME } from "../../config/homeproConfig";
import TrainingPage from "../training/TrainingPage";
import MarketplacePage from "../order/MarketplacePage";
import SuppliesPage from "../supplies/SuppliesPage";
import { pcOnly, PC } from "../../pc/pcKit";

const SEGMENTS = [
  { key: "training", label: "기술교육" },
  { key: "market", label: "양도·매매" },
  { key: "supplies", label: "자재·장비·소모품" },
];
// 마이페이지에서 따로 들어올 때의 화면 제목 — 세 메뉴로 분리 (대표 10/2):
//  기술전수 수강생모집 / 거래장터(자재·장비·소모품) / 양도·매매(사업장·팀인력·영업권 DB)
const ONLY_TITLE = { training: "기술전수 수강생모집", supplies: "거래장터", market: "양도·매매" };

const EducationMarketPage = () => {
  // 마이페이지의 기술전수교육/거래장터 분리 진입 — ?seg= 로 초기 세그먼트 지정 (형 지시 8/8)
  // 고른 탭은 주소(?seg=)에 replace 로 남긴다 — 상세에 갔다 뒤로 와도 그 탭 그대로 (예전엔 늘 기술교육으로 돌아왔다)
  const [searchParams, setSearchParams] = useSearchParams();
  const initSeg = SEGMENTS.some((s) => s.key === searchParams.get("seg")) ? searchParams.get("seg") : "training";
  const seg = initSeg;
  const setSeg = (key) => {
    if (key === seg) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("seg", key);
      return next;
    }, { replace: true });
  };
  // 마이페이지 '기술전수 수강생모집'에서 들어오면 기술전수 항목만 (대표 9/15 리뷰). 거래장터는 양도·매매·자재·장비만
  const only = searchParams.get("only") === "1";
  const visibleSegs = only ? SEGMENTS.filter((s) => s.key === initSeg) : SEGMENTS;
  return (
    <MainListLayout NAME={only ? ONLY_TITLE[initSeg] : "교육.장터"} footerType="education" hideBack={!only}>
      {visibleSegs.length > 1 && (
      <SegRow>
        {visibleSegs.map((s) => (
          <SegBtn key={s.key} $active={seg === s.key} onClick={() => setSeg(s.key)}>
            {s.label}
          </SegBtn>
        ))}
      </SegRow>
      )}
      <SegBody>
        {seg === "training" && <TrainingPage embedded />}
        {seg === "market" && <MarketplacePage embedded />}
        {seg === "supplies" && <SuppliesPage embedded />}
      </SegBody>
    </MainListLayout>
  );
};

export default EducationMarketPage;

const SegRow = styled.div`
  display: flex;
  gap: 8px;
  padding: 10px 12px 4px;
  background: ${THEME.background};
  /* PC: 한 박스로 묶인 탭 */
  ${pcOnly`gap: 0; padding: 0; margin: 24px 32px 0; width: 480px; border: 1px solid #d5d9e0; background: #fff;`}
`;

const SegBtn = styled.button`
  flex: 1;
  height: 40px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  cursor: pointer;
  font-family: inherit;
  border: 1px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
  background: ${({ $active }) => ($active ? THEME.primary : THEME.surface)};
  color: ${({ $active }) => ($active ? "#fff" : THEME.text)};
  &:active { opacity: 0.85; }
  &:focus { outline: none; }
  ${pcOnly`
    flex: 1 1 0; height: 46px; border-radius: 0; border: none; color: ${PC.ink};
    background: ${({ $active }) => ($active ? PC.head : "#fff")}; font-weight: ${({ $active }) => ($active ? 700 : 400)};
    & + & { border-left: 1px solid #d5d9e0; }
  `}
`;

const SegBody = styled.div`
  position: relative;
`;
