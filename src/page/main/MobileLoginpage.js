/* eslint-disable */
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { UserContext } from "../../context/User";
import { signInWithSocial, signInWithEmailPassword } from "../../service/AuthService";
import { THEME, APP_NAME } from "../../config/homeproConfig";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: ${THEME.background};
`;

const Logo = styled.div`
  font-size: 36px;
  font-weight: 700;
  color: ${THEME.primary};
  margin-bottom: 8px;
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
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  margin-bottom: 12px;
  &:active {
    background: ${THEME.primaryDark};
  }
`;

const SocialButton = styled.button`
  width: 100%;
  max-width: 340px;
  padding: 14px 16px;
  background: ${({ $bg }) => $bg || "#fff"};
  color: ${({ $color }) => $color || "#333"};
  border: 1px solid ${({ $borderColor }) => $borderColor || THEME.border};
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  &:active {
    opacity: 0.8;
  }
`;

const SocialIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
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
  font-weight: 600;
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
  font-weight: 700;
  cursor: pointer;
  &:active {
    opacity: 0.7;
  }
`;

const MobileLoginpage = () => {
  const navigate = useNavigate();
  const { dispatch } = useContext(UserContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");

    const res = await signInWithEmailPassword({ email, password });
    setLoading(false);

    if (res.success) {
      dispatch({ USERS_ID: res.uid });
      navigate("/MobileMain", { replace: true });
    } else {
      setError(res.error_message || "로그인에 실패했습니다.");
    }
  };

  const handleSocialLogin = (provider) => {
    showToast("소셜 로그인 기능 준비중입니다.");
  };

  return (
    <Container>
      <Logo>{APP_NAME}</Logo>
      <Desc>각 분야 전문가를 연결하는 실전형 플랫폼</Desc>

      <Input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
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

      <SocialButton $bg="#fff" $color="#333" onClick={() => handleSocialLogin("google")}>
        <SocialIcon>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09A6.96 6.96 0 015.48 12c0-.72.13-1.43.36-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.92.45 3.73 1.18 5.07l3.66-2.98z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </SocialIcon>
        Google로 로그인하기
      </SocialButton>

      <SocialButton $bg="#FEE500" $color="#3C1E1E" $borderColor="#FEE500" onClick={() => handleSocialLogin("kakao")}>
        <SocialIcon>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M12 3C6.48 3 2 6.44 2 10.65c0 2.72 1.8 5.1 4.5 6.45-.15.54-.97 3.46-.99 3.63 0 0-.02.16.08.22.1.06.22.01.22.01.29-.04 3.37-2.21 3.9-2.58.73.11 1.49.17 2.29.17 5.52 0 10-3.44 10-7.9S17.52 3 12 3z" fill="#3C1E1E"/>
          </svg>
        </SocialIcon>
        카카오로 로그인하기
      </SocialButton>

      <SocialButton $bg="#000" $color="#fff" $borderColor="#000" onClick={() => handleSocialLogin("apple")}>
        <SocialIcon>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.79 16.17 4.36 9.53 8.7 9.29c1.26.06 2.14.72 2.88.76.95-.19 1.86-.76 2.89-.69 1.23.1 2.16.58 2.77 1.5-2.54 1.52-1.94 4.87.39 5.8-.46 1.22-.99 2.42-2.13 3.62h.55zM12.05 9.19c-.13-2.17 1.62-3.96 3.65-4.14.28 2.35-2.13 4.2-3.65 4.14z"/>
          </svg>
        </SocialIcon>
        Apple로 로그인하기
      </SocialButton>

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
  font-weight: 600;
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
