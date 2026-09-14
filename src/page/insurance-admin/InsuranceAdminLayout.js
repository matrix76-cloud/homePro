import React, { useMemo } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { getAdminIdentity } from "../../service/InsuranceAdminService";
import { INK, LINE, ACTIVE_FILL, FILL_SOFT } from "./insAdminUi";

/* PC 폭 기준 화면. 운영자 /admin 과 분리된 별도 레이아웃 (사이드바 없음, 상단 탭바) */

const Wrap = styled.div`min-height: 100vh; background: #f7f8fa; color: ${INK};`;

const Header = styled.header`
    background: #fff; border-bottom: 1px solid ${LINE};
`;
const HeaderInner = styled.div`
    max-width: 1280px; margin: 0 auto; padding: 0 28px; height: 64px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
`;
const Brand = styled.div`font-size: 19px; font-weight: 700; color: ${INK}; letter-spacing: -0.01em;`;
const BrandSub = styled.span`font-size: 14px; font-weight: 500; color: ${INK}; margin-left: 10px;`;
const HeaderRight = styled.div`display: flex; align-items: center; gap: 10px; font-size: 15px; color: ${INK};`;
const WhoAmI = styled.span`font-weight: 600;`;
const HeaderBtn = styled.button`
    height: 36px; padding: 0 12px; font-size: 14px; font-weight: 600; border: 1px solid ${LINE}; border-radius: 4px;
    background: #fff; color: ${INK}; cursor: pointer; &:hover { background: ${FILL_SOFT}; }
`;
const HeaderLink = styled(Link)`
    height: 36px; padding: 0 12px; font-size: 14px; font-weight: 600; border: 1px solid ${LINE}; border-radius: 4px;
    background: #fff; color: ${INK}; text-decoration: none; display: inline-flex; align-items: center;
    &:hover { background: ${FILL_SOFT}; }
`;

const Body = styled.div`max-width: 1280px; margin: 0 auto; padding: 24px 28px 60px;`;

/* 기준 탭바 — 하나의 박스, 각진 모서리, 탭 사이 세로 구분선, 활성 = 연회색 면 + 굵은 검정 */
const TabBar = styled.nav`
    display: inline-flex; border: 1px solid ${LINE}; background: #fff; margin-bottom: 20px;
`;
const TabItem = styled(NavLink)`
    display: inline-flex; align-items: center; height: 44px; padding: 0 22px; font-size: 15px; font-weight: 500;
    color: ${INK}; text-decoration: none; background: #fff; white-space: nowrap;
    & + & { border-left: 1px solid ${LINE}; }
    &:hover { background: ${FILL_SOFT}; }
    &.active { background: ${ACTIVE_FILL}; font-weight: 700; color: ${INK}; }
`;

/* 탭 전환 때 화면이 커졌다 작아졌다 하지 않게 최소 높이 고정 */
const Content = styled.main`min-height: calc(100vh - 64px - 44px - 20px - 84px);`;

const TABS = [
    { to: "/insurance-admin", label: "대시보드", end: true },
    { to: "/insurance-admin/policies", label: "가입자·배서" },
    { to: "/insurance-admin/settlement", label: "정산 대사" },
    { to: "/insurance-admin/claims", label: "사고 접수" },
    { to: "/insurance-admin/settings", label: "설정" },
];

const InsuranceAdminLayout = () => {
    const nav = useNavigate();
    const { userData, isLoggedIn, logout } = useAuth();
    const admin = useMemo(() => getAdminIdentity(userData), [userData]);
    const isOperatorSession = (() => { try { return !!localStorage.getItem("adminSession"); } catch (e) { return false; } })();

    const handleLogout = async () => {
        if (isLoggedIn) {
            await logout();
            nav("/MobileLogin");
            return;
        }
        try { localStorage.removeItem("adminSession"); } catch (e) { /* ignore */ }
        nav("/admin/login");
    };

    return (
        <Wrap>
            <Header>
                <HeaderInner>
                    <Brand>
                        홈프로 보험대리점 관리자
                        <BrandSub>도급배상책임보험</BrandSub>
                    </Brand>
                    <HeaderRight>
                        <WhoAmI>{admin.adminName}</WhoAmI>
                        {isOperatorSession && <HeaderLink to="/admin">운영자 화면</HeaderLink>}
                        <HeaderBtn onClick={handleLogout}>로그아웃</HeaderBtn>
                    </HeaderRight>
                </HeaderInner>
            </Header>
            <Body>
                <TabBar>
                    {TABS.map((t) => (
                        <TabItem key={t.to} to={t.to} end={t.end}>{t.label}</TabItem>
                    ))}
                </TabBar>
                <Content>
                    <Outlet context={{ admin }} />
                </Content>
            </Body>
        </Wrap>
    );
};

export default InsuranceAdminLayout;
