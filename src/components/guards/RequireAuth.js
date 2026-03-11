import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const RequireAuth = () => {
    const { isLoggedIn, loading } = useAuth();
    const location = useLocation();

    if (loading) return null;

    if (!isLoggedIn) {
        return <Navigate to="/MobileLogin" state={{ from: location.pathname }} replace />;
    }
    return <Outlet />;
};

export default RequireAuth;
