# Ask Jan Worker

Zero-cost MVP backend for the Ask Jan portfolio assistant.

## Architecture

GitHub Pages → Cloudflare Worker → Groq API

The Worker:
- accepts only the portfolio origin (plus localhost for development),
- limits question/history size,
- uses simple local keyword retrieval instead of a vector database,
- answers contact/CV/LinkedIn questions without calling Groq,
- sends only relevant portfolio records to Groq,
- supports optional Cloudflare Turnstile verification,
- keeps the Groq API key in a Cloudflare Worker secret.

## Deploy

1. Install Wrangler:
   `npm install -g wrangler`
2. Authenticate:
   `wrangler login`
3. From this directory add the Groq key:
   `wrangler secret put GROQ_API_KEY`
4. Optional Turnstile:
   `wrangler secret put TURNSTILE_SECRET`
5. Deploy:
   `wrangler deploy`

After deployment copy the Worker URL, for example:
`https://ask-jan.<account>.workers.dev`

The frontend should call:
`POST <worker-url>/chat`

## Request

```json
{
  "question": "What experience does Jan have with AI?",
  "history": []
}
```

## Response

```json
{
  "answer": "...",
  "sources": [{"label":"Company RAG Agent","url":"..."}],
  "category": "ai",
  "provider": "groq",
  "model": "openai/gpt-oss-20b"
}
```

Do not commit `GROQ_API_KEY` or Turnstile secrets.
