import api from "../api/axios";

export default function LogoutButton() {
    const handleLogout = async () => {
        try {
            await api.post("/logout"); // clears refresh token cookie
        } catch (err) {
            console.error(err);
        }
        localStorage.removeItem("accessToken");
        delete api.defaults.headers.common.Authorization;
        window.location.href = "/login";
    };

    return <button onClick={handleLogout}>Logout</button>;
}
