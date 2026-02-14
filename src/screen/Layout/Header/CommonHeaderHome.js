/* eslint-disable */
import React, { useContext } from "react";
import styled from "styled-components";
import { IoNotificationsOutline, IoLocationOutline, IoSearchOutline } from "react-icons/io5";
import { THEME } from "../../../config/homeproConfig";
import { UserContext } from "../../../context/User";

const CommonHeaderHome = ({ onNotificationClick, onLocationClick, onSearchClick }) => {
  const { user } = useContext(UserContext);
  const address = user?.USERINFO?.address_name || "서울시 중구";

  return (
    <HeaderWrapper>
      <HeaderInner>
        <LeftSection>
          <AppTitle>홈프로</AppTitle>
          <LocationWrap onClick={onLocationClick}>
            <IoLocationOutline size={16} color={THEME.text} />
            <LocationText>{address}</LocationText>
          </LocationWrap>
        </LeftSection>
        <RightSection>
          <IconBtn onClick={onSearchClick}>
            <IoSearchOutline size={22} color={THEME.text} />
          </IconBtn>
          <IconBtn onClick={onNotificationClick}>
            <IoNotificationsOutline size={22} color={THEME.text} />
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
  padding: 0 16px;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AppTitle = styled.div`
  font-size: 20px;
  font-weight: 800;
  color: ${THEME.text};
  letter-spacing: -0.03em;
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
  gap: 8px;
`;

const IconBtn = styled.button`
  width: 36px;
  height: 36px;
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
