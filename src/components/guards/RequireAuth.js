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
    // 전화번호 단계 복원 (형 지시 7/28) — 번호까지 있어야 온보딩 완료로 본다.
    // 번호가 계정 통합의 기준키라, 이 단계를 건너뛰면 같은 사람이 여러 계정으로 갈라진다.
    if (userData && ONBOARDING_PATHS.includes(location.pathname)) {
        const { name, role, phoneE164 } = userData;
        if (name && role && phoneE164) {
            return <Navigate to="/MobileMain" replace />;
        }
    }

    return <Outlet />;
};

export default RequireAuth;
