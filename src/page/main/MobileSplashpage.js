/* eslint-disable */
import React, { useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { watchAuthState } from "../../service/AuthService";
import { getUserProfileByUid } from "../../service/UserProfileService";
import { sendWebReadyOnce } from "../../bridge/webviewBridge";
import { UserContext } from "../../context/User";
import { THEME } from "../../config/homeproConfig";
import { ReactComponent as HomeProSymbol } from "../../assets/icons/homepro-symbol.svg";
import { IoSparkles } from "react-icons/io5";

const twinkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
`;

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

const LogoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Logo = styled.div`
  font-size: 42px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -1px;
  font-family: inherit;
`;

const StarWrap = styled.div`
  color: #FFFFFF;
  animation: ${twinkle} 1.5s ease-in-out infinite;
  display: flex;
  align-items: center;
  margin-top: -8px;
`;

const SubText = styled.div`
  margin-top: 12px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
`;

const MobileSplashpage = () => {
  const navigate = useNavigate();
  const { dispatch } = useContext(UserContext);
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
          // 프로필 없음 (신규) → 닉네임/역할 설정
          navigate("/MobileSetNickname", { replace: true });
          return;
        }

        // 닉네임/역할 미설정 → SetNickname
        if (!profile.name || !profile.role) {
          navigate("/MobileSetNickname", { replace: true });
          return;
        }

        // 전화번호 미등록 (최초 1회만) → LinkPhone
        if (!profile.phoneE164 && !profile.phoneVerified) {
          navigate("/MobileLinkPhone", { replace: true });
          return;
        }

        // 모든 조건 통과 → UserContext 세팅 후 메인
        const primaryUid = profile.uid || user.uid;
        dispatch({
          USERS_ID: primaryUid,
          USERINFO: {
            nickname: profile.nickname || profile.name || "",
            phone: profile.phoneE164 || "",
            userimg: profile.profileImage || profile.photoURL || "",
            intro: profile.intro || "",
          },
        });
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
      <LogoRow>
        <Logo>홈프로</Logo>
        <StarWrap><IoSparkles size={22} /></StarWrap>
      </LogoRow>
      <SubText>각 분야 전문가를 연결하는 실전형 플랫폼</SubText>
    </Container>
  );
};

export default MobileSplashpage;
