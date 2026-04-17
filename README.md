# RoleMapper User Story Generator

A React app that generates developer-ready user stories for the RoleMapper platform using the Anthropic API.

---

## Local setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add your API key
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Edit `.env.local` and replace `your_api_key_here` with your Anthropic API key.

### 3. Run locally
```bash
npm start
```
Opens at http://localhost:3000

---

## Deploy to Vercel

### Option A — Vercel CLI
```bash
npm install -g vercel
vercel
```
When prompted, add your environment variable:
- Key: `REACT_APP_ANTHROPIC_API_KEY`
- Value: your Anthropic API key

### Option B — Vercel dashboard
1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import your repo
3. In Project Settings → Environment Variables, add:
   - `REACT_APP_ANTHROPIC_API_KEY` = your key
4. Deploy

---

## Keeping the app updated

### Adding new workflow areas or personas
Edit `src/config.js` — add entries to the relevant array. No other files need changing.

### Updating the product context or story format
Edit `src/systemPrompt.js` — this is the system prompt sent with every API call. It contains all RoleMapper context, the user story format, and writing conventions.

### Changing the model
In `src/App.js`, find this line and update the model string:
```js
model: 'claude-opus-4-5',
```

---

## File structure

```
src/
  App.js           — main app component, API call, rendering
  App.css          — all styles
  index.js         — entry point
  index.css        — global styles and CSS variables
  systemPrompt.js  — all RoleMapper intelligence (update as product evolves)
  config.js        — dropdown options (update as product grows)
public/
  index.html       — HTML shell with Google Fonts
.env.example       — environment variable template
```

---

## Security note

The API key is used client-side in this setup (prefixed `REACT_APP_`), which means it will be visible in the browser bundle. This is fine for an internal team tool. If you want to make this public-facing, you should add a simple serverless proxy (a Vercel API route) so the key stays server-side.
