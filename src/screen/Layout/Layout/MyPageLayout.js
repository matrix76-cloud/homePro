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
  max-width: 400px;
  margin: 0 auto;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.08);
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
  background: #F7F8FA;
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
