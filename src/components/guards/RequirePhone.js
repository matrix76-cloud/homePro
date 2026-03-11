import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const RequirePhone = () => {
    const { userData, loading } = useAuth();

    if (loading) return null;

    if (!userData?.phoneE164) {
        return <Navigate to="/MobileLinkPhone" replace />;
    }
    return <Outlet />;
};

export default RequirePhone;
