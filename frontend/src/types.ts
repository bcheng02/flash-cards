export interface Deck {
    id: number;
    name: string;
    parent_id?: number | null;
    user_id?: number | null;
    created_at?: string;
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
