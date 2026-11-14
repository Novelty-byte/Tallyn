-- ====================================================================
-- Tallyn Database Migration 005: Udhaar due dates + payment guard
--
-- Run AFTER 004. Replaces the public wrappers from 004 (same names and
-- signatures, so the frontend calls are unchanged and the existing
-- GRANTs to `authenticated` are kept by CREATE OR REPLACE).
--
-- record_sale:
--   * credit sales always get a due date (default: today + 7 days,
--     Asia/Karachi calendar) and may not be dated more than a day in
--     the past (1-day slack for client/server timezone differences);
--   * cash sales never carry a due date;
--   * the customer row is locked so a concurrent payment sees a
--     consistent balance.
--
-- record_credit_payment:
--   * locks the customer row (serialises payments & credit sales for
--     that customer), then rejects any payment larger than the current
--     outstanding balance = completed credit sales - payments.
--   This is the same definition the app uses (services/supabase.ts
--   mapCustomer + lib/credit summarizeCredit, which applies payments to
--   the oldest credit sales first).
--
-- Errors use SQLSTATE 22023 (invalid_parameter_value) so the client can
-- tell "server refused" apart from "network down" and never fakes a
-- refused write locally.
-- Idempotent: safe to re-run.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.record_sale(
  p_shop_id UUID, p_payment_type TEXT, p_items JSONB,
  p_customer_id UUID DEFAULT NULL, p_due_date DATE DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'Asia/Karachi')::date;
  v_due   DATE := p_due_date;
BEGIN
  PERFORM public._assert_shop_access(p_shop_id, p_customer_id);

  IF p_payment_type = 'credit' THEN
    IF p_customer_id IS NULL THEN
      RAISE EXCEPTION 'Choose a customer for this udhaar sale' USING ERRCODE = '22023';
    END IF;
    IF v_due IS NULL THEN
      v_due := v_today + 7;
    ELSIF v_due < v_today - 1 THEN
      RAISE EXCEPTION 'Due date % is in the past', v_due USING ERRCODE = '22023';
    END IF;
    -- Serialise with record_credit_payment for this customer.
    PERFORM 1 FROM public.customers
      WHERE id = p_customer_id AND shop_id = p_shop_id
      FOR UPDATE;
  ELSE
    v_due := NULL;
  END IF;

  RETURN public._impl_record_sale(p_shop_id, p_payment_type, p_items, p_customer_id, v_due);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_credit_payment(
  p_shop_id UUID, p_customer_id UUID, p_amount NUMERIC, p_sale_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owed        NUMERIC;
  v_paid        NUMERIC;
  v_outstanding NUMERIC;
BEGIN
  PERFORM public._assert_shop_access(p_shop_id, p_customer_id);

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero' USING ERRCODE = '22023';
  END IF;

  -- Lock the customer so two cashiers can't both accept the last rupee.
  PERFORM 1 FROM public.customers
    WHERE id = p_customer_id AND shop_id = p_shop_id
    FOR UPDATE;

  SELECT COALESCE(SUM(total_amount), 0) INTO v_owed
    FROM public.sales
   WHERE shop_id = p_shop_id
     AND customer_id = p_customer_id
     AND payment_type = 'credit'
     AND status = 'completed';

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
    FROM public.payments
   WHERE shop_id = p_shop_id
     AND customer_id = p_customer_id;

  v_outstanding := v_owed - v_paid;

  IF p_amount > v_outstanding THEN
    RAISE EXCEPTION 'Payment of Rs % is more than the Rs % owed', p_amount, GREATEST(v_outstanding, 0)
      USING ERRCODE = '22023';
  END IF;

  IF p_sale_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sales
     WHERE id = p_sale_id AND shop_id = p_shop_id AND customer_id = p_customer_id
  ) THEN
    RAISE EXCEPTION 'Sale does not belong to this customer' USING ERRCODE = '22023';
  END IF;

  RETURN public._impl_record_credit_payment(p_shop_id, p_customer_id, p_amount, p_sale_id);
END;
$$;

-- Re-assert privileges (no-op if unchanged).
REVOKE ALL ON FUNCTION public.record_sale(uuid,text,jsonb,uuid,date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_credit_payment(uuid,uuid,numeric,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_sale(uuid,text,jsonb,uuid,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_credit_payment(uuid,uuid,numeric,uuid) TO authenticated;

-- Index for the per-customer balance sums above.
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(shop_id, customer_id)
  WHERE customer_id IS NOT NULL;
