/* eslint-disable */
import React, { useState, useMemo } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import {
    IoGridOutline, IoPeopleOutline, IoLinkOutline, IoChatbubblesOutline,
    IoMegaphoneOutline, IoWalletOutline, IoNewspaperOutline, IoCloudDownloadOutline,
    IoSettingsOutline, IoLogOutOutline, IoCashOutline, IoChevronDownOutline,
    IoTimeOutline, IoChevronForwardOutline, IoHomeOutline,
} from "react-icons/io5";

const Wrap = styled.div`display: flex; min-height: 100vh; background: ${THEME.background};`;

const Sidebar = styled.aside`
    width: 220px; min-height: 100vh; background: #1E293B; display: flex; flex-direction: column;
    position: fixed; left: 0; top: 0; bottom: 0; z-index: 100;
`;
const Logo = styled.div`
    padding: 24px 20px 20px; font-size: 18px; font-weight: 700; color: #fff;
    border-bottom: 1px solid rgba(255,255,255,0.08);
`;
const Nav = styled.nav`flex: 1; padding: 12px 8px; overflow-y: auto;`;

const MenuItem = styled(NavLink)`
    display: flex; align-items: center; gap: 10px; padding: 10px 14px;
    border-radius: 4px; font-size: 14px; color: #94A3B8; text-decoration: none;
    margin-bottom: 2px; transition: all 0.15s;
    &:hover { background: rgba(255,255,255,0.06); color: #E2E8F0; }
    &.active { background: ${THEME.primary}; color: #fff; font-weight: 600; }
    svg { font-size: 18px; flex-shrink: 0; }
`;

const MenuGroup = styled.button`
    display: flex; align-items: center; gap: 10px; padding: 10px 14px; width: 100%;
    border-radius: 4px; font-size: 14px; color: ${p => p.$active ? "#E2E8F0" : "#94A3B8"};
    background: ${p => p.$active ? "rgba(255,255,255,0.06)" : "none"};
    border: none; cursor: pointer; margin-bottom: 2px; transition: all 0.15s; text-align: left;
    &:hover { background: rgba(255,255,255,0.06); color: #E2E8F0; }
    svg { font-size: 18px; flex-shrink: 0; }
`;

const ChevronIcon = styled(IoChevronDownOutline)`
    margin-left: auto; font-size: 14px !important;
    transform: ${p => p.$open ? "rotate(180deg)" : "rotate(0)"};
    transition: transform 0.2s;
`;

const SubMenu = styled.div`
    overflow: hidden;
    max-height: ${p => p.$open ? "200px" : "0"};
    transition: max-height 0.25s ease;
`;

const SubMenuItem = styled(NavLink)`
    display: block; padding: 8px 14px 8px 44px;
    font-size: 13px; color: #94A3B8; text-decoration: none;
    border-radius: 4px; margin-bottom: 1px; transition: all 0.15s;
    &:hover { background: rgba(255,255,255,0.06); color: #E2E8F0; }
    &.active { color: ${THEME.primaryLight}; font-weight: 600; background: rgba(37,99,235,0.12); }
`;


const Content = styled.main`
    flex: 1; margin-left: 220px; min-height: 100vh; display: flex; flex-direction: column;
`;

const Topbar = styled.div`
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 24px; background: #fff; border-bottom: 1px solid ${THEME.border};
    position: sticky; top: 0; z-index: 50;
`;

const TopbarLeft = styled.div`
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: ${THEME.muted};
    svg { font-size: 15px; }
`;

const TopbarRight = styled.div`
    display: flex; align-items: center; gap: 16px;
`;

const AdminName = styled.span`font-size: 13px; font-weight: 600; color: ${THEME.text};`;

const TopbarLogout = styled.button`
    display: flex; align-items: center; gap: 5px; padding: 5px 12px;
    border: 1px solid ${THEME.border}; background: #fff; border-radius: 4px;
    font-size: 12px; color: ${THEME.muted}; cursor: pointer; transition: all 0.15s;
    &:hover { background: ${THEME.background}; color: ${THEME.text}; }
    svg { font-size: 14px; }
`;

