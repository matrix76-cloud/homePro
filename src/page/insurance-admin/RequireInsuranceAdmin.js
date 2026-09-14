import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { canAccessInsuranceAdmin } from "../../service/InsuranceAdminService";

/**
 * 보험대리점 관리자 접근 가드
 *  - users.insuranceAdmin === true (운영자 회원목록에서 토글로 부여)
 *  - 또는 운영자: userData.role === "admin" / 운영자 세션(localStorage adminSession — RequireAdmin 과 같은 기준)
 *  아니면 "/" 로.
 */
const RequireInsuranceAdmin = () => {
    const { loading, currentUser, userData } = useAuth();

    if (loading) return null;
    // 로그인은 됐는데 프로필 조회가 아직이면 로딩으로 취급 (RequireAuth 와 같은 처리)
    if (currentUser && !userData) return null;

    if (!canAccessInsuranceAdmin(userData)) {
        return <Navigate to="/" replace />;
    }
    return <Outlet />;
};

export default RequireInsuranceAdmin;
