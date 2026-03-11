import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const RequireAdmin = () => {
    const session = localStorage.getItem("adminSession");
    if (!session) {
        return <Navigate to="/admin/login" replace />;
    }
    return <Outlet />;
};

export default RequireAdmin;
