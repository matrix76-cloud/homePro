/* eslint-disable */
/**
 * PC 위 메뉴 — 폭 900 이상·앱 밖에서만 뜬다 (형 9/20 "위 메뉴는 실제 동작, 홍보는 홈에서만").
 *  · 로그인 전: 홈(홍보 /intro) + 실제 메뉴, 오른쪽 로그인·가입
 *  · 로그인 후: 실제 메뉴, 오른쪽 채팅·마이·이름 (로고 = 오더목록)
 * 폰·앱(WebView)은 이 헤더 없이 기존 하단 탭을 그대로 쓴다.
 */
import React from "react";
import styled from "styled-components";
import { useLocation, useNavigate } from "react-router-dom";
import { FiMessageCircle, FiUser } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

export const PC_HEADER_H = 68;

// match: 지금 주소가 이 메뉴에 해당하는지
const MENU = [
  { label: "오더목록", to: "/MobileMain?tab=all_orders", match: (p, t) => p === "/MobileMain" && (!t || t === "all_orders") },
  { label: "나의 오더", to: "/MobileMain?tab=my_orders", match: (p, t) => (p === "/MobileMain" && t === "my_orders") || p.startsWith("/order/my-orders") || p === "/my-orders" },
  { label: "AI 견적", to: "/MobileMain?tab=ai_estimate", match: (p, t) => (p === "/MobileMain" && t === "ai_estimate") || p.startsWith("/order/ai-estimate") },
  { label: "공동중개", to: "/brokerage", match: (p) => p.startsWith("/brokerage") },
  { label: "교육·장터", to: "/education-market", match: (p) => p.startsWith("/education-market") || p.startsWith("/training") || p.startsWith("/supplies") },
  { label: "안심케어", to: "/insurance", match: (p) => p.startsWith("/insurance") },
];

const PcHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, isLoggedIn } = useAuth();
  const path = location.pathname;
  const tab = new URLSearchParams(location.search).get("tab");
  const loggedIn = !!(isLoggedIn ?? userData);
  const name = userData?.companyName || userData?.nickname || userData?.name || "";

  const items = loggedIn ? MENU : [{ label: "홈", to: "/intro", match: (p) => p === "/intro" }, ...MENU];

  return (
    <Bar>
      <Inner>
        <Logo onClick={() => navigate(loggedIn ? "/MobileMain?tab=all_orders" : "/intro")}>홈프로</Logo>
        <Nav>
          {items.map((m) => (
            <NavItem key={m.label} $on={m.match(path, tab)} onClick={() => navigate(m.to)}>{m.label}</NavItem>
          ))}
        </Nav>
        {loggedIn ? (
          <Right>
            <IconBtn onClick={() => navigate("/MobileChat")} $on={path.startsWith("/MobileChat") || path.startsWith("/chat/")}><FiMessageCircle size={21} />채팅</IconBtn>
            <IconBtn onClick={() => navigate("/MobileConfig")} $on={path.startsWith("/MobileConfig")}><FiUser size={21} />마이</IconBtn>
            {name && <Name><b>{name}</b> 님</Name>}
          </Right>
        ) : (
          <Right>
            <LoginBtn onClick={() => navigate("/MobileLogin")}>로그인</LoginBtn>
            <SignupBtn onClick={() => navigate("/MobileSignup")}>사업자 가입하기</SignupBtn>
          </Right>
        )}
      </Inner>
    </Bar>
  );
};

export default PcHeader;

const Bar = styled.header`
  position: fixed; top: 0; left: 0; right: 0; z-index: 1200; height: ${PC_HEADER_H}px;
  background: #fff; border-bottom: 1px solid #dfe3e8; box-sizing: border-box; word-break: keep-all;
`;
const Inner = styled.div`
  max-width: 1280px; height: 100%; margin: 0 auto; padding: 0 56px; box-sizing: border-box;
  display: flex; align-items: center; gap: 40px;
  @media (max-width: 1100px) { padding: 0 24px; gap: 24px; }
`;
const Logo = styled.div` font-size: 25px; font-weight: 800; color: #00963F; cursor: pointer; flex: 0 0 auto; `;
const Nav = styled.nav` display: flex; gap: 28px; height: 100%; flex: 1; min-width: 0; @media (max-width: 1100px) { gap: 18px; } `;
const NavItem = styled.button`
  border: none; background: none; padding: 0; height: 100%; cursor: pointer; font-family: inherit; white-space: nowrap;
  font-size: 16px; color: #14181F; font-weight: ${({ $on }) => ($on ? 800 : 500)};
  box-shadow: ${({ $on }) => ($on ? "inset 0 -3px 0 #00963F" : "none")};
  &:hover { color: #00963F; }
`;
const Right = styled.div` display: flex; align-items: center; gap: 10px; flex: 0 0 auto; `;
const IconBtn = styled.button`
  border: none; background: none; cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px;
  font-size: 15px; padding: 8px 8px; color: ${({ $on }) => ($on ? "#00963F" : "#14181F")}; font-weight: ${({ $on }) => ($on ? 800 : 500)};
  &:hover { color: #00963F; }
`;
const Name = styled.span` font-size: 15px; color: #14181F; margin-left: 6px; b { font-weight: 800; } `;
const LoginBtn = styled.button`
  border: 1px solid #dfe3e8; background: #fff; color: #14181F; font-weight: 700; font-size: 15px; font-family: inherit;
  padding: 10px 18px; border-radius: 10px; cursor: pointer; white-space: nowrap;
  &:hover { border-color: #00963F; color: #00963F; }
`;
const SignupBtn = styled.button`
  border: none; background: #00963F; color: #fff; font-weight: 700; font-size: 15px; font-family: inherit;
  padding: 11px 18px; border-radius: 10px; cursor: pointer; white-space: nowrap;
  &:hover { background: #007A33; }
`;
