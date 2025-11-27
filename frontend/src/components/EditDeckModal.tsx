import { useState, useEffect } from "react";
import api from "../api/axios";
import type { Deck } from "../types";

interface Props {
  deck: Deck;
  onClose: () => void;
  onUpdated: (deck: Deck) => void;
}

export default function EditDeckModal({ deck, onClose, onUpdated }: Props) {
    const [name, setName] = useState(deck.name);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || name === deck.name) return onClose();
        setLoading(true);
        setError("");
        try {
            const res = await api.put<Deck>(`/decks/${deck.id}`, { name });
            onUpdated(res.data);
            onClose();
        } catch (err) {
            console.error(err);
            setError("Update failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <h2>Edit Deck</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        autoFocus
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Deck name"
                    />
                    {error && <p style={{ color: "red" }}>{error}</p>}
                    <div className="row">
                        <button type="button" onClick={onClose} disabled={loading}>Cancel</button>
                        <button type="submit" disabled={loading || !name.trim()}>
                            {loading ? "Saving..." : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}