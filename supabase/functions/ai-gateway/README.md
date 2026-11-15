# ai-gateway — Tallyn AI (Edge Function)

Server endpoint for the **Tallyn AI** chat drawer, the **Kiryana Radio** tip and **voice checkout**.
The AI key never reaches the browser.

```
POST /functions/v1/ai-gateway
{ "question": "...", "history": [{ "role": "user"|"assistant", "text": "..." }], "snapshot": { ... } }
→ 200 { "answer": "..." }

POST /functions/v1/ai-gateway   (Kiryana Radio tip of the day)
{ ...same fields, "mode": "radio", "radio": { "language": "English"|"Urdu", "script": "latin"|"urdu"|"devanagari" } }
→ 200 { "answer": "<tip shown on screen>", "spoken": "<same tip in the voice's script>" | null }

POST /functions/v1/ai-gateway   (voice checkout)
{ "mode": "order", "transcript": "do roof afza aur ek dalda udhaar asif", "alternatives": ["..."],
  "catalog": [{ "id", "name", "nameUr"?, "unit"? }], "customers": [{ "id", "name" }] }
→ 200 { "order": { "lines": [{ "heard", "productId" | null, "qty", "confidence", "alternatives": [ids] }],
                   "paymentType": "cash" | "credit" | null, "customerId": id | null } }
→ 400 contract violation · 413 too large · 429 daily limit · 502 model failed · 503 not configured
```

| File | Role |
|---|---|
| `index.ts` | HTTP handler: auth, size cap, Zod validation, rate limits, usage log |
| `schema.ts` | Request contract; clamps numbers, sanitises names (no `<>`, backticks, control chars) |
| `chat.ts` | Chat and radio prompts (scope, what to decline, numbers rule), snapshot rendering, reply-language detection, provider call |
| `seasons.ts` | Retail calendar (Ramadan, Eids, Muharram, school, summer, monsoon, winter); "days away" computed in code |
| `order.ts` | Voice checkout: request contract, prompt (catalogue as codes P1…Pn), and checks on the model's reply |
| `order_test.ts` | `deno test --allow-env supabase/functions/ai-gateway/` runs both test files |
| `chat_test.ts` | `deno test --allow-env supabase/functions/ai-gateway/chat_test.ts` |

## How numbers stay honest (Rule 1)

The app computes a **store snapshot** in tested code (`src/domain/storeSnapshot.ts`): today's sales,
last 7 days, udhaar and overdue counts, low stock, top sellers, items unsold for 30 days and the
money tied up in them. The prompt tells the model to quote only those figures and never to
calculate new figures about the shop; when a question needs one that isn't there, it points to the
right screen. General business knowledge (seasonal demand, what to stock, pricing, suppliers) is
allowed and encouraged; requests unrelated to business are declined. Upcoming festival dates and
how many days away they are come from `seasons.ts`, not from the model.
If the AI is unavailable, the drawer answers from the same snapshot.

## Setup (Supabase Dashboard)

1. **SQL Editor** → run `supabase/migrations/007_ai_chat_usage.sql`.
2. **Edge Functions → ai-gateway → redeploy** with `index.ts`, `schema.ts`, `chat.ts`, `seasons.ts` and `order.ts`
   (`chat_test.ts` and this README are not needed on the server).
3. Turn **Verify JWT OFF** for `ai-gateway` (it authenticates callers itself, so demo visitors can ask).
4. Secrets are shared with `bill-scan` — nothing new: `GEMINI_API_KEY`, `GEMINI_MODEL`,
   `AI_BASE_URL` (default `https://generativelanguage.googleapis.com/v1beta/openai/`), optional `AI_TIMEOUT_MS`.

## Voice checkout guardrails

- The model sees the catalogue as short codes (P1, P2…) and customers as C1, C2…; every code it
  returns is mapped back and checked, so it can't invent a product. Unknown items come back as
  "not sure" for the cashier to pick.
- Quantities are the counts spoken (no arithmetic), clamped to 1–99. Prices are never sent or
  returned; the app prices lines from its own catalogue.
- The app shows its offline match instantly, swaps in Gemini's reading when it arrives, and the
  cashier still confirms every line before anything reaches the cart.

## Limits (per rolling 24 h)

Questions (chat and radio tips) and voice orders are counted separately in `ai_chat_usage`
(voice orders use `order_…` statuses), so a busy counter can't use up the chat quota.

| | Questions | Voice orders |
|---|---|---|
| Signed-in user | 150 | 600 |
| Demo visitor, per IP (stored only as a salted SHA-256) | 30 | 60 |
| All demo visitors together | 1,500 | 2,000 |

Question and order text is not stored.
