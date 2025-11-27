import api from "../api/axios";
import type { Deck } from "../types";
import { useState, useEffect } from "react";

interface Props {
  deck: Deck;
  onClose: () => void;
  onDeleted: (id: number) => void;
}

export default function DeleteDeckModal({ deck, onClose, onDeleted }: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    async function handleDelete() {
        setLoading(true);
        setError("");
        try {
            await api.delete(`/decks/${deck.id}`);
            onDeleted(deck.id);
            onClose();
        } catch (err) {
            console.error(err);
            setError("Delete failed");
            setLoading(false);
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <h2>Delete Deck</h2>
                <p>Are you sure you want to delete "{deck.name}"?</p>
                {error && <p style={{ color: "red" }}>{error}</p>}
                <div className="row">
                    <button type="button" onClick={onClose} disabled={loading}>Cancel</button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={loading}
                        style={{ background: "#ff5b5b", color: "#fff" }}
                    >
                        {loading ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}