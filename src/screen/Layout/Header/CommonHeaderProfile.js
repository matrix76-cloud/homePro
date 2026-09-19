/* eslint-disable */
import React from "react";
import styled from "styled-components";
import { THEME } from "../../../config/homeproConfig";

const HeaderWrapper = styled.div`
  position: fixed;
  top: env(safe-area-inset-top, 0px);
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: var(--app-max, 400px);
  z-index: 999;
  background: #fff;
  height: 52px;
  border-bottom: 1px solid ${THEME.border};
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  .pc-mode & { justify-content: flex-start; padding: 0 32px; } /* PC 제목 줄 — 다른 헤더와 같이 왼쪽 굵게 */
`;

const Title = styled.div`
  .pc-mode & { font-size: 22px; font-weight: 800; }
  font-size: 20px;
  font-weight: 400;
  color: ${THEME.text};
`;

const CommonHeaderProfile = ({ name = "마이페이지" }) => {
  return (
    <HeaderWrapper>
      <Title>{name}</Title>
    </HeaderWrapper>
  );
};

export default CommonHeaderProfile;
