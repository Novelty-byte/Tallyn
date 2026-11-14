# ai-gateway — Tallyn AI (Edge Function)

Server endpoint for the **Tallyn AI** chat drawer. The AI key never reaches the browser.

```
POST /functions/v1/ai-gateway
{ "question": "...", "history": [{ "role": "user"|"assistant", "text": "..." }], "snapshot": { ... } }
→ 200 { "answer": "..." }
→ 400 contract violation · 413 too large · 429 daily limit · 502 model failed · 503 not configured
```

| File | Role |
|---|---|
| `index.ts` | HTTP handler: auth, size cap, Zod validation, rate limits, usage log |
| `schema.ts` | Request contract; clamps numbers, sanitises names (no `<>`, backticks, control chars) |
| `chat.ts` | System prompt, snapshot rendering, reply-language detection, provider call |
| `chat_test.ts` | `deno test --allow-env supabase/functions/ai-gateway/chat_test.ts` |

## How numbers stay honest (Rule 1)

The app computes a **store snapshot** in tested code (`src/domain/storeSnapshot.ts`): today's sales,
last 7 days, udhaar and overdue counts, low stock, top sellers, items unsold for 30 days and the
money tied up in them. The prompt tells the model to quote only those figures and never to
calculate new ones; when a question needs a number that isn't there, it points to the right screen.
If the AI is unavailable, the drawer answers from the same snapshot.

## Setup (Supabase Dashboard)

1. **SQL Editor** → run `supabase/migrations/007_ai_chat_usage.sql`.
2. **Edge Functions → ai-gateway → redeploy** with `index.ts`, `schema.ts` and `chat.ts`
   (`chat_test.ts` and this README are not needed on the server).
3. Turn **Verify JWT OFF** for `ai-gateway` (it authenticates callers itself, so demo visitors can ask).
4. Secrets are shared with `bill-scan` — nothing new: `GEMINI_API_KEY`, `GEMINI_MODEL`,
   optional `AI_BASE_URL`, `AI_TIMEOUT_MS`.

## Limits (per rolling 24 h)

- Signed-in user: 150 questions
- Demo visitor: 30 per IP (stored only as a salted SHA-256), 1,500 across all demo visitors

Question text is not stored.
