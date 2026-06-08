/* eslint-disable */
import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { signInWithCustomToken } from "firebase/auth";
import { UserContext } from "../../context/User";
import { signInWithSocial, signInWithEmailPassword, consumeKakaoRedirectIfAny } from "../../service/AuthService";
import { auth } from "../../api/config";
import { THEME, APP_NAME } from "../../config/homeproConfig";

const DEV_BYPASS_IDS = ["test1", "test3"];

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px 12px;
  background: ${THEME.background};
`;

const Logo = styled.div`
  font-size: 36px;
  font-weight: 700;
  color: ${THEME.primary};
  margin-bottom: 8px;
  letter-spacing: -0.03em;
  font-family: inherit;
`;

const Desc = styled.div`
  font-size: 14px;
  color: ${THEME.muted};
  margin-bottom: 40px;
`;

const Input = styled.input`
  width: 100%;
  max-width: 340px;
  padding: 14px 16px;
  margin-bottom: 12px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-size: 15px;
  outline: none;
  font-family: inherit;
  &:focus {
    border-color: ${THEME.primary};
  }
`;

const LoginButton = styled.button`
  width: 100%;
  max-width: 340px;
  padding: 14px;
  background: ${THEME.primary};
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 400;
  cursor: pointer;
  font-family: inherit;
  margin-bottom: 12px;
  &:active {
    background: ${THEME.primaryDark};
  }
`;

const SocialRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
`;

const SocialCircle = styled.button`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: ${({ $bg }) => $bg || "#fff"};
  border: 1px solid ${({ $borderColor }) => $borderColor || THEME.border};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:active {
    opacity: 0.8;
    transform: scale(0.95);
  }
`;

const FindRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 4px;
  margin-bottom: 4px;
`;

const FindLink = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  cursor: pointer;
  &:active { color: ${THEME.text}; }
`;

const FindDivider = styled.span`
  width: 1px;
  height: 12px;
  background: ${THEME.border};
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 340px;
  margin: 20px 0;
  color: ${THEME.muted};
  font-size: 13px;
  &::before, &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: ${THEME.border};
  }
  &::before { margin-right: 12px; }
  &::after { margin-left: 12px; }
`;

const ErrorText = styled.div`
  color: ${THEME.danger};
  font-size: 13px;
  margin-bottom: 12px;
  text-align: center;
`;

const SignupRow = styled.div`
  margin-top: 24px;
  font-size: 14px;
  color: ${THEME.muted};
`;

const SignupLink = styled.span`
  color: ${THEME.primary};
  font-weight: 400;
  cursor: pointer;
  &:active {
    opacity: 0.7;
  }
`;

