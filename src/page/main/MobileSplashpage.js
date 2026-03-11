/* eslint-disable */
import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { watchAuthState } from "../../service/AuthService";
import { getUserProfileByUid } from "../../service/UserProfileService";
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
  const resolving = useRef(false);

  useEffect(() => {
    sendWebReadyOnce();

    const unsubscribe = watchAuthState(async (user) => {
      if (resolving.current) return;
      resolving.current = true;

      if (!user?.uid) {
        setTimeout(() => {
          navigate("/MobileLogin", { replace: true });
        }, 1500);
        return;
      }

      try {
        const profile = await getUserProfileByUid(user.uid);

        if (!profile) {
          // 프로필 없음 (소셜 신규) → 전화번호 인증
          navigate("/MobileLinkPhone", { replace: true });
          return;
        }

        // 전화번호 미인증 → LinkPhone
        if (!profile.phoneE164 && !profile.phoneVerified) {
          navigate("/MobileLinkPhone", { replace: true });
          return;
        }

        // 닉네임/역할 미설정 → SetNickname
        if (!profile.name || !profile.role) {
          navigate("/MobileSetNickname", { replace: true });
          return;
        }

        // 모든 조건 통과 → 메인
        navigate("/MobileMain", { replace: true });
      } catch (err) {
        console.error("Splash 분기 실패:", err);
        navigate("/MobileLogin", { replace: true });
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
