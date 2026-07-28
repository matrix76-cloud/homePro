/* eslint-disable */
import React, { useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { watchAuthState } from "../../service/AuthService";
import { getUserProfileByUid } from "../../service/UserProfileService";
import { sendWebReadyOnce } from "../../bridge/webviewBridge";
import { UserContext } from "../../context/User";
import { ReactComponent as HomeProSymbol } from "../../assets/icons/homepro-symbol.svg";
import { IoSparkles } from "react-icons/io5";

const twinkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
`;

/* 스플래시 배경 — 브랜드 초록으로 전환 (대표님 지시 7/28: 초록 중심).
   로고 심볼도 같은 초록이라, 배경은 한 톤 깊게 잡아 심볼이 떠 보이게 한다.
   (직전까지는 보라 심볼에 맞춘 보라 배경이었음 — 심볼이 초록으로 바뀌면서 함께 전환) */
const SPLASH_BG = "#00A341";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: ${SPLASH_BG};
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
  font-size: 18px;
  color: rgba(255, 255, 255, 0.8);
`;

// 리뷰 허브(/review)는 각 화면을 iframe으로 띄운다. 스플래시는 뜨자마자 로그인/메인으로
// 분기해버려서 화면 자체를 검토할 수 없었음 → 미리보기 안에서는 분기를 멈추고 스플래시를 유지한다.
// (형 지시 7/28) 실제 앱·브라우저에서는 최상위 문서라 기존 분기 그대로 동작.
const isInPreviewFrame = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true; // 크로스오리진이면 접근 자체가 막힘 = iframe 안
  }
};

const MobileSplashpage = () => {
  const navigate = useNavigate();
  const { dispatch } = useContext(UserContext);
  const resolving = useRef(false);

  useEffect(() => {
    sendWebReadyOnce();
    if (isInPreviewFrame()) return; // 리뷰 미리보기 — 스플래시에서 정지

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

        // 전화번호 미등록 → 전화번호 인증 단계 (형 지시 7/28 복원)
        //  번호가 계정 통합의 기준키라 여기를 건너뛰면 같은 사람이 여러 계정으로 갈라진다.
        if (!profile.phoneE164) {
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
