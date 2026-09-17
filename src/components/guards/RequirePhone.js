import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const RequirePhone = ({ onlyIfLoggedIn = false }) => {
    const { userData, loading, isLoggedIn } = useAuth();

    if (loading) return null;

    // 비회원 둘러보기 화면(홈)에서는 전화번호 단계를 강제하지 않는다 (대표 9/17)
    if (onlyIfLoggedIn && !isLoggedIn) return <Outlet />;

    if (!userData?.phoneE164) {
        return <Navigate to="/MobileLinkPhone" replace />;
    }
    return <Outlet />;
};

export default RequirePhone;
