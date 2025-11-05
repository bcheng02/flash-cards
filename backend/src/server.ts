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

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
