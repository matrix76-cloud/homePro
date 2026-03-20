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
  max-width: 400px;
  z-index: 999;
  background: #fff;
  height: 52px;
  border-bottom: 1px solid ${THEME.border};
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
`;

const Title = styled.div`
  font-size: 18px;
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
