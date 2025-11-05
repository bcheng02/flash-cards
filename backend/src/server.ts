import express, { type Request, type Response } from "express";
import cors from "cors";
import pool from "./db.ts";

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

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
