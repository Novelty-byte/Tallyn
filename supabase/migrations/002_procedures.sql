-- ====================================================================
-- Tallyn Database Migration 002: Atomic Stored Procedures
-- Target: IceHacks 2026 (Zero Hallucinated Numbers & Atomic Mutations)
-- ====================================================================

-- Procedure 1: Atomic Record Sale with FOR UPDATE Row Locking
CREATE OR REPLACE FUNCTION public.record_sale(
    p_shop_id UUID,
    p_payment_type TEXT,
    p_items JSONB, -- Array of objects: [{"product_id": "...", "quantity": 2, "unit_price": 250}]
    p_customer_id UUID DEFAULT NULL,
    p_due_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_id UUID;
    v_item JSONB;
    v_product RECORD;
    v_total_amount NUMERIC(10, 2) := 0;
    v_item_subtotal NUMERIC(10, 2);
    v_item_qty NUMERIC(10, 2);
    v_item_price NUMERIC(10, 2);
    v_product_id UUID;
BEGIN
    -- Validate payment type
    IF p_payment_type NOT IN ('cash', 'credit') THEN
        RAISE EXCEPTION 'Invalid payment_type: %. Must be cash or credit', p_payment_type;
    END IF;

    -- Credit sales require customer_id
    IF p_payment_type = 'credit' AND p_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer ID is required for credit (Udhaar) sales';
    END IF;

    -- Calculate total and validate stock with FOR UPDATE row locks
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_item_qty := (v_item->>'quantity')::NUMERIC;
        v_item_price := (v_item->>'unit_price')::NUMERIC;

        IF v_item_qty <= 0 THEN
            RAISE EXCEPTION 'Quantity must be greater than zero';
        END IF;

        -- Lock product row for atomic update
        SELECT id, name, quantity, buy_price INTO v_product
        FROM public.products
        WHERE id = v_product_id AND shop_id = p_shop_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product with ID % not found in shop %', v_product_id, p_shop_id;
        END IF;

        IF v_product.quantity < v_item_qty THEN
            RAISE EXCEPTION 'Insufficient stock for "%". Available: %, Requested: %', 
                v_product.name, v_product.quantity, v_item_qty;
        END IF;

        v_item_subtotal := v_item_qty * v_item_price;
        v_total_amount := v_total_amount + v_item_subtotal;
    END LOOP;

    -- Insert sale record
    INSERT INTO public.sales (
        shop_id,
        customer_id,
        payment_type,
        total_amount,
        due_date,
        status
    ) VALUES (
        p_shop_id,
        p_customer_id,
        p_payment_type,
        v_total_amount,
        p_due_date,
        'completed'
    ) RETURNING id INTO v_sale_id;

    -- Insert line items and decrement stock atomically
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_item_qty := (v_item->>'quantity')::NUMERIC;
        v_item_price := (v_item->>'unit_price')::NUMERIC;

        -- Fetch current buy_price for immutable profit tracking
        SELECT buy_price INTO v_product
        FROM public.products
        WHERE id = v_product_id;

        INSERT INTO public.sale_items (
            sale_id,
            product_id,
            quantity,
            unit_price,
            unit_cost
        ) VALUES (
            v_sale_id,
            v_product_id,
            v_item_qty,
            v_item_price,
            v_product.buy_price
        );

        -- Decrement product quantity
        UPDATE public.products
        SET quantity = quantity - v_item_qty
        WHERE id = v_product_id;
    END LOOP;

    RETURN jsonb_build_object(
        'sale_id', v_sale_id,
        'total_amount', v_total_amount,
        'status', 'completed'
    );
END;
$$;

-- Procedure 2: Atomic Undo Sale (10-minute counter grace window)
CREATE OR REPLACE FUNCTION public.undo_sale(
    p_sale_id UUID,
    p_shop_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale RECORD;
    v_item RECORD;
BEGIN
    SELECT * INTO v_sale
    FROM public.sales
    WHERE id = p_sale_id AND shop_id = p_shop_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sale not found';
    END IF;

    IF v_sale.status = 'undone' THEN
        RAISE EXCEPTION 'Sale has already been undone';
    END IF;

    -- Check 10-minute undo window
    IF (timezone('utc'::text, now()) - v_sale.created_at) > INTERVAL '10 minutes' THEN
        RAISE EXCEPTION 'Undo window expired (allowed within 10 minutes of sale)';
    END IF;

    -- Restore product stock quantities
    FOR v_item IN SELECT * FROM public.sale_items WHERE sale_id = p_sale_id
    LOOP
        UPDATE public.products
        SET quantity = quantity + v_item.quantity
        WHERE id = v_item.product_id;
    END LOOP;

    -- Mark sale as undone
    UPDATE public.sales
    SET status = 'undone'
    WHERE id = p_sale_id;

    RETURN jsonb_build_object(
        'sale_id', p_sale_id,
        'status', 'undone',
        'message', 'Sale undone successfully. Stock restored.'
    );
END;
$$;

-- Procedure 3: Atomic Record Purchase (Restock from Supplier Bill)
CREATE OR REPLACE FUNCTION public.record_purchase(
    p_shop_id UUID,
    p_supplier_name TEXT,
    p_invoice_number TEXT,
    p_items JSONB -- [{"product_id": "...", "quantity": 10, "unit_cost": 220}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_purchase_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_qty NUMERIC(10, 2);
    v_cost NUMERIC(10, 2);
    v_total NUMERIC(10, 2) := 0;
BEGIN
    INSERT INTO public.purchases (
        shop_id,
        supplier_name,
        invoice_number,
        total_amount
    ) VALUES (
        p_shop_id,
        p_supplier_name,
        p_invoice_number,
        0
    ) RETURNING id INTO v_purchase_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::NUMERIC;
        v_cost := (v_item->>'unit_cost')::NUMERIC;

        INSERT INTO public.purchase_items (
            purchase_id,
            product_id,
            quantity,
            unit_cost
        ) VALUES (
            v_purchase_id,
            v_product_id,
            v_qty,
            v_cost
        );

        -- Increment stock and update latest supplier buy_price
        UPDATE public.products
        SET quantity = quantity + v_qty,
            buy_price = v_cost
        WHERE id = v_product_id AND shop_id = p_shop_id;

        v_total := v_total + (v_qty * v_cost);
    END LOOP;

    UPDATE public.purchases
    SET total_amount = v_total
    WHERE id = v_purchase_id;

    RETURN jsonb_build_object(
        'purchase_id', v_purchase_id,
        'total_amount', v_total
    );
END;
$$;

-- Procedure 4: Record Credit (Udhaar) Payment
CREATE OR REPLACE FUNCTION public.record_credit_payment(
    p_shop_id UUID,
    p_customer_id UUID,
    p_amount NUMERIC(10, 2),
    p_sale_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;

    INSERT INTO public.payments (
        shop_id,
        customer_id,
        sale_id,
        amount
    ) VALUES (
        p_shop_id,
        p_customer_id,
        p_sale_id,
        p_amount
    ) RETURNING id INTO v_payment_id;

    RETURN jsonb_build_object(
        'payment_id', v_payment_id,
        'amount', p_amount,
        'status', 'recorded'
    );
END;
$$;

-- Procedure 5: Audit-Logged Stock Adjustment
CREATE OR REPLACE FUNCTION public.adjust_stock(
    p_shop_id UUID,
    p_product_id UUID,
    p_delta NUMERIC(10, 2),
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.products
    SET quantity = quantity + p_delta
    WHERE id = p_product_id AND shop_id = p_shop_id;

    INSERT INTO public.stock_adjustments (
        shop_id,
        product_id,
        change_amount,
        reason
    ) VALUES (
        p_shop_id,
        p_product_id,
        p_delta,
        p_reason
    );

    RETURN jsonb_build_object(
        'product_id', p_product_id,
        'delta', p_delta,
        'status', 'adjusted'
    );
END;
$$;
