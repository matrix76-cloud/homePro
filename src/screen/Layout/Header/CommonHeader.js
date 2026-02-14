/* eslint-disable */
import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoSearchOutline, IoChevronBackOutline } from "react-icons/io5";
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

const LeftBtn = styled.button`
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
`;

const CenterTitle = styled.div`
  font-size: 17px;
  font-weight: 400;
  color: ${THEME.text};
  flex: 1;
  text-align: center;
`;

const RightBtn = styled.button`
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
`;

const CommonHeader = ({ name, hideBack, onSearchClick }) => {
  const navigate = useNavigate();

  return (
    <HeaderWrapper>
      <HeaderInner>
        {!hideBack ? (
          <LeftBtn onClick={() => navigate(-1)}>
            <IoChevronBackOutline size={24} color={THEME.text} />
          </LeftBtn>
        ) : (
          <div style={{ width: 36 }} />
        )}
        <CenterTitle>{name}</CenterTitle>
        <RightBtn onClick={onSearchClick}>
          <IoSearchOutline size={22} color={THEME.text} />
        </RightBtn>
      </HeaderInner>
    </HeaderWrapper>
  );
};

export default CommonHeader;
