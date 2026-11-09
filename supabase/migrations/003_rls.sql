-- ====================================================================
-- Tallyn Database Migration 003: Row Level Security (RLS) Policies
-- Target: IceHacks 2026 (Strict Multi-Tenant Isolation per shop_id)
-- Idempotent: safe to re-run (DROP IF EXISTS before each CREATE)
-- ====================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- 2. Helper function to check shop ownership from JWT
CREATE OR REPLACE FUNCTION public.is_shop_owner(p_shop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.shops
        WHERE id = p_shop_id AND owner_id = auth.uid()
    );
$$;

-- 3. Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 4. Shops Policies
DROP POLICY IF EXISTS "Owners can view their own shops" ON public.shops;
CREATE POLICY "Owners can view their own shops"
    ON public.shops FOR SELECT
    USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can create shops" ON public.shops;
CREATE POLICY "Owners can create shops"
    ON public.shops FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their own shops" ON public.shops;
CREATE POLICY "Owners can update their own shops"
    ON public.shops FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete their own shops" ON public.shops;
CREATE POLICY "Owners can delete their own shops"
    ON public.shops FOR DELETE
    USING (auth.uid() = owner_id);

-- 5. Products Policies (scoped by shop_id)
DROP POLICY IF EXISTS "Users can view products belonging to their shop" ON public.products;
CREATE POLICY "Users can view products belonging to their shop"
    ON public.products FOR SELECT
    USING (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Users can insert products into their shop" ON public.products;
CREATE POLICY "Users can insert products into their shop"
    ON public.products FOR INSERT
    WITH CHECK (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Users can update products in their shop" ON public.products;
CREATE POLICY "Users can update products in their shop"
    ON public.products FOR UPDATE
    USING (public.is_shop_owner(shop_id))
    WITH CHECK (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Users can delete products from their shop" ON public.products;
CREATE POLICY "Users can delete products from their shop"
    ON public.products FOR DELETE
    USING (public.is_shop_owner(shop_id));

-- 6. Customers Policies
DROP POLICY IF EXISTS "Users can view customers of their shop" ON public.customers;
CREATE POLICY "Users can view customers of their shop"
    ON public.customers FOR SELECT
    USING (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Users can insert customers into their shop" ON public.customers;
CREATE POLICY "Users can insert customers into their shop"
    ON public.customers FOR INSERT
    WITH CHECK (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Users can update customers in their shop" ON public.customers;
CREATE POLICY "Users can update customers in their shop"
    ON public.customers FOR UPDATE
    USING (public.is_shop_owner(shop_id))
    WITH CHECK (public.is_shop_owner(shop_id));

-- 7. Sales & Sale Items Policies
DROP POLICY IF EXISTS "Users can view sales for their shop" ON public.sales;
CREATE POLICY "Users can view sales for their shop"
    ON public.sales FOR SELECT
    USING (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Users can insert sales for their shop" ON public.sales;
CREATE POLICY "Users can insert sales for their shop"
    ON public.sales FOR INSERT
    WITH CHECK (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Users can update sales for their shop" ON public.sales;
CREATE POLICY "Users can update sales for their shop"
    ON public.sales FOR UPDATE
    USING (public.is_shop_owner(shop_id))
    WITH CHECK (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Users can view sale items for their sales" ON public.sale_items;
CREATE POLICY "Users can view sale items for their sales"
    ON public.sale_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.sales
        WHERE sales.id = sale_items.sale_id AND public.is_shop_owner(sales.shop_id)
    ));

DROP POLICY IF EXISTS "Users can insert sale items for their sales" ON public.sale_items;
CREATE POLICY "Users can insert sale items for their sales"
    ON public.sale_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.sales
        WHERE sales.id = sale_items.sale_id AND public.is_shop_owner(sales.shop_id)
    ));

-- 8. Payments Policies
DROP POLICY IF EXISTS "Users can view payments for their shop" ON public.payments;
CREATE POLICY "Users can view payments for their shop"
    ON public.payments FOR SELECT
    USING (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Users can insert payments for their shop" ON public.payments;
CREATE POLICY "Users can insert payments for their shop"
    ON public.payments FOR INSERT
    WITH CHECK (public.is_shop_owner(shop_id));

-- 9. Purchases & Purchase Items Policies
DROP POLICY IF EXISTS "Users can view purchases for their shop" ON public.purchases;
CREATE POLICY "Users can view purchases for their shop"
    ON public.purchases FOR SELECT
    USING (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Users can insert purchases for their shop" ON public.purchases;
CREATE POLICY "Users can insert purchases for their shop"
    ON public.purchases FOR INSERT
    WITH CHECK (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Users can view purchase items for their purchases" ON public.purchase_items;
CREATE POLICY "Users can view purchase items for their purchases"
    ON public.purchase_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.purchases
        WHERE purchases.id = purchase_items.purchase_id AND public.is_shop_owner(purchases.shop_id)
    ));

-- 10. Expenses Policies
DROP POLICY IF EXISTS "Users can view expenses for their shop" ON public.expenses;
CREATE POLICY "Users can view expenses for their shop"
    ON public.expenses FOR SELECT
    USING (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Users can insert expenses for their shop" ON public.expenses;
CREATE POLICY "Users can insert expenses for their shop"
    ON public.expenses FOR INSERT
    WITH CHECK (public.is_shop_owner(shop_id));

-- 11. Stock Adjustments Policies
DROP POLICY IF EXISTS "Users can view adjustments for their shop" ON public.stock_adjustments;
CREATE POLICY "Users can view adjustments for their shop"
    ON public.stock_adjustments FOR SELECT
    USING (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Users can insert adjustments for their shop" ON public.stock_adjustments;
CREATE POLICY "Users can insert adjustments for their shop"
    ON public.stock_adjustments FOR INSERT
    WITH CHECK (public.is_shop_owner(shop_id));

-- 12. Wholesale Prices Policies (Authenticated read for benchmark comparison)
DROP POLICY IF EXISTS "Authenticated users can read wholesale benchmark prices" ON public.wholesale_prices;
CREATE POLICY "Authenticated users can read wholesale benchmark prices"
    ON public.wholesale_prices FOR SELECT
    TO authenticated
    USING (true);

-- 13. AI Usage Policies (service role inserts bypass RLS; users can read own usage)
DROP POLICY IF EXISTS "Users can view their own AI usage" ON public.ai_usage;
CREATE POLICY "Users can view their own AI usage"
    ON public.ai_usage FOR SELECT
    USING (auth.uid() = user_id);
