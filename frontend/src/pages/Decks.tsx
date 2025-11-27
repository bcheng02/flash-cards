import { useEffect, useState } from "react";
import api from "../api/axios";
import type { Deck } from "../types";
import AddDeckModal from "../components/AddDeckModal";
import EditDeckModal from "../components/EditDeckModal";
import DeleteDeckModal from "../components/DeleteDeckModal";

const INDENT_SIZE = 24;

interface FlatNode {
  deck: Deck;
  depth: number;
}

export default function Decks() {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
    const [deletingDeck, setDeletingDeck] = useState<Deck | null>(null);

    // selection for keyboard arrows
    const [selectedId, setSelectedId] = useState<number | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get("/decks");
                setDecks(data);
            } catch {
                setError("Failed to load decks");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Build tree and flatten ordered by position
    const childrenMap: Record<string, Deck[]> = {};
    for (const d of decks) {
        const key = d.parent_id == null ? "root" : String(d.parent_id);
        (childrenMap[key] ||= []).push(d);
    }
    Object.values(childrenMap).forEach(arr =>
        arr.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    );

    function flatten(parentKey: string | null, depth: number, acc: FlatNode[]) {
        const key = parentKey == null ? "root" : String(parentKey);
        const kids = childrenMap[key] || [];
        for (const k of kids) {
            acc.push({ deck: k, depth });
            flatten(String(k.id), depth + 1, acc);
        }
    }
    const flat: FlatNode[] = [];
    flatten(null, 0, flat);

    const byId = new Map(decks.map(d => [d.id, d]));

    function getSiblings(parentId: number | null, source: Deck[]) {
        return source
            .filter(d => (d.parent_id ?? null) === (parentId ?? null))
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }

    function normalizePositionsLocal(parentId: number | null, ids: number[]) {
        setDecks(prev =>
            prev.map(d => {
                if ((d.parent_id ?? null) === (parentId ?? null)) {
                    const idx = ids.indexOf(d.id);
                    return idx >= 0 ? { ...d, position: idx + 1 } : d;
                }
                return d;
            })
        );
    }

    async function persistReorder(parentId: number | null, ids: number[]) {
        await api.post("/decks/reorder", { parent_id: parentId, orderedIds: ids });
    }

    async function changeParent(deckId: number, newParentId: number | null) {
        if (newParentId === deckId) return; // prevent self-parent
        // optimistic parent change, append to end of target siblings
        const targetSiblings = getSiblings(newParentId, decks).map(d => d.id);
        const newOrder = [...targetSiblings, deckId];

        setDecks(prev =>
            prev
                .map(d => (d.id === deckId ? { ...d, parent_id: newParentId } : d))
                .map(d => {
                    // normalize old parent positions (remove deckId)
                    return d;
                })
        );
        // normalize old parent positions
        const oldParent = byId.get(deckId)?.parent_id ?? null;
        const oldIds = getSiblings(oldParent, decks)
            .filter(d => d.id !== deckId)
            .map(d => d.id);
        normalizePositionsLocal(oldParent, oldIds);
        normalizePositionsLocal(newParentId, newOrder);

        try {
            await api.put(`/decks/${deckId}`, { parent_id: newParentId });
            await persistReorder(oldParent, oldIds);
            await persistReorder(newParentId, newOrder);
        } catch (e) {
            console.error(e);
            // optional: refetch to fix
        }
    }

    async function reorderSibling(deckId: number, direction: "up" | "down") {
        const parent = byId.get(deckId)?.parent_id ?? null;
        const siblings = getSiblings(parent, decks);
        const ids = siblings.map(s => s.id);
        const idx = ids.indexOf(deckId);
        if (idx < 0) return;
        const to = direction === "up" ? idx - 1 : idx + 1;
        if (to < 0 || to >= ids.length) return;

        const moved = [...ids];
        const [item] = moved.splice(idx, 1);
        moved.splice(to, 0, item);

        normalizePositionsLocal(parent, moved);
        try {
            await persistReorder(parent, moved);
        } catch (e) {
            console.error(e);
        }
    }

    // Indent: make this deck child of nearest previous node with depth-1
    function indentCandidateParent(flatIdx: number): number | null {
        const curDepth = flat[flatIdx].depth;
        const desiredDepth = curDepth + 1;
        for (let i = flatIdx - 1; i >= 0; i--) {
            if (flat[i].depth === desiredDepth - 1) return flat[i].deck.id;
        }
        return null;
    }

    // Outdent: become sibling of current parent (i.e., parent’s parent)
    function outdentParent(deckId: number): number | null {
        const parentId = byId.get(deckId)?.parent_id ?? null;
        if (parentId == null) return null; // already root
        const parentParent = byId.get(parentId)?.parent_id ?? null;
        return parentParent ?? null;
    }

    async function handleIndent(deckId: number) {
        const idx = flat.findIndex(n => n.deck.id === deckId);
        if (idx < 0) return;
        const candidate = indentCandidateParent(idx);
        if (candidate == null) return; // no valid parent above
        if (candidate === deckId) return;
        await changeParent(deckId, candidate);
    }

    async function handleOutdent(deckId: number) {
        const newParent = outdentParent(deckId);
        await changeParent(deckId, newParent);
    }

    // Keyboard: focus arrows on selectedId
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (!selectedId) return;
            if (e.key === "ArrowUp") {
                e.preventDefault();
                reorderSibling(selectedId, "up");
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                reorderSibling(selectedId, "down");
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                handleOutdent(selectedId);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                handleIndent(selectedId);
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selectedId, decks]);

    function handleCreated(deck: Deck) {
        setDecks(d => [...d, deck]);
    }
    function handleUpdated(updated: Deck) {
        setDecks(d => d.map(x => (x.id === updated.id ? updated : x)));
    }
    function handleDeleted(id: number) {
        setDecks(d => d.filter(x => x.id !== id));
        if (selectedId === id) setSelectedId(null);
    }

    if (loading) return <p>Loading decks...</p>;
    if (error) return <p style={{ color: "red" }}>{error}</p>;

    return (
        <div className="page-container">
            <div className="header-row">
                <h1>Your Decks</h1>
                <button
                    onClick={() => {
                        setEditingDeck(null);
                        setDeletingDeck(null);
                        setShowModal(true);
                    }}
                    className="add-btn"
                >
          + Add Deck
                </button>
            </div>

            {flat.length === 0 && <p>No decks yet. Create your first one!</p>}

            <div className="deck-list">
                {flat.map(({ deck, depth }) => (
                    <div
                        key={deck.id}
                        className={`deck-row${selectedId === deck.id ? " hover" : ""}`}
                        style={{ paddingLeft: depth * INDENT_SIZE }}
                        onClick={() => setSelectedId(deck.id)}
                    >
                        <div className="deck-main">
                            <span className="deck-name">{deck.name}</span>
                        </div>
                        <div className="deck-actions">
                            <div className="arrow-pad">
                                <button className="arrow up" title="Move up" onClick={() => reorderSibling(deck.id, "up")} />
                                <button className="arrow right" title="Indent" onClick={() => handleIndent(deck.id)} />
                                <button className="arrow down" title="Move down" onClick={() => reorderSibling(deck.id, "down")} />
                                <button className="arrow left" title="Outdent" onClick={() => handleOutdent(deck.id)} />
                                <div className="arrow-center" aria-hidden="true" />
                            </div>
                            <button onClick={() => setEditingDeck(deck)}>Edit</button>
                            <button onClick={() => setDeletingDeck(deck)} className="danger">Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <AddDeckModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
            )}
            {editingDeck && (
                <EditDeckModal deck={editingDeck} onClose={() => setEditingDeck(null)} onUpdated={handleUpdated} />
            )}
            {deletingDeck && (
                <DeleteDeckModal deck={deletingDeck} onClose={() => setDeletingDeck(null)} onDeleted={handleDeleted} />
            )}
        </div>
    );
}
