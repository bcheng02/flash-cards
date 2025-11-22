import { useState } from "react";
import api from "../api/axios";
import type { Deck } from "../types";

interface Props {
  onClose: () => void;
  onCreated: (deck: Deck) => void;
}

export default function AddDeckModal({ onClose, onCreated }: Props) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        setError("");
        try {
            const res = await api.post<Deck>("/decks", { name });
            onCreated(res.data);
            onClose();
        } catch (err) {
            console.error(err);
            setError("Failed to create deck");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className="modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <h2>Create Deck</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        autoFocus
                        type="text"
                        placeholder="Deck name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    {error && <p style={{ color: "red" }}>{error}</p>}
                    <div className="row">
                        <button type="button" onClick={onClose} disabled={loading}>
              Cancel
                        </button>
                        <button type="submit" disabled={loading || !name.trim()}>
                            {loading ? "Creating..." : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}