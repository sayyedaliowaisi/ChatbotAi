// server.js - simple Node.js proxy for Google Generative Language API
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // allow file payloads
const API_KEY = process.env.API_KEY;
if(!API_KEY){ console.error('Missing API_KEY in environment'); }
const MODEL = process.env.MODEL || 'gemini-1.5-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const API_URL = `${API_BASE}/generativeModels/${MODEL}:generateContent?key=${API_KEY}`;

app.post('/api/chat', async (req, res) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error('Proxy error', err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
