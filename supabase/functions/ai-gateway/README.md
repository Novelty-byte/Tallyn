# ai-gateway — Tallyn AI (Edge Function)

Server endpoint for the **Tallyn AI** chat drawer (answers and proposed actions), the **Kiryana Radio** tip and **voice checkout**.
The AI key never reaches the browser.

```
POST /functions/v1/ai-gateway
{ "question": "...", "history": [{ "role": "user"|"assistant", "text": "..." }], "snapshot": { ... } }
→ 200 { "answer": "..." }

POST /functions/v1/ai-gateway   (chat that can propose an action)
{ ...chat fields, "refs": { "products": [{ "id", "name", "nameUr"? }], "customers": [{ "id", "name" }] } }
→ 200 { "answer": "...", "notFound": ["pepsi"], "action": null
        | { "type": "sale", "items": [{ "productId", "qty" }], "paymentType": "cash"|"credit", "customerId" }
        | { "type": "purchase", "items": [{ "productId", "qty", "unitCost" | null }], "supplier" }
        | { "type": "payment", "customerId", "amount" }
        | { "type": "reminder", "customerId" } }

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
| `providers.ts` | Provider chain: primary, then OpenRouter backups; per-attempt and total time limits. **Identical copy in `bill-scan/`** (a test checks) |
| `agent.ts` | Chat actions: rules for proposing a sale / purchase / payment / reminder, codes ↔ ids, checks on the reply |
| `*_test.ts` | `deno test --allow-env supabase/functions/ai-gateway/` runs all test files |
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
2. **Edge Functions → ai-gateway → redeploy** with `index.ts`, `schema.ts`, `chat.ts`, `seasons.ts`, `order.ts`, `agent.ts` and `providers.ts`
   (`chat_test.ts` and this README are not needed on the server).
3. Turn **Verify JWT OFF** for `ai-gateway` (it authenticates callers itself, so demo visitors can ask).
4. Secrets are shared with `bill-scan`: `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_BASE_URL` (primary),
   `OPENROUTER_API_KEY` (backups; optional `OPENROUTER_MODELS`), optional `AI_TIMEOUT_MS`.

## Backup AI (provider chain)

Every call tries the primary first, then each OpenRouter model in `OPENROUTER_MODELS`
(default `dots-studio/dots-3-note-preview:free`, then `google/gemma-4-31b-it:free`).
A provider is skipped on any HTTP error (402 out of credit, 429, 5xx), a timeout, an empty reply,
or a reply that fails our checks (e.g. a voice order that can't be parsed). If all fail, the app
uses its non-AI fallback. Backups always run with reasoning off: with it on, these free models took
10–34 s for a one-line reply; with it off, ~1–2 s. Fallbacks are logged in the function logs.

Tested 2026-11-16 with the primary returning 402: `dots-3-note` handled chat, actions, radio tips,
voice orders and bill photos correctly. `google/gemma-4-31b-it:free` replaced Nemotron as the second
backup (Nemotron miscounted voice-order quantities and couldn't read bill photos); Gemma 4 reads
images, so it can scan bills too.

## Action guardrails ("Ask can do things")

- Actions are only ever **proposed**. The app shows an editable confirmation card; nothing is
  saved until the shopkeeper taps Approve, which calls the same tested functions as the rest of the
  app (`record_sale`, `record_purchase`, `record_credit_payment`; a reminder only opens WhatsApp).
- Products and customers are sent as codes; unknown codes are dropped here and ids are checked
  again in the app (`src/domain/agentActions.ts`). Only four action types exist; anything else is ignored.
- Quantities and amounts are the numbers the shopkeeper said. Prices, costs and totals come from
  the catalogue in code; a payment can't exceed what the customer owes.
- If the reply isn't valid JSON, it is shown as a plain answer with no action.

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
