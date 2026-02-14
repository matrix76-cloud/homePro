/* eslint-disable */
import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { UserContext } from "../../context/User";
import { watchAuthState } from "../../service/AuthService";
import { sendWebReadyOnce } from "../../bridge/webviewBridge";
import { THEME } from "../../config/homeproConfig";
import { ReactComponent as HomeProSymbol } from "../../assets/icons/homepro-symbol.svg";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: ${THEME.primary};
`;

const SymbolWrap = styled.div`
  width: 120px;
  height: 120px;
  margin-bottom: 24px;
  svg { width: 100%; height: 100%; }
`;

const Logo = styled.div`
  font-size: 42px;
  font-weight: 400;
  color: #fff;
  letter-spacing: -1px;
`;

const SubText = styled.div`
  margin-top: 12px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
`;

const MobileSplashpage = () => {
  const navigate = useNavigate();
  const { dispatch } = useContext(UserContext);

  useEffect(() => {
    sendWebReadyOnce();

    const unsubscribe = watchAuthState((user) => {
      if (user?.uid) {
        dispatch({
          USERS_ID: user.uid,
          USERINFO: { nickname: user.displayName || "", userimg: user.photoURL || "" },
        });
        navigate("/MobileMain", { replace: true });
      } else {
        setTimeout(() => {
          navigate("/MobileLogin", { replace: true });
        }, 1500);
      }
    });

    return () => unsubscribe?.();
  }, []);

  return (
    <Container>
      <SymbolWrap>
        <HomeProSymbol />
      </SymbolWrap>
      <Logo>HomePro</Logo>
      <SubText>각 분야 전문가를 연결하는 실전형 플랫폼</SubText>
    </Container>
  );
};

export default MobileSplashpage;
