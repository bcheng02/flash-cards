// src/auth/RequireAuth.tsx

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth";

export default function RequireAuth() {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;

    if (!user) return <Navigate to="/login" replace />;

    return <Outlet />;
}
