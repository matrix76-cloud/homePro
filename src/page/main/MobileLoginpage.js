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
  padding: 14px;
  background: ${({ $bg }) => $bg || "#fff"};
  color: ${({ $color }) => $color || "#333"};
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  margin-bottom: 8px;
  &:active {
    opacity: 0.8;
  }
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

  const handleEmailLogin = async () => {
    // TODO: 테스트용 바이패스 — 나중에 제거
    navigate("/MobileMain", { replace: true });
    return;

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

  const handleSocialLogin = async (provider) => {
    setLoading(true);
    setError("");

    const res = await signInWithSocial({ provider });
    setLoading(false);

    if (res.success && res.uid) {
      dispatch({ USERS_ID: res.uid });
      navigate("/MobileMain", { replace: true });
    } else if (!res.success) {
      setError(res.error_message || "로그인에 실패했습니다.");
    }
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
        {loading ? "로그인 중..." : "로그인"}
      </LoginButton>

      <Divider>또는</Divider>

      <SocialButton $bg="#fff" $color="#333" onClick={() => handleSocialLogin("google")}>
        Google로 계속하기
      </SocialButton>
      <SocialButton $bg="#FEE500" $color="#3C1E1E" onClick={() => handleSocialLogin("kakao")}>
        카카오로 계속하기
      </SocialButton>

      <SignupRow>
        아직 계정이 없으신가요?{" "}
        <SignupLink onClick={() => navigate("/MobileSignup")}>가입하기</SignupLink>
      </SignupRow>
    </Container>
  );
};

export default MobileLoginpage;
