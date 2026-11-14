-- ====================================================================
-- Tallyn Database Migration 007: Ask Tallyn usage / rate limiting
--
-- Used only by the `ai-gateway` Edge Function with the service-role key.
-- Signed-in questions carry user_id; demo-visitor questions carry a salted
-- SHA-256 of the caller IP (the raw IP is never stored). Question text is
-- NOT stored.
-- RLS is enabled with NO policies, so browser roles can't read or write it.
-- Idempotent: safe to re-run.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.ai_chat_usage (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_hash      TEXT,
    status       TEXT NOT NULL DEFAULT 'started',
    answer_chars INT  NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT ai_chat_usage_caller CHECK (user_id IS NOT NULL OR ip_hash IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_user ON public.ai_chat_usage(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_demo ON public.ai_chat_usage(ip_hash, created_at DESC)
  WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_demo_all ON public.ai_chat_usage(created_at DESC)
  WHERE user_id IS NULL;

ALTER TABLE public.ai_chat_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_chat_usage FROM anon, authenticated;
