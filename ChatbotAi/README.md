# ChatbotAi

This is a deploy-ready project (frontend + backend proxy) for Google Gemini (v1beta generativeModels).
The frontend is a static single-page app; the backend is a small Node/Express proxy that safely stores your API key.

## What's included
- `index.html` — frontend UI
- `styles.css` — dark minimal developer UI
- `app.js` — frontend logic (talks to backend `/api/chat`)
- `server.js` — backend proxy (reads API_KEY from environment)
- `package.json` — scripts & deps
- `.env.example` — example environment file

## Quick local run (development)
1. Clone or unzip this project.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the project root with:
   ```bash
   API_KEY=your_google_api_key_here
   PORT=5000
   MODEL=gemini-1.5-flash
   ```
4. Start the backend:
   ```bash
   node server.js
   # or for auto-reload during dev:
   npm run dev
   ```
5. Serve the frontend: open `index.html` with Live Server (or simply open in browser).
   - If you open `index.html` as file://, the frontend will send requests to `http://localhost:5000/api/chat` (server must be running).

## Deploying
### Backend (Render / Railway / Fly / Heroku)
1. Push this repo to GitHub.
2. Create a new Web Service on Render (or Railway) and connect your repo.
3. Set the start command to `node server.js` and environment variables:
   - `API_KEY` — your Google API key
   - `PORT` — optional (Render sets this automatically)
   - `MODEL` — optional (defaults to gemini-1.5-flash)
4. Deploy. Note the public URL (e.g. `https://chatbotai-backend.onrender.com`).

### Frontend (Netlify / Vercel)
1. You can deploy the `index.html`, `styles.css`, `app.js` as a static site on Netlify or Vercel.
2. Edit `app.js` (or set a global variable) so `BACKEND_URL` points to your backend:
   ```js
   const BACKEND_URL = 'https://chatbotai-backend.onrender.com/api/chat';
   ```
3. Drag & drop the site folder to Netlify or connect the repo.

## Security note
- Do NOT expose `API_KEY` in the frontend. Keep it only on the backend environment variables.
- For production, consider rate-limiting, auth, and request validation on the backend.

## Need help deploying?
I can:
- create a GitHub repo and push this code for you (instructions provided), or
- walk you through Render + Netlify setup step-by-step, or
- produce a zip file for download (already included in this package).
