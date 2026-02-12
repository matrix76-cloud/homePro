/* eslint-disable */
import React from "react";
import styled from "styled-components";
import CommonHeaderProfile from "../Header/CommonHeaderProfile";
import MobileFooter from "../Footer/MobileFooter";
import { MOBILEMAINMENU } from "../../../utility/constants";

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
  padding-bottom: calc(65px + env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
`;

const MyPageLayout = (props) => {
  return (
    <Container>
      <CommonHeaderProfile name={props.name} />
      <Main>{props.children}</Main>
      <MobileFooter type={MOBILEMAINMENU.CONFIG} />
    </Container>
  );
};

export default MyPageLayout;
