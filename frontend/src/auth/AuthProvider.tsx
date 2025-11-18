// src/auth/AuthProvider.tsx

import { useEffect, useState } from "react";
import api from "../api/axios";
import { setAccessToken } from "./tokenStore";
import type { User } from "../types";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Try to load user on first load (refresh if needed)
    useEffect(() => {
        async function init() {
            console.log('first load yo')
            try {
                const me = await api.get("/me");
                setUser(me.data);
            } catch (err: unknown) {
                console.error("Auth init error:", err, "trying to refresh token");
                try {
                    const refresh = await api.post("/auth/refresh");
                    setAccessToken(refresh.data.accessToken);
                    const me = await api.get("/me");
                    setUser(me.data);
                } catch {
                    setUser(null);
                }
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    // login: store token & get user
    async function login(username: string, password: string) {
        try {
            const res = await api.post("/auth/login", { username, password });

            setAccessToken(res.data.accessToken);

            const me = await api.get("/me");
            setUser(me.data);

            return true;
        } catch (err) {
            console.error("Login error:", err);
            return false;
        }
    }

    async function logout() {
        await api.post("/auth/logout");
        setAccessToken(null);
        setUser(null);
    }
    
    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
