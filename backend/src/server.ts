import express, { type Request, type Response } from "express";
import cors from "cors";
import pool from "./db.ts";
import bcrypt from "bcrypt";

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // allows requests from frontend
app.use(express.json()); // parses JSON bodies

// Test route
// app.get("/api", (req: Request, res: Response) => {
//   res.json({ message: "Hello from the backend 👋" });
// });

app.get("/api/db-test", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// todo: other CRUD for users (read, update, delete)

// create user
app.post("/api/users", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [username, hashed]
    );

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// ========== 🗂️ DECK ROUTES ==========

// Create a new deck
app.post("/api/decks", async (req: Request, res: Response) => {
  const { name, user_id, parent_id } = req.body;

  if (!user_id) return res.status(400).json({ error: "user_id is required" });

  try {
    const result = await pool.query(
      "INSERT INTO decks (name, user_id, parent_id) VALUES ($1, $2, $3) RETURNING *",
      [name, user_id, parent_id || null]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to create deck" });
  }
});

// Get all decks for user
app.get("/api/decks", async (req: Request, res: Response) => {
  
  // todo: Prefer to derive userId from auth; here we accept ?user_id= for example
  const user_id = req.query.user_id;

  try {
   const result = await pool.query(
      "SELECT * FROM decks WHERE user_id = $1 ORDER BY created_at ASC",
      [user_id]
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch decks" });
  }
});

// Get a single deck with its subdecks
app.get("/api/decks/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deck = await pool.query("SELECT * FROM decks WHERE id = $1", [id]);
    if (deck.rows.length === 0) return res.status(404).json({ error: "Deck not found" });

    const subdecks = await pool.query("SELECT * FROM decks WHERE parent_id = $1", [id]);

    res.json({ deck: deck.rows[0], subdecks: subdecks.rows });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch deck" });
  }
});

// Update deck
app.put("/api/decks/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const result = await pool.query(
      "UPDATE decks SET name = $1 WHERE id = $2 RETURNING *",
      [name, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Deck not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to update deck" });
  }
});

// Delete deck
app.delete("/api/decks/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM decks WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete deck" });
  }
});

// ========== 🃏 FLASHCARD ROUTES ==========

// Create flashcard in a deck
app.post("/api/decks/:deckId/flashcards", async (req: Request, res: Response) => {
  const { deckId } = req.params;
  const { front, back } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO flashcards (deck_id, front, back) VALUES ($1, $2, $3) RETURNING *",
      [deckId, front, back]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to create flashcard" });
  }
});

// Get all flashcards in deck
app.get("/api/decks/:deckId/flashcards", async (req: Request, res: Response) => {
  const { deckId } = req.params;

  try {
    const query = `
      WITH RECURSIVE deck_tree AS (
        SELECT id FROM decks WHERE id = $1
        UNION ALL
        SELECT d.id FROM decks d
        INNER JOIN deck_tree dt ON d.parent_id = dt.id
      )
      SELECT * FROM flashcards
      WHERE deck_id IN (SELECT id FROM deck_tree)
      ORDER BY created_at ASC;
    `;

    const result = await pool.query(query, [deckId]);
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch flashcards" });
  }
});


// Update flashcard
app.put("/api/flashcards/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { front, back } = req.body;

  try {
    const result = await pool.query(
      "UPDATE flashcards SET front = $1, back = $2 WHERE id = $3 RETURNING *",
      [front, back, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Flashcard not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to update flashcard" });
  }
});

// Delete flashcard
app.delete("/api/flashcards/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM flashcards WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete flashcard" });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
