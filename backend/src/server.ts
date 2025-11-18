import express, { type Request, type Response } from "express";
import cors from "cors";
import pool from "./db.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret"; // in production, use a real secret in .env

// Replace default CORS with configured CORS
const corsOptions = {
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json()); // parses JSON bodies

function generateTokens(userId: number) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

function authenticate(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err: any, payload: any) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    (req as any).userId = payload.userId;
    next();
  });
}

// Test route
app.get("/api", (req: Request, res: Response) => {
  res.json({ message: "Hello from the backend 👋" });
});

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
// REGISTER (create user)
app.post("/api/auth/register", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "Missing username or password" });

  try {
    // check for duplicate username
    const existing = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (existing.rows.length > 0)
      return res.status(400).json({ error: "Username already taken" });

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [username, hashed]
    );

    // No tokens here; force user to login separately
    res.status(201).json({ user: result.rows[0] });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to register" });
  }
});

// LOGIN
app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    // replace with access + refresh tokens 
    // const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    // res.json({ token, user: { id: user.id, username: user.username } });

    const { accessToken, refreshToken } = generateTokens(user.id);

    // send refresh token as HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, // set true in production (HTTPS)
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      accessToken,
      user: { id: user.id, username: user.username }
    });

  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// REFRESH TOKEN
app.post("/api/auth/refresh", async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: "No refresh token" });

  jwt.verify(token, JWT_SECRET, (err: any, payload: any) => {
    if (err) return res.status(403).json({ error: "Invalid refresh token" });

    const { userId } = payload;
    const { accessToken, refreshToken } = generateTokens(userId);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ accessToken });
  });
});

// LOGOUT
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ success: true });
});

// ME - protected route
app.get("/api/me", authenticate, async (req: any, res: any) => {
  const userId = (req as any).userId;
  try {
    const result = await pool.query("SELECT id, username FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ========== 🗂️ DECK ROUTES ==========

// Create a new deck
app.post("/api/decks", authenticate, async (req: Request, res: Response) => {
  const { name, parent_id } = req.body;
  const user_id = (req as any).userId;

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
app.get("/api/decks", authenticate, async (req: Request, res: Response) => {

  const user_id = (req as any).userId;

  if (!user_id) {
    return res.status(400).json({ error: "user_id required" });
  }

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

// Get a single deck with its subdecks (secured + ownership check)
app.get("/api/decks/:id", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const user_id = (req as any).userId;

  try {
    const deck = await pool.query("SELECT * FROM decks WHERE id = $1", [id]);
    if (deck.rows.length === 0) return res.status(404).json({ error: "Deck not found" });
    if (deck.rows[0].user_id !== user_id) return res.status(403).json({ error: "Forbidden" });

    const query = `
      WITH RECURSIVE deck_tree AS (
        SELECT * FROM decks WHERE id = $1 AND user_id = $2
        UNION ALL
        SELECT d.* FROM decks d
        INNER JOIN deck_tree dt ON d.parent_id = dt.id AND d.user_id = $2
      )
      SELECT * FROM deck_tree;
    `;

    const subdecks = await pool.query(query, [id, user_id]);

    res.json({ deck: deck.rows[0], subdecks: subdecks.rows });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch deck" });
  }
});

// Update deck
app.put("/api/decks/:id", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  const user_id = (req as any).userId;

  try {
    const owner = await pool.query("SELECT user_id FROM decks WHERE id = $1", [id]);
    if (owner.rows.length === 0) return res.status(404).json({ error: "Deck not found" });
    if (owner.rows[0].user_id !== user_id) return res.status(403).json({ error: "Forbidden" });

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
app.delete("/api/decks/:id", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const user_id = (req as any).userId;

  try {
    const owner = await pool.query("SELECT user_id FROM decks WHERE id = $1", [id]);
    if (owner.rows.length === 0) return res.status(404).json({ error: "Deck not found" });
    if (owner.rows[0].user_id !== user_id) return res.status(403).json({ error: "Forbidden" });

    await pool.query("DELETE FROM decks WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete deck" });
  }
});

// ========== 🃏 FLASHCARD ROUTES ==========

// Create flashcard in a deck (require auth + ownership)
app.post("/api/decks/:deckId/flashcards", authenticate, async (req: Request, res: Response) => {
  const { deckId } = req.params;
  const { front, back } = req.body;
  const user_id = (req as any).userId;

  try {
    const deck = await pool.query("SELECT user_id FROM decks WHERE id = $1", [deckId]);
    if (deck.rows.length === 0) return res.status(404).json({ error: "Deck not found" });
    if (deck.rows[0].user_id !== user_id) return res.status(403).json({ error: "Forbidden" });

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

// Get all flashcards in deck (require auth + ownership)
app.get("/api/decks/:deckId/flashcards", authenticate, async (req: Request, res: Response) => {
  const { deckId } = req.params;
  const user_id = (req as any).userId;

  try {
    // ensure deck belongs to user
    const deck = await pool.query("SELECT user_id FROM decks WHERE id = $1", [deckId]);
    if (deck.rows.length === 0) return res.status(404).json({ error: "Deck not found" });
    if (deck.rows[0].user_id !== user_id) return res.status(403).json({ error: "Forbidden" });

    const query = `
      WITH RECURSIVE deck_tree AS (
        SELECT id FROM decks WHERE id = $1 AND user_id = $2
        UNION ALL
        SELECT d.id FROM decks d
        INNER JOIN deck_tree dt ON d.parent_id = dt.id AND d.user_id = $2
      )
      SELECT * FROM flashcards
      WHERE deck_id IN (SELECT id FROM deck_tree)
      ORDER BY created_at ASC;
    `;

    const result = await pool.query(query, [deckId, user_id]);
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch flashcards" });
  }
});

// Update flashcard (require auth + ownership)
app.put("/api/flashcards/:id", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { front, back } = req.body;
  const user_id = (req as any).userId;

  try {
    const owner = await pool.query(
      `SELECT d.user_id FROM flashcards f JOIN decks d ON f.deck_id = d.id WHERE f.id = $1`,
      [id]
    );
    if (owner.rows.length === 0) return res.status(404).json({ error: "Flashcard not found" });
    if (owner.rows[0].user_id !== user_id) return res.status(403).json({ error: "Forbidden" });

    const result = await pool.query(
      "UPDATE flashcards SET front = $1, back = $2 WHERE id = $3 RETURNING *",
      [front, back, id]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to update flashcard" });
  }
});

// Delete flashcard (require auth + ownership)
app.delete("/api/flashcards/:id", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const user_id = (req as any).userId;

  try {
    const owner = await pool.query(
      `SELECT d.user_id FROM flashcards f JOIN decks d ON f.deck_id = d.id WHERE f.id = $1`,
      [id]
    );
    if (owner.rows.length === 0) return res.status(404).json({ error: "Flashcard not found" });
    if (owner.rows[0].user_id !== user_id) return res.status(403).json({ error: "Forbidden" });

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
