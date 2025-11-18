// src/api/axios.ts
import axios from "axios";
import { getAccessToken, setAccessToken } from "../auth/tokenStore"

const api = axios.create({
    baseURL: "http://localhost:3000/api",
    withCredentials: true, // send HttpOnly refresh cookie
});

// ----- AUTO REFRESH TOKEN INTERCEPTOR -----
api.interceptors.response.use(
    (res) => res,
    async (err) => {
        const original = err.config;

        // Only retry once
        if (err.response?.status === 401 && !original._retry) {
            original._retry = true;

            try {
                // call refresh token endpoint
                const refreshRes = await axios.post(
                    "http://localhost:3000/api/auth/refresh",
                    {},
                    { withCredentials: true }
                );

                const newAccessToken = refreshRes.data.accessToken;
                setAccessToken(newAccessToken);

                // retry original request with updated token
                original.headers["Authorization"] = `Bearer ${newAccessToken}`;
                return api(original);
            } catch (refreshErr) {
                // refresh failed → logout
                setAccessToken(null);
                return Promise.reject(refreshErr);
            }
        }

        return Promise.reject(err);
    }
);

// ----- Inject Access Token -----
api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) config.headers["Authorization"] = `Bearer ${token}`;
    return config;
});

export default api;
