/* eslint-disable */
import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import CommonHeader from "../Header/CommonHeader";
import MobileFooter from "../Footer/MobileFooter";

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
  padding-bottom: ${({ $hideFooter }) => $hideFooter ? "0px" : "calc(65px + env(safe-area-inset-bottom, 0px))"};
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  background: #F7F8FA;
`;

const MainListLayout = (props) => {
  const navigate = useNavigate();
  return (
    <Container>
      <CommonHeader
        name={props.NAME}
        hideBack={props.hideBack}
        onSearchClick={props.onSearchClick || (() => navigate("/search"))}
        hideActions={!props.hideBack}
        location={props.location}
      />
      <Main $hideFooter={props.hideFooter}>{props.children}</Main>
      {!props.hideFooter && <MobileFooter type={props.footerType} />}
    </Container>
  );
};

export default MainListLayout;
