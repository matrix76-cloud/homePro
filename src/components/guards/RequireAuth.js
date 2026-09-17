import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LoginPrompt from "./LoginPrompt";

const ONBOARDING_PATHS = ["/MobileLinkPhone", "/MobileSetNickname"];

const RequireAuth = () => {
    const { isLoggedIn, loading, userData, currentUser } = useAuth();
    const location = useLocation();

    if (loading) return null;

    // 가입/로그인 직후 currentUser 는 잡혔지만 프로필(userData) 조회가 아직
    // 안 끝난 찰나 — 이때 로그아웃으로 오판해 /MobileLogin 으로 보내면
    // 신규가입 온보딩 퍼널이 끊긴다 (심화점검 5 발견). 로딩으로 취급.
    if (currentUser && !userData) return null;

    // 비회원 — 홈은 둘러볼 수 있고, 로그인이 필요한 화면에 들어오면 여기서 가입을 권한다 (대표 9/17)
    if (!isLoggedIn) {
        return <LoginPrompt />;
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
