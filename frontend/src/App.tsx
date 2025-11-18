import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./auth/Login";
import Register from "./auth/Register";
import Decks from "./pages/Decks";
import DeckView from "./pages/DeckView";
import RequireAuth from "./auth/RequireAuth";
import { AuthProvider } from "./auth/AuthProvider";

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/" element={<Navigate to="/decks" replace />} />
                    <Route element={<RequireAuth />}>
                        <Route path="/decks" element={<Decks />} />
                        <Route path="/decks/:id" element={<DeckView />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
