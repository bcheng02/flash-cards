// src/pages/DeckPage.tsx

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { DeckSummary } from "../types";
import api from "../api/axios";

export default function DeckView() {
    const { id } = useParams();
    const deckId = Number(id);

    const [deck, setDeck] = useState<DeckSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await api.get(`/decks/${deckId}/summary`);
                setDeck(res.data);
            } catch (err) {
                console.error("Failed to load deck:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [deckId]);

    if (loading) return <div>Loading deck…</div>;
    if (!deck) return <div>Deck not found</div>;

    return (
        <div style={{ padding: "16px" }}>
            <h1>{deck.name}</h1>
            <p>Cards: {deck.cardCount}</p>

            <div style={{ marginTop: "20px" }}>
                <button>Create Flashcard</button>
                <button style={{ marginLeft: "10px" }}>Study Deck</button>
            </div>
        </div>
    );
}