const BreadcrumbBar = styled.div`
    display: flex; align-items: center; gap: 6px;
    padding: 10px 24px; background: #fff; border-bottom: 1px solid ${THEME.border};
`;

const BreadcrumbLink = styled(NavLink)`
    display: flex; align-items: center; gap: 4px;
    font-size: 13px; color: ${THEME.muted}; text-decoration: none;
    &:hover { color: ${THEME.primary}; }
`;

const BreadcrumbCurrent = styled.span`
    font-size: 13px; font-weight: 600; color: ${THEME.text};
`;

const ContentBody = styled.div`
    flex: 1; padding: 24px;
`;

const MENUS = [
    { to: "/admin", icon: IoGridOutline, label: "대시보드", end: true },
    {
        icon: IoPeopleOutline, label: "회원관리", groupKey: "users",
        sub: [
            { to: "/admin/users", label: "전체 회원 목록", end: true },
            { to: "/admin/users/general", label: "일반 사용자 회원" },
            { to: "/admin/users/pro", label: "사업자(프로) 회원" },
        ],
    },
    {
        icon: IoLinkOutline, label: "매칭관리", groupKey: "matching",
        sub: [
            { to: "/admin/matching", label: "전체 매칭 내역", end: true },
            { to: "/admin/matching/requested", label: "견적 요청중" },
            { to: "/admin/matching/matched", label: "매칭 완료 건" },
            { to: "/admin/matching/in_progress", label: "시공 진행중" },
            { to: "/admin/matching/completed", label: "시공 완료 건" },
            { to: "/admin/matching/cancelled", label: "취소/환불 건" },
        ],
    },
    {
        icon: IoChatbubblesOutline, label: "채팅관리", groupKey: "chat",
        sub: [
            { to: "/admin/chat", label: "전체 채팅방", end: true },
            { to: "/admin/chat/active", label: "활성 채팅방" },
            { to: "/admin/chat/flagged", label: "관심 등록 채팅" },
            { to: "/admin/chat/closed", label: "종료된 채팅방" },
        ],
    },
    {
        icon: IoMegaphoneOutline, label: "광고관리", groupKey: "ads",
        sub: [
            { to: "/admin/ads", label: "상단 배너 관리", end: true },
            { to: "/admin/ads/middle", label: "중간 배너 관리" },
            { to: "/admin/ads/settings", label: "설정 페이지 배너" },
            { to: "/admin/ads/popup", label: "팝업 광고 관리" },
        ],
    },
    {
        icon: IoWalletOutline, label: "포인트관리", groupKey: "points",
        sub: [
            { to: "/admin/points", label: "전체 포인트 내역", end: true },
            { to: "/admin/points/earn", label: "포인트 적립 내역" },
            { to: "/admin/points/use", label: "포인트 사용 내역" },
            { to: "/admin/points/refund", label: "포인트 환불 내역" },
        ],
    },
    {
        icon: IoCashOutline, label: "정산관리", groupKey: "settlement",
        sub: [
            { to: "/admin/settlement", label: "전체 정산 내역", end: true },
            { to: "/admin/settlement/pending", label: "정산 대기 건" },
            { to: "/admin/settlement/approved", label: "정산 승인 건" },
            { to: "/admin/settlement/completed", label: "정산 완료 건" },
            { to: "/admin/settlement/rejected", label: "정산 거절 건" },
        ],
    },
    {
        icon: IoNewspaperOutline, label: "공지관리", groupKey: "notice",
        sub: [
            { to: "/admin/notice", label: "전체 공지사항", end: true },
            { to: "/admin/notice/pinned", label: "고정 공지사항" },
            { to: "/admin/notice/general", label: "일반 공지사항" },
        ],
    },
    { to: "/admin/updates", icon: IoCloudDownloadOutline, label: "앱 업데이트 관리" },
    {
        icon: IoSettingsOutline, label: "설정", groupKey: "settings",
        sub: [
            { to: "/admin/settings", label: "앱 푸시알림 설정", end: true },
            { to: "/admin/settings/policies", label: "정관/약관 관리" },
            { to: "/admin/settings/ai", label: "AI 견적 설정" },
        ],
    },
];

