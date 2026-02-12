/* eslint-disable */
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import CommonHeaderHome from "../Header/CommonHeaderHome";
import MobileFooter from "../Footer/MobileFooter";
import RegionSelectModal from "../../../modal/RegionSelectModal";
import { MOBILEMAINMENU } from "../../../utility/constants";
import { UserContext } from "../../../context/User";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
`;

const Main = styled.main`
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  padding-top: calc(env(safe-area-inset-top, 0px) + 52px);
  padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
`;

const HomeLayout = (props) => {
  const navigate = useNavigate();
  const [showRegion, setShowRegion] = useState(false);
  const { user, dispatch } = useContext(UserContext);

  const handleRegionSelect = ({ sido, gu }) => {
    const sidoDisplay = sido.endsWith("시") || sido.endsWith("도") ? sido : `${sido}시`;
    const address = gu === "전체" ? `${sidoDisplay} 전체` : `${sidoDisplay} ${gu}`;
    dispatch({ USERINFO: { address_name: address } });
  };

  // 현재 주소에서 기본값 추출
  const addr = user?.USERINFO?.address_name || "";
  const parts = addr.trim().split(" ");
  const rawSido = (parts[0] || "서울").replace(/시$|도$/, "");
  const defaultRegion = {
    sido: rawSido,
    gu: parts.length >= 2 ? parts.slice(1).join(" ") : "전체",
  };

  return (
    <Container>
      <CommonHeaderHome
        onNotificationClick={props.onNotificationClick}
        onLocationClick={() => setShowRegion(true)}
        onSearchClick={() => navigate("/search")}
      />
      <Main>{props.children}</Main>
      <MobileFooter type={MOBILEMAINMENU.HOME} />
      <RegionSelectModal
        open={showRegion}
        onClose={() => setShowRegion(false)}
        onSelect={handleRegionSelect}
        defaultValue={defaultRegion}
      />
    </Container>
  );
};

export default HomeLayout;
