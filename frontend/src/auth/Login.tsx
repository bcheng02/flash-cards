// src/pages/LoginPage.tsx

import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { Link, useNavigate } from "react-router-dom";


export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        const success = await login(username, password);
        if (!success) {
            setError("Invalid credentials");
            return;
        }

        navigate("/"); // Redirect to homepage (Decks)
    }

    return (
        <div className="auth-container">
            <h1>Login</h1>

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

                <button type="submit">Login</button>
            </form>

            <p>Don't have an account? <Link to="/register">Register</Link></p>
        </div>
    );
}
