import React from "react";
import styled, { keyframes } from "styled-components";

/**
 * 첫 로딩 화면 — 로그인 상태 · 프로필을 확인하는 1~4초 동안 흰 화면 대신 로고 + 도는 고리.
 * 가드(RequireAuth · RequirePhone), 첫 주소(RootRedirect), 지연 로드(Suspense) 가 함께 쓴다.
 */
const spin = keyframes`to { transform: rotate(360deg); }`;

const Wrap = styled.div`
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding-bottom: 12vh;
`;
const Ring = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid #e3e6eb;
  border-top-color: #00963F;
  animation: ${spin} 0.9s linear infinite;
`;
const Logo = styled.img`
  width: 52px;
  height: 52px;
`;

const AuthLoading = ({ logo = true }) => (
  <Wrap role="status" aria-label="불러오는 중">
    {logo ? <Logo src="/homepro-symbol.svg" alt="" /> : null}
    <Ring />
  </Wrap>
);

export default AuthLoading;
