// src/pages/RegisterPage.tsx

import { useState } from "react";
import api from "../api/axios";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

export default function RegisterPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [ error, setError ] = useState("");
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        try {
            await api.post("/auth/register", { username, password });
            navigate("/login", { replace: true }); // require explicit login
        } catch (err: unknown) {
            console.error(err);
            if (axios.isAxiosError(err) && err.response) {
                setError((err.response.data as { error?: string })?.error || "Registration failed");
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Registration failed");
            }
        }
    }

    return (
        <div className="auth-container">
            <h1>Register</h1>

            <form onSubmit={handleSubmit}>
                <input 
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <input 
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {error && <p style={{ color: "red" }}>{error}</p>}

                <button type="submit">Register</button>
            </form>

            <p>Already have an account? <Link to="/login">Login</Link></p>
        </div>
    );
}