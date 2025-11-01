// app.js (backend server)
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Gemini API endpoint
const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/generativeModels/gemini-1.5-flash:generateContent";

// Chat endpoint
app.post("/", async (req, res) => {
  try {
    const payload = req.body;

    const response = await fetch(`${API_URL}?key=${process.env.API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
