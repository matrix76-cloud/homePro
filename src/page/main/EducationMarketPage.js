/* eslint-disable */
// 교육.장터 — 기술교육 + 양도·매매 + 자재·장비 3영역을 한 탭에 세그먼트로 통합
import React, { useState } from "react";
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
  const [seg, setSeg] = useState("training");
  return (
    <MainListLayout NAME="교육.장터" footerType="education" hideBack>
      <SegRow>
        {SEGMENTS.map((s) => (
          <SegBtn key={s.key} $active={seg === s.key} onClick={() => setSeg(s.key)}>
            {s.label}
          </SegBtn>
        ))}
      </SegRow>
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
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  cursor: pointer;
  font-family: inherit;
  border: 1px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
  background: ${({ $active }) => ($active ? THEME.primary : THEME.surface)};
  color: ${({ $active }) => ($active ? "#fff" : THEME.text)};
  &:active { opacity: 0.85; }
`;

const SegBody = styled.div`
  position: relative;
`;
