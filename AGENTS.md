# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Velan Eiti PWA is a zero-dependency, zero-build static Progressive Web App (single `index.html` ~358KB). It is an AI workspace running entirely in the browser with chat, agents, file handling, and local memory via IndexedDB. See `README.md` for the full feature list and roadmap.

### Running the dev server

Serve the repository root with any static HTTP server. Service Workers require HTTP (not `file://`).

```bash
python3 -m http.server 8080          # preferred — no install needed
# or: npx serve -l 8080 .
```

Then open `http://localhost:8080/index.html` in Chrome.

### Lint / Tests / Build

There is **no build step, no linter, and no test suite**. The entire app is vanilla HTML/CSS/JS in a single file. There is no `package.json`, no bundler, and no CI pipeline.

### AI provider notes

- The app defaults to **Ollama** (localhost:11434) for offline AI. Without a running Ollama instance, sending a chat message will produce a "Failed to fetch" error — this is expected.
- Cloud providers (OpenAI, Anthropic/Claude, DeepSeek, Groq, OpenRouter) can be configured via the Settings panel using API keys stored in IndexedDB.
- To test chat end-to-end, either start Ollama locally or configure a cloud API key in Settings → Провайдер / API Keys.

### Key files

| File | Purpose |
|---|---|
| `index.html` | Entire application (~3733 lines: HTML + CSS + JS) |
| `sw.js` | Service Worker for caching / offline support |
| `manifest.json` | PWA manifest (installability, icons, shortcuts) |
| `icons/` | PWA icons (48×48 through 512×512) |
