/* eslint-disable */
// 교육.장터 — 기술교육 + 양도·매매 + 자재·장비 3영역을 한 탭에 세그먼트로 통합
import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import styled from "styled-components";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import { THEME } from "../../config/homeproConfig";
import TrainingPage from "../training/TrainingPage";
import MarketplacePage from "../order/MarketplacePage";
import SuppliesPage from "../supplies/SuppliesPage";

const SEGMENTS = [
  { key: "training", label: "기술교육" },
  { key: "market", label: "양도·매매" },
  { key: "supplies", label: "자재·장비" },
];

const EducationMarketPage = () => {
  // 마이페이지의 기술전수교육/거래장터 분리 진입 — ?seg= 로 초기 세그먼트 지정 (형 지시 8/8)
  const [searchParams] = useSearchParams();
  const initSeg = SEGMENTS.some((s) => s.key === searchParams.get("seg")) ? searchParams.get("seg") : "training";
  const [seg, setSeg] = useState(initSeg);
  // 마이페이지 '기술전수 수강생모집'에서 들어오면 기술전수 항목만 (대표 9/15 리뷰). 거래장터는 양도·매매·자재·장비만
  const only = searchParams.get("only") === "1";
  const visibleSegs = only
    ? SEGMENTS.filter((s) => (initSeg === "training" ? s.key === "training" : s.key !== "training"))
    : SEGMENTS;
  return (
    <MainListLayout NAME={only && initSeg === "training" ? "기술전수 수강생모집" : "교육.장터"} footerType="education" hideBack={!only}>
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
`;

const SegBody = styled.div`
  position: relative;
`;
