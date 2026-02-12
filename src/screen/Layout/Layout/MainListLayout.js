/* eslint-disable */
import React from "react";
import styled from "styled-components";
import CommonHeader from "../Header/CommonHeader";
import MobileFooter from "../Footer/MobileFooter";

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

const MainListLayout = (props) => {
  return (
    <Container>
      <CommonHeader
        name={props.NAME}
        hideBack={props.hideBack}
        onSearchClick={props.onSearchClick}
      />
      <Main>{props.children}</Main>
      <MobileFooter type={props.footerType} />
    </Container>
  );
};

export default MainListLayout;
