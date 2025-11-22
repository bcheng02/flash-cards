import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import type { Deck, DeckSummary } from "../types";
import AddDeckModal from "../components/AddDeckModal";

export default function Decks() {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        async function fetchDecks() {
            try {
                const response = await api.get("/decks");
                setDecks(response.data);
            } catch (err) {
                console.error(err);
                setError("Failed to load decks");
            } finally {
                setLoading(false);
            }
        }
        fetchDecks();
    }, []);

    function handleCreated(deck: Deck) {
        setDecks((d) => [...d, deck]);
    }

    if (loading) return <p>Loading decks...</p>;
    if (error) return <p style={{ color: "red" }}>{error}</p>;

    return (
        <div className="page-container">
            <div className="header-row">
                <h1>Your Decks</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="add-btn"
                >
          + Add Deck
                </button>
            </div>

            {decks.length === 0 && <p>No decks yet. Create your first one!</p>}

            <div className="deck-grid">
                {decks.map((deck) => (
                    <DeckCard key={deck.id} deck={deck} />
                ))}
            </div>

            {showModal && (
                <AddDeckModal
                    onClose={() => setShowModal(false)}
                    onCreated={handleCreated}
                />
            )}
        </div>
    );
}

// Fixed (no async component)
function DeckCard({ deck }: { deck: Deck }) {
    const [summary, setSummary] = useState<DeckSummary | null>(null);

    useEffect(() => {
        let cancel = false;
        (async () => {
            try {
                const { data } = await api.get(`/decks/${deck.id}/summary`);
                if (!cancel) setSummary(data);
            } catch (e) {
                console.error(e);
                // silent
            }
        })();
        return () => {
            cancel = true;
        };
    }, [deck.id]);

    return (
        <Link to={`/decks/${deck.id}`} className="deck-card">
            <h2>{deck.name}</h2>
            <p>{summary ? `${summary.cardCount} cards` : "…"}</p>
            <small>
        Updated {new Date(deck.updated_at || "").toLocaleDateString()}
            </small>
        </Link>
    );
}
