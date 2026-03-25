/* eslint-disable */
import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoSearchOutline, IoChevronBackOutline, IoCalendarOutline, IoNotificationsOutline, IoLocationOutline } from "react-icons/io5";
import { THEME } from "../../../config/homeproConfig";

const CommonHeader = ({ name, hideBack, onSearchClick, hideActions, location }) => {
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
        {location ? (
          <LocationWrap>
            <IoLocationOutline size={14} color={THEME.text} />
            <LocationLabel>{location}</LocationLabel>
          </LocationWrap>
        ) : !hideActions ? (
          <RightActions>
            <IconBtn onClick={onSearchClick || (() => navigate("/search"))}>
              <IoSearchOutline size={21} color={THEME.text} />
            </IconBtn>
            <IconBtn onClick={() => navigate("/calendar")}>
              <IoCalendarOutline size={20} color={THEME.text} />
            </IconBtn>
            <IconBtn onClick={() => navigate("/notice")}>
              <IoNotificationsOutline size={21} color={THEME.text} />
            </IconBtn>
          </RightActions>
        ) : (
          <div style={{ width: 36 }} />
        )}
      </HeaderInner>
    </HeaderWrapper>
  );
};

export default CommonHeader;

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

const RightActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const IconBtn = styled.button`
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  &:active { opacity: 0.5; }
`;

const LocationWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

const LocationLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.text};
  white-space: nowrap;
`;