const getBreadcrumb = (pathname) => {
    const crumbs = [{ label: "관리자 홈", to: "/admin" }];
    if (pathname === "/admin") return crumbs;

    for (const m of MENUS) {
        if (m.sub) {
            for (const s of m.sub) {
                if (pathname === s.to || pathname.startsWith(s.to + "/")) {
                    crumbs.push({ label: m.label, to: m.sub[0]?.to || "" });
                    crumbs.push({ label: s.label });
                    return crumbs;
                }
            }
        } else if (m.to && pathname === m.to) {
            crumbs.push({ label: m.label });
            return crumbs;
        }
    }
    return crumbs;
};

const formatLoginTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${mm}/${dd} ${hh}:${mi}`;
};

const AdminLayout = () => {
    const nav = useNavigate();
    const location = useLocation();
    const session = JSON.parse(localStorage.getItem("adminSession") || "{}");
    const loginTime = useMemo(() => formatLoginTime(session.loggedInAt), [session.loggedInAt]);
    const breadcrumb = useMemo(() => getBreadcrumb(location.pathname), [location.pathname]);

    const [openGroups, setOpenGroups] = useState(() => {
        const init = {};
        MENUS.forEach(m => {
            if (m.sub) {
                const base = m.sub[0]?.to || "";
                const prefix = base.replace(/\/$/, "");
                if (location.pathname.startsWith(prefix)) init[m.groupKey || m.label] = true;
            }
        });
        return init;
    });

    const toggleGroup = (key) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));

    const handleLogout = () => {
        localStorage.removeItem("adminSession");
        nav("/admin/login");
    };

    return (
        <Wrap>
            <Sidebar>
                <Logo>홈프로 관리자</Logo>
                <Nav>
                    {MENUS.map((m, i) => {
                        if (m.sub) {
                            const gKey = m.groupKey || m.label;
                            const basePath = m.sub[0]?.to?.replace(/\/$/, "") || "";
                            const isActive = location.pathname.startsWith(basePath);
                            const isOpen = openGroups[gKey] || isActive;
                            return (
                                <React.Fragment key={i}>
                                    <MenuGroup $active={isActive} onClick={() => toggleGroup(gKey)}>
                                        <m.icon />{m.label}
                                        <ChevronIcon $open={isOpen} />
                                    </MenuGroup>
                                    <SubMenu $open={isOpen}>
                                        {m.sub.map(s => (
                                            <SubMenuItem key={s.to} to={s.to} end={s.end}>{s.label}</SubMenuItem>
                                        ))}
                                    </SubMenu>
                                </React.Fragment>
                            );
                        }
                        return (
                            <MenuItem key={m.to} to={m.to} end={m.end}>
                                <m.icon />{m.label}
                            </MenuItem>
                        );
                    })}
                </Nav>
            </Sidebar>
            <Content>
                <Topbar>
                    <TopbarLeft>
                        {loginTime && <><IoTimeOutline />접속: {loginTime}</>}
                    </TopbarLeft>
                    <TopbarRight>
                        <AdminName>{session.name || "관리자"}님</AdminName>
                        <TopbarLogout onClick={handleLogout}>
                            <IoLogOutOutline />로그아웃
                        </TopbarLogout>
                    </TopbarRight>
                </Topbar>
                <BreadcrumbBar>
                    {breadcrumb.map((c, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <IoChevronForwardOutline size={12} color={THEME.muted} />}
                            {c.to && i < breadcrumb.length - 1
                                ? <BreadcrumbLink to={c.to}>{i === 0 && <IoHomeOutline size={13} />}{c.label}</BreadcrumbLink>
                                : <BreadcrumbCurrent>{c.label}</BreadcrumbCurrent>
                            }
                        </React.Fragment>
                    ))}
                </BreadcrumbBar>
                <ContentBody>
                    <Outlet />
                </ContentBody>
            </Content>
        </Wrap>
    );
};

export default AdminLayout;
