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

// create
app.post("/api/flashcards", async (req: Request, res: Response) => {
  const { user_id, front, back } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO flashcards (user_id, front, back) VALUES ($1, $2, $3) RETURNING *",
      [user_id, front, back]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to create flashcard" });
  }
});

// read
app.get("/api/flashcards/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM flashcards WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch flashcards" });
  }
});

// update
app.put("/api/flashcards/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { front, back } = req.body;

  try {
    const result = await pool.query(
      "UPDATE flashcards SET front = $1, back = $2 WHERE id = $3 RETURNING *",
      [front, back, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Flashcard not found" });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to update flashcard" });
  }
});

// delete
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
