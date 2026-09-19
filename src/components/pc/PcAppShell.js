/* eslint-disable */
/**
 * PC 앱 틀 — 왼쪽 세로 메뉴 + 위 가는 줄 (시안 랩 pcshell 3번, 형 9/20).
 *  · 홍보 화면(/intro)은 위 메뉴(PcHeader)를 쓰고, 그 밖의 앱 화면은 이 틀을 쓴다
 *  · 폭 900 이상·앱(WebView) 밖에서만. 폰·앱은 기존 하단 탭 그대로
 */
import React from "react";
import styled from "styled-components";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiList, FiClipboard, FiCpu, FiHome, FiBookOpen, FiShield, FiMessageCircle, FiUser, FiSearch, FiCalendar, FiBell,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

export const PC_SIDE_W = 220;
export const PC_TOP_H = 60;

// match: 지금 주소가 이 메뉴에 해당하는지 (t = ?tab=)
const MENU = [
  { label: "오더목록", icon: <FiList />, to: "/MobileMain?tab=all_orders", match: (p, t) => (p === "/MobileMain" && (!t || t === "all_orders")) || p.startsWith("/order/detail") || p === "/order/create" },
  { label: "나의 오더", icon: <FiClipboard />, to: "/MobileMain?tab=my_orders", match: (p, t) => (p === "/MobileMain" && t === "my_orders") || p.startsWith("/order/my-orders") || p === "/my-orders" },
  { label: "AI 견적", icon: <FiCpu />, to: "/MobileMain?tab=ai_estimate", match: (p, t) => (p === "/MobileMain" && t === "ai_estimate") || p.startsWith("/order/ai-estimate") },
  { label: "공동중개", icon: <FiHome />, to: "/brokerage", match: (p) => p.startsWith("/brokerage") },
  { label: "교육·장터", icon: <FiBookOpen />, to: "/education-market", match: (p) => p.startsWith("/education-market") || p.startsWith("/training") || p.startsWith("/supplies") },
  { label: "안심케어", icon: <FiShield />, to: "/insurance", match: (p) => p.startsWith("/insurance") },
  { label: "채팅", icon: <FiMessageCircle />, to: "/MobileChat", match: (p) => p.startsWith("/MobileChat") || p.startsWith("/chat/") },
  { label: "마이", icon: <FiUser />, to: "/MobileConfig", match: (p) => p.startsWith("/MobileConfig") || p.startsWith("/biz-profile") },
];

export const PcSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();
  const tab = new URLSearchParams(location.search).get("tab");
  return (
    <Side>
      <Logo onClick={() => navigate(isLoggedIn ? "/MobileMain?tab=all_orders" : "/intro")}>홈프로</Logo>
      <nav>
        {MENU.map((m) => (
          <Item key={m.label} $on={m.match(location.pathname, tab)} onClick={() => navigate(m.to)}>
            {m.icon}<span>{m.label}</span>
          </Item>
        ))}
      </nav>
      <SideFoot>
        <FootLink onClick={() => navigate("/notice")}>공지사항</FootLink>
        <FootLink onClick={() => navigate("/support")}>고객센터</FootLink>
        <FootLink onClick={() => navigate("/intro")}>홈프로 소개</FootLink>
      </SideFoot>
    </Side>
  );
};

export const PcTopBar = () => {
  const navigate = useNavigate();
  const { userData, isLoggedIn } = useAuth();
  const name = userData?.companyName || userData?.nickname || userData?.name || "";
  const points = Number(userData?.referralPoints || userData?.points || 0);
  return (
    <Top>
      {isLoggedIn ? (
        <>
          <TopIcon onClick={() => navigate("/search")} aria-label="검색"><FiSearch size={20} /></TopIcon>
          <TopIcon onClick={() => navigate("/calendar")} aria-label="일정"><FiCalendar size={20} /></TopIcon>
          <TopIcon onClick={() => navigate("/notice")} aria-label="알림"><FiBell size={20} /></TopIcon>
          <Who onClick={() => navigate("/MobileConfig")}>
            {name && <><b>{name}</b> 님</>}
            <Pt onClick={(e) => { e.stopPropagation(); navigate("/MobileMain?tab=assets"); }}>{points.toLocaleString()}P</Pt>
          </Who>
        </>
      ) : (
        <>
          <LoginBtn onClick={() => navigate("/MobileLogin")}>로그인</LoginBtn>
          <SignupBtn onClick={() => navigate("/MobileSignup")}>사업자 가입하기</SignupBtn>
        </>
      )}
    </Top>
  );
};

const Side = styled.aside`
  position: fixed; top: 0; left: 0; bottom: 0; width: ${PC_SIDE_W}px; z-index: 1200; box-sizing: border-box;
  background: #fff; border-right: 1px solid #dfe3e8; display: flex; flex-direction: column; word-break: keep-all;
`;
const Logo = styled.div` font-size: 26px; font-weight: 800; color: #00963F; cursor: pointer; padding: 22px 24px 20px; `;
const Item = styled.button`
  width: 100%; border: none; cursor: pointer; font-family: inherit; text-align: left;
  display: flex; align-items: center; gap: 12px; padding: 14px 24px; font-size: 16px; color: #14181F;
  background: ${({ $on }) => ($on ? "#e9ecf1" : "transparent")}; font-weight: ${({ $on }) => ($on ? 800 : 500)};
  svg { font-size: 19px; flex: 0 0 auto; }
  &:hover { background: ${({ $on }) => ($on ? "#e9ecf1" : "#f4f6f8")}; }
`;
const SideFoot = styled.div` margin-top: auto; padding: 16px 24px 22px; border-top: 1px solid #dfe3e8; display: grid; gap: 10px; `;
const FootLink = styled.span` font-size: 15px; color: #14181F; cursor: pointer; &:hover { color: #00963F; } `;

const Top = styled.div`
  position: fixed; top: 0; left: ${PC_SIDE_W}px; right: 0; height: ${PC_TOP_H}px; z-index: 1190; box-sizing: border-box;
  background: #fff; border-bottom: 1px solid #dfe3e8; padding: 0 32px;
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
`;
const TopIcon = styled.button`
  border: none; background: none; cursor: pointer; width: 40px; height: 40px; color: #14181F;
  display: flex; align-items: center; justify-content: center; &:hover { color: #00963F; }
`;
const Who = styled.div` font-size: 15px; color: #14181F; cursor: pointer; margin-left: 8px; display: flex; align-items: center; gap: 10px; b { font-weight: 800; } `;
const Pt = styled.span` font-weight: 800; color: #00963F; `;
const LoginBtn = styled.button`
  border: 1px solid #dfe3e8; background: #fff; color: #14181F; font-weight: 700; font-size: 15px; font-family: inherit;
  padding: 9px 18px; border-radius: 10px; cursor: pointer; &:hover { border-color: #00963F; color: #00963F; }
`;
const SignupBtn = styled.button`
  border: none; background: #00963F; color: #fff; font-weight: 700; font-size: 15px; font-family: inherit;
  padding: 10px 18px; border-radius: 10px; cursor: pointer; &:hover { background: #007A33; }
`;
