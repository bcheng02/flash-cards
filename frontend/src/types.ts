export interface Deck {
    id: number;
    name: string;
    parent_id?: number | null;
    user_id: number;
    created_at?: string;
    updated_at?: string;
}

export interface DeckSummary extends Deck {
  cardCount: number;
  // todo: more fields added in future (reviewCount, newCount, etc)
}

export interface Flashcard {
    id: number;
    deck_id: number;
    front: string;
    back: string;
    created_at?: string;
}

export interface User {
    id: number;
    username: string;
}
