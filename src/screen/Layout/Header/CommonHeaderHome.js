/* eslint-disable */
import React, { useContext } from "react";
import styled from "styled-components";
import { IoCalendarOutline, IoLocationOutline, IoSearchOutline, IoNotificationsOutline } from "react-icons/io5";
import { THEME } from "../../../config/homeproConfig";
import { UserContext } from "../../../context/User";
import LogoIcon from "../../../assets/icons/homepro-symbol.svg";

const CommonHeaderHome = ({ onCalendarClick, onLocationClick, onSearchClick, onNoticeClick }) => {
  const { user } = useContext(UserContext);
  const address = user?.USERINFO?.address_name || "서울시 중구";

  return (
    <HeaderWrapper>
      <HeaderInner>
        <LeftSection>
          <AppLogo src={LogoIcon} alt="홈프로" />
          <LocationWrap onClick={onLocationClick}>
            <IoLocationOutline size={16} color={THEME.text} />
            <LocationText>{address}</LocationText>
          </LocationWrap>
        </LeftSection>
        <RightSection>
          <IconBtn onClick={onSearchClick}>
            <IoSearchOutline size={20} color={THEME.text} />
          </IconBtn>
          <IconBtn onClick={onCalendarClick}>
            <IoCalendarOutline size={20} color={THEME.text} />
          </IconBtn>
          <IconBtn onClick={onNoticeClick}>
            <IoNotificationsOutline size={20} color={THEME.text} />
          </IconBtn>
        </RightSection>
      </HeaderInner>
    </HeaderWrapper>
  );
};

export default CommonHeaderHome;

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
  padding: 0 16px;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AppLogo = styled.img`
  width: 30px;
  height: 30px;
  border-radius: 6px;
`;

const LocationWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  &:active { opacity: 0.6; }
`;

const LocationText = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.text};
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const IconBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:active { background: ${THEME.background}; }
`;
