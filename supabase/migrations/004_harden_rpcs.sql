-- ====================================================================
-- Tallyn Database Migration 004: Harden SECURITY DEFINER RPCs
--
-- Problem: the procedures in 002 run as SECURITY DEFINER (bypassing RLS)
-- but never verified that the caller owns p_shop_id. Any authenticated
-- user who knew another shop's UUID could mutate that shop's data.
--
-- Fix (non-destructive): keep the original bodies as private `_impl_*`
-- functions that are NOT callable by API roles, and re-create the public
-- names as thin SECURITY DEFINER wrappers that:
--   1. require an authenticated user,
--   2. require public.is_shop_owner(p_shop_id),
--   3. verify any customer_id belongs to the same shop,
--   4. pin search_path,
--   5. are executable only by `authenticated`.
-- Idempotent: safe to re-run once. (Run 002 and 003 first.)
-- ====================================================================

-- 0. Rename the originals exactly once.
DO $$
BEGIN
  IF to_regprocedure('public.record_sale(uuid,text,jsonb,uuid,date)') IS NOT NULL
     AND to_regprocedure('public._impl_record_sale(uuid,text,jsonb,uuid,date)') IS NULL THEN
    ALTER FUNCTION public.record_sale(uuid,text,jsonb,uuid,date) RENAME TO _impl_record_sale;
  END IF;
  IF to_regprocedure('public.undo_sale(uuid,uuid)') IS NOT NULL
     AND to_regprocedure('public._impl_undo_sale(uuid,uuid)') IS NULL THEN
    ALTER FUNCTION public.undo_sale(uuid,uuid) RENAME TO _impl_undo_sale;
  END IF;
  IF to_regprocedure('public.record_purchase(uuid,text,text,jsonb)') IS NOT NULL
     AND to_regprocedure('public._impl_record_purchase(uuid,text,text,jsonb)') IS NULL THEN
    ALTER FUNCTION public.record_purchase(uuid,text,text,jsonb) RENAME TO _impl_record_purchase;
  END IF;
  IF to_regprocedure('public.record_credit_payment(uuid,uuid,numeric,uuid)') IS NOT NULL
     AND to_regprocedure('public._impl_record_credit_payment(uuid,uuid,numeric,uuid)') IS NULL THEN
    ALTER FUNCTION public.record_credit_payment(uuid,uuid,numeric,uuid) RENAME TO _impl_record_credit_payment;
  END IF;
  IF to_regprocedure('public.adjust_stock(uuid,uuid,numeric,text)') IS NOT NULL
     AND to_regprocedure('public._impl_adjust_stock(uuid,uuid,numeric,text)') IS NULL THEN
    ALTER FUNCTION public.adjust_stock(uuid,uuid,numeric,text) RENAME TO _impl_adjust_stock;
  END IF;
END $$;

-- Private impls: nobody but the wrappers (owner) may call them.
ALTER FUNCTION public._impl_record_sale(uuid,text,jsonb,uuid,date) SET search_path = public;
ALTER FUNCTION public._impl_undo_sale(uuid,uuid) SET search_path = public;
ALTER FUNCTION public._impl_record_purchase(uuid,text,text,jsonb) SET search_path = public;
ALTER FUNCTION public._impl_record_credit_payment(uuid,uuid,numeric,uuid) SET search_path = public;
ALTER FUNCTION public._impl_adjust_stock(uuid,uuid,numeric,text) SET search_path = public;

REVOKE ALL ON FUNCTION public._impl_record_sale(uuid,text,jsonb,uuid,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._impl_undo_sale(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._impl_record_purchase(uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._impl_record_credit_payment(uuid,uuid,numeric,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._impl_adjust_stock(uuid,uuid,numeric,text) FROM PUBLIC, anon, authenticated;

-- Shared guard -------------------------------------------------------
CREATE OR REPLACE FUNCTION public._assert_shop_access(p_shop_id UUID, p_customer_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_shop_id IS NULL OR NOT public.is_shop_owner(p_shop_id) THEN
    RAISE EXCEPTION 'Forbidden: you do not own this shop' USING ERRCODE = '42501';
  END IF;
  IF p_customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.customers WHERE id = p_customer_id AND shop_id = p_shop_id
  ) THEN
    RAISE EXCEPTION 'Customer does not belong to this shop' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public._assert_shop_access(uuid,uuid) FROM PUBLIC, anon, authenticated;

-- Public wrappers (same names/signatures the frontend already calls) --
CREATE OR REPLACE FUNCTION public.record_sale(
  p_shop_id UUID, p_payment_type TEXT, p_items JSONB,
  p_customer_id UUID DEFAULT NULL, p_due_date DATE DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._assert_shop_access(p_shop_id, p_customer_id);
  RETURN public._impl_record_sale(p_shop_id, p_payment_type, p_items, p_customer_id, p_due_date);
END;
$$;

CREATE OR REPLACE FUNCTION public.undo_sale(p_sale_id UUID, p_shop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._assert_shop_access(p_shop_id);
  RETURN public._impl_undo_sale(p_sale_id, p_shop_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_purchase(
  p_shop_id UUID, p_supplier_name TEXT, p_invoice_number TEXT, p_items JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._assert_shop_access(p_shop_id);
  RETURN public._impl_record_purchase(p_shop_id, p_supplier_name, p_invoice_number, p_items);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_credit_payment(
  p_shop_id UUID, p_customer_id UUID, p_amount NUMERIC, p_sale_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._assert_shop_access(p_shop_id, p_customer_id);
  RETURN public._impl_record_credit_payment(p_shop_id, p_customer_id, p_amount, p_sale_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_shop_id UUID, p_product_id UUID, p_delta NUMERIC, p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._assert_shop_access(p_shop_id);
  RETURN public._impl_adjust_stock(p_shop_id, p_product_id, p_delta, p_reason);
END;
$$;

REVOKE ALL ON FUNCTION public.record_sale(uuid,text,jsonb,uuid,date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.undo_sale(uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_purchase(uuid,text,text,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_credit_payment(uuid,uuid,numeric,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.adjust_stock(uuid,uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_sale(uuid,text,jsonb,uuid,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_sale(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_purchase(uuid,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_credit_payment(uuid,uuid,numeric,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid,uuid,numeric,text) TO authenticated;