const MobileLoginpage = () => {
  const navigate = useNavigate();
  const { dispatch } = useContext(UserContext);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // 카카오 로그인 리다이렉트 복귀 처리 (?code= 가 있으면 마무리)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("code")) return;
    setLoading(true);
    consumeKakaoRedirectIfAny()
      .then((res) => {
        if (res?.consumed && res?.success) {
          navigate("/MobileSplash", { replace: true });
        } else if (res?.consumed && !res?.success) {
          setError(res.error_message || "카카오 로그인에 실패했습니다.");
          setLoading(false);
        } else {
          setLoading(false);
        }
      })
      .catch((e) => {
        setError(e?.message || "카카오 로그인에 실패했습니다.");
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEmailLogin = async () => {
    if (!loginId || !password) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");

    if (
      process.env.NODE_ENV === "development" &&
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
      DEV_BYPASS_IDS.includes(loginId.trim())
    ) {
      const SECRET = "homepro-seed-2026-x9k3p";
      const FN_URL = "https://getseedlogintoken-3e76fevucq-du.a.run.app";
      const email = `${loginId.trim()}@homepro.app`;
      try {
        const url = `${FN_URL}?email=${encodeURIComponent(email)}&secret=${SECRET}`;
        const r = await fetch(url);
        const j = await r.json();
        if (!r.ok || !j.token) throw new Error(j.error || "토큰 발급 실패");
        const cred = await signInWithCustomToken(auth, j.token);
        setLoading(false);
        dispatch({ USERS_ID: cred.user.uid });
        navigate("/MobileSplash", { replace: true });
        return;
      } catch (e) {
        setLoading(false);
        setError(`[dev 우회] ${e.message || "로그인 실패"}`);
        return;
      }
    }

    const res = await signInWithEmailPassword({ email: loginId, password });
    setLoading(false);

    if (res.success) {
      dispatch({ USERS_ID: res.uid });
      navigate("/MobileSplash", { replace: true });
    } else {
      setError(res.error_message || "로그인에 실패했습니다.");
    }
  };

  const handleSocialLogin = async (provider) => {
    setLoading(true);
    setError("");
    try {
      const res = await signInWithSocial({ provider });
      if (res.success) {
        navigate("/MobileSplash", { replace: true });
      } else {
        setError(res.error_message || "소셜 로그인에 실패했습니다.");
      }
    } catch (err) {
      console.error("소셜 로그인 실패:", err);
      setError(err.message || "소셜 로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Logo>{APP_NAME}</Logo>
      <Desc>각 분야 전문가를 연결하는 실전형 플랫폼</Desc>

      <Input
        type="text"
        placeholder="아이디"
        value={loginId}
        onChange={(e) => setLoginId(e.target.value)}
        autoComplete="username"
      />
      <Input
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
      />

      {error && <ErrorText>{error}</ErrorText>}

      <LoginButton onClick={handleEmailLogin} disabled={loading}>
        {loading ? "로그인 중..." : "로그인 하기"}
      </LoginButton>

      <FindRow>
        <FindLink onClick={() => navigate("/MobileFindAccount?tab=find_id")}>아이디 찾기</FindLink>
        <FindDivider />
        <FindLink onClick={() => navigate("/MobileFindAccount?tab=reset_pw")}>비밀번호 찾기</FindLink>
      </FindRow>

      <Divider>또는</Divider>

      <SocialRow>
        <SocialCircle $bg="#fff" onClick={() => handleSocialLogin("google")}>
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09A6.96 6.96 0 015.48 12c0-.72.13-1.43.36-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.92.45 3.73 1.18 5.07l3.66-2.98z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </SocialCircle>

        <SocialCircle $bg="#FEE500" $borderColor="#FEE500" onClick={() => handleSocialLogin("kakao")}>
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M12 3C6.48 3 2 6.44 2 10.65c0 2.72 1.8 5.1 4.5 6.45-.15.54-.97 3.46-.99 3.63 0 0-.02.16.08.22.1.06.22.01.22.01.29-.04 3.37-2.21 3.9-2.58.73.11 1.49.17 2.29.17 5.52 0 10-3.44 10-7.9S17.52 3 12 3z" fill="#3C1E1E"/>
          </svg>
        </SocialCircle>

        <SocialCircle $bg="#000" $borderColor="#000" onClick={() => handleSocialLogin("apple")}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.79 16.17 4.36 9.53 8.7 9.29c1.26.06 2.14.72 2.88.76.95-.19 1.86-.76 2.89-.69 1.23.1 2.16.58 2.77 1.5-2.54 1.52-1.94 4.87.39 5.8-.46 1.22-.99 2.42-2.13 3.62h.55zM12.05 9.19c-.13-2.17 1.62-3.96 3.65-4.14.28 2.35-2.13 4.2-3.65 4.14z"/>
          </svg>
        </SocialCircle>
      </SocialRow>

      <SignupRow>
        아직 계정이 없으신가요?{" "}
        <SignupLink onClick={() => navigate("/MobileSignup")}>회원가입</SignupLink>
      </SignupRow>

      {toast && <Toast>{toast}</Toast>}
    </Container>
  );
};

export default MobileLoginpage;

const Toast = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 14px;
  font-weight: 400;
  border-radius: 10px;
  z-index: 9999;
  white-space: nowrap;
  animation: toastFade 2.5s ease;
  @keyframes toastFade {
    0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
    10% { opacity: 1; transform: translateX(-50%) translateY(0); }
    80% { opacity: 1; }
    100% { opacity: 0; }
  }
`;
