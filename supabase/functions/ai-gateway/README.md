# Tallyn AI Gateway — Supabase Edge Function

## Endpoint Pattern

```
https://<project-ref>.supabase.co/functions/v1/ai-gateway
```

Replace `<project-ref>` with your Supabase project identifier (found in project settings, often in the URL bar).

**Authorization:** Requires a valid Supabase JWT in the `Authorization` header (bearer format) or `X-Client-Info` for older clients.

**Content-Type:** `application/json`

---

## Deployment (Dashboard Steps)

1. Navigate to your Supabase project in the dashboard:
   ```
   https://supabase.com/dashboard/project/<project-ref>
   ```

2. Go to **Functions** in the sidebar:
   - Click **Functions** → **New Function**
   - Name: `ai-gateway`

3. Upload the files:
   - Use the "Upload" feature in the Functions editor.
   - Upload `index.ts`.
   - Upload `schema.ts`.
   - Rename `README.md` to `.keep` (or skip if the editor supports files with extensions).

4. Edit `index.ts` to reference the environment variable `GEMINI_API_KEY`:
   - Ensure your project's **Settings → Secrets** contains the secret:
     ```
     Name: GEMINI_API_KEY
     Value: sk-your-api-key-here
     ```
   - The code accesses it with `Deno.env.get("GEMINI_API_KEY")`.

5. Enable the function:
   - Ensure the function is **Activated** (status: Active).

6. Verify testing via the Supabase CLI OR a secure frontend client calling the endpoint.

7. Restart if needed (if you see function errors).

---

## Security Contract

- All numbers passed to the model come from **RLS-scoped** data (via the caller's JWT).
- The gateway **never** exposes `GEMINI_API_KEY` to the client.
- The function validates **all** inbound/outbound data with strict Zod schemas.
- Usage is tracked in `public.ai_usage` with `user_id`, `feature_name`, `tokens_used`.
- If Gemini is unavailable, a deterministic fallback (computed locally) is returned.

---

## Required Database Row

If migration `006_ai_usage_trigger.sql` has not been applied, use the helper:

```sql
INSERT INTO public.ai_usage (user_id, feature_name, tokens_used)
VALUES (auth.uid(), 'advisor', 0);
```

Ensure foreign key constraints and RLS allow you to insert.