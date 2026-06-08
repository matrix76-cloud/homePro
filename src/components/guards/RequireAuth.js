import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ONBOARDING_PATHS = ["/MobileLinkPhone", "/MobileSetNickname"];

const RequireAuth = () => {
    const { isLoggedIn, loading, userData } = useAuth();
    const location = useLocation();

    if (loading) return null;

    if (!isLoggedIn) {
        return <Navigate to="/MobileLogin" state={{ from: location.pathname }} replace />;
    }

    // 온보딩 페이지 접근 차단: 이미 설정 완료한 사용자는 메인으로
    if (userData && ONBOARDING_PATHS.includes(location.pathname)) {
        // 전화번호 단계 제거 — 닉네임/역할만 완료되면 온보딩 완료로 간주
        const { name, role } = userData;
        if (name && role) {
            return <Navigate to="/MobileMain" replace />;
        }
    }

    return <Outlet />;
};

export default RequireAuth;
