/* eslint-disable */
import React from "react";
import styled from "styled-components";
import BackHeader from "../Header/BackHeader";
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
  padding-bottom: ${({ $hideFooter }) =>
    $hideFooter ? "0px" : "calc(65px + env(safe-area-inset-bottom, 0px))"};
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
`;

const SimpleBackLayout = (props) => {
  return (
    <Container>
      <BackHeader name={props.NAME} onBack={props.onBack} rightAction={props.rightAction} />
      <Main $hideFooter={props.hideFooter}>{props.children}</Main>
      {!props.hideFooter && <MobileFooter type={props.type} />}
    </Container>
  );
};

export default SimpleBackLayout;
