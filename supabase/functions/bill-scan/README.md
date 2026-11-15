# bill-scan — Supplier Bill Scanner (Edge Function)

Reads a photo of a supplier bill and returns its lines as **drafts**. Nothing is
written to the shop's books here: the app shows an editable review sheet and only
the shopkeeper's **Save** calls `record_purchase`.

```
POST /functions/v1/bill-scan
{ "image": { "mimeType": "image/jpeg", "data": "<base64>" } }
→ 200 { readable, supplier, invoiceNumber, billDate, billTotal, lines: [{ name, nameEnglish, quantity, unit, unitPrice, lineTotal }] }
→ 413 too large · 422 unreadable · 429 daily limit · 502 model failed · 503 not configured
```

| File | Role |
|---|---|
| `index.ts` | HTTP handler: auth, size cap, rate limits, usage log |
| `extract.ts` | Prompt, Gemini JSON schema, Zod output check, provider call |

## Setup (Supabase Dashboard)

1. **SQL Editor** → run `supabase/migrations/006_bill_scan_usage.sql` (rate-limit table).
2. **Edge Functions → Deploy a new function** named `bill-scan`; paste/upload
   `index.ts` **and** `extract.ts` (same folder).
3. In the function's settings turn **Verify JWT OFF**. The function authenticates
   callers itself: a valid user session gets the signed-in limit; everyone else
   (demo visitors holding only the publishable key) gets the demo limit.
4. **Edge Functions → Secrets**:

| Secret | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | yes | Gemini key from Google AI Studio. A key starting `AIza` calls Gemini's native API; any other key goes to `AI_BASE_URL`. |
| `AI_BASE_URL` | no | OpenAI-compatible base URL. Default `https://generativelanguage.googleapis.com/v1beta/openai/` (Google's own). |
| `GEMINI_MODEL` | no | e.g. `models/gemini-3.5-flash`. Default `gemini-3.5-flash`. |
| `AI_TIMEOUT_MS` | no | Default 100000. Free tiers can queue; Supabase allows ~150 s per request. |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

## Limits (per rolling 24 h)

- Signed-in user: 40 scans
- Demo visitor: 6 scans per IP (stored only as a salted SHA-256), 200 across all demo visitors

## Guardrails

- The model only transcribes. It is told never to calculate; unit costs, catalog
  matching, total checks and price-rise alerts are computed in `src/domain/billMatching.ts`
  (unit-tested, including a real model answer in `src/domain/billMatching.realScan.test.ts`).
- Output must pass the Zod schema in `extract.ts` or the request fails with 502.
- Text in the photo is treated as data (tested with an "ignore previous instructions" line).
- Every attempt is counted before the model is called, so failures still count.

## Verified

`free/gemini-3.8-flash` via apinex.bond (2026-11-15) read the same 3-line printed test bill in ~4 s,
every field exact.

`models/gemini-3.5-flash` via Google's OpenAI-compatible endpoint (2026-11-15) read a 3-line
printed test bill in ~5 s: supplier, invoice no., date (14-11-2026 → 2026-11-14), every
quantity, rate, amount and the total exact.

Earlier, `gemini-3.5-flash-lite` via electronhub read a 5-line printed test bill in ~10 s:
supplier, invoice no., date (12/11/2026 → 2026-11-12), all quantities/rates/amounts
exact, "Cheeni" → "Sugar 1kg", injection line ignored, a wrong printed amount kept
as printed (and then flagged by the app).
