import { useEffect, useState } from "react";
import api from "../api/axios";
import type { Deck } from "../types.ts";

export default function Decks() {
    const [decks, setDecks] = useState<Deck[]>([]);

    useEffect(() => {
        const token = localStorage.getItem("accessToken"); // todo: cookies wtf is this
        if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;

        api
            .get("/decks")
            .then((res) => setDecks(res.data))
            .catch((err) => console.error(err));
    }, []);

    return (
        <div>
            <h2>Your Decks</h2>
            <ul>
                {decks.map((deck) => (
                    <li key={deck.id}>{deck.name}</li>
                ))}
            </ul>
        </div>
    );
}
