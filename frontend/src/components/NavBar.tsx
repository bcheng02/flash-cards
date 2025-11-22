import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function NavBar() {
    const { user, logout, loading } = useAuth();
    const navigate = useNavigate();

    async function handleLogout() {
        await logout();
        navigate("/login", { replace: true });
    }

    return (
        <header className="navbar">
            <div className="nav-left">
                <Link to={user ? "/decks" : "/login"} className="brand">FlashCards 🤠</Link>
            </div>
            <div className="nav-right">
                {loading ? (
                    <span>…</span>
                ) : user ? (
                    <>
                        <span className="user-label">Logged in as {user.username}</span>
                        <button onClick={handleLogout} className="logout-btn">Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login">Login</Link>
                        <Link to="/register" style={{ marginLeft: "12px" }}>Register</Link>
                    </>
                )}
            </div>
        </header>
    );
}