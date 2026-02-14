/* eslint-disable */
import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoChevronBackOutline } from "react-icons/io5";
import { THEME } from "../../../config/homeproConfig";

const HeaderWrapper = styled.div`
  position: fixed;
  top: env(safe-area-inset-top, 0px);
  left: 0;
  right: 0;
  z-index: 999;
  background: #fff;
  height: 52px;
  border-bottom: 1px solid ${THEME.border};
  box-sizing: border-box;
`;

const HeaderInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 12px;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
`;

const BackBtn = styled.button`
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
`;

const Title = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${THEME.text};
  margin-left: 4px;
`;

const BackHeader = ({ name, onBack, rightAction }) => {
  const navigate = useNavigate();

  return (
    <HeaderWrapper>
      <HeaderInner>
        <LeftSection>
          <BackBtn onClick={onBack || (() => navigate(-1))}>
            <IoChevronBackOutline size={24} color={THEME.text} />
          </BackBtn>
          <Title>{name}</Title>
        </LeftSection>
        <RightSection>
          {rightAction}
        </RightSection>
      </HeaderInner>
    </HeaderWrapper>
  );
};

export default BackHeader;
