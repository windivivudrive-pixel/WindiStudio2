-- CreatorFlow Commerce Migration

-- 1. Create ENUMs
CREATE TYPE product_type AS ENUM ('STUDIO_LICENSE', 'VOICE_UNITS');
CREATE TYPE order_status AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'UNDERPAID', 'OVERPAID', 'REVIEW_REQUIRED', 'REFUNDED');
CREATE TYPE ledger_transaction_type AS ENUM ('GRANT', 'RESERVE', 'COMMIT', 'RELEASE', 'ADJUSTMENT');
CREATE TYPE license_status AS ENUM ('ACTIVE', 'REVOKED');

-- 2. Products Table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type product_type NOT NULL,
    description TEXT,
    price_vnd INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb, -- e.g., {"voice_units": 30000}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Initial Products
INSERT INTO public.products (name, type, description, price_vnd, metadata)
VALUES 
    ('CreatorFlow Studio License', 'STUDIO_LICENSE', 'Lifetime license for CreatorFlow Studio.', 500000, '{}'::jsonb),
    ('Voice Starter', 'VOICE_UNITS', '30,000 Voice Units (approx 40 mins TTS)', 100000, '{"voice_units": 30000}'::jsonb),
    ('Voice Studio', 'VOICE_UNITS', '700,000 Voice Units (approx 15.5 hours TTS)', 1500000, '{"voice_units": 700000}'::jsonb);

-- 3. Orders Table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    total_amount_vnd INTEGER NOT NULL,
    status order_status NOT NULL DEFAULT 'PENDING',
    payment_code TEXT NOT NULL UNIQUE, -- The code users need to put in transfer description
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 4. Order Items Table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    price_vnd INTEGER NOT NULL, -- Price at the time of purchase
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Payment Events (Idempotency)
CREATE TABLE public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_id TEXT NOT NULL UNIQUE, -- SePay transaction ID
    order_id UUID REFERENCES public.orders(id),
    amount INTEGER NOT NULL,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Entitlements & Licenses
CREATE TABLE public.creatorflow_licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    order_item_id UUID REFERENCES public.order_items(id),
    status license_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Voice Wallet & Ledger
CREATE TABLE public.voice_wallets (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    balance BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.voice_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    order_item_id UUID REFERENCES public.order_items(id), -- Nullable if adjustment/refund
    type ledger_transaction_type NOT NULL,
    amount BIGINT NOT NULL, -- Positive for GRANT/RELEASE/ADJUST, Negative for RESERVE/COMMIT
    balance_after BIGINT NOT NULL,
    reference_id TEXT, -- E.g., TTS request ID
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Function to handle ledger inserts and update wallet
CREATE OR REPLACE FUNCTION update_voice_wallet_from_ledger()
RETURNS TRIGGER AS $$
DECLARE
    current_balance BIGINT;
BEGIN
    -- Get current or create wallet
    INSERT INTO public.voice_wallets (user_id, balance)
    VALUES (NEW.user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Calculate new balance
    UPDATE public.voice_wallets
    SET balance = balance + NEW.amount,
        updated_at = now()
    WHERE user_id = NEW.user_id
    RETURNING balance INTO current_balance;

    -- Set the balance_after in the ledger entry
    NEW.balance_after = current_balance;

    -- Protect against negative balance for COMMIT/RESERVE
    IF current_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient Voice Units';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_voice_ledger_insert
BEFORE INSERT ON public.voice_ledger
FOR EACH ROW
EXECUTE FUNCTION update_voice_wallet_from_ledger();

-- 8. Customer Voices
CREATE TABLE public.customer_voices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    provider_voice_id TEXT NOT NULL, -- Cartesia ID
    name TEXT NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT true,
    consent_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Download Events (Audit Log)
CREATE TABLE public.download_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    license_id UUID NOT NULL REFERENCES public.creatorflow_licenses(id),
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- --- RLS POLICIES ---
-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatorflow_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_events ENABLE ROW LEVEL SECURITY;

-- Products: Everyone can read active
CREATE POLICY "Public read active products" ON public.products FOR SELECT USING (is_active = true);

-- Orders: Users can read their own
CREATE POLICY "Users can read own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);

-- Order Items: Users can read items of their own orders
CREATE POLICY "Users can read own order items" ON public.order_items FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
);

-- Licenses: Users can read their own
CREATE POLICY "Users can read own licenses" ON public.creatorflow_licenses FOR SELECT USING (auth.uid() = user_id);

-- Voice Wallets: Users can read their own
CREATE POLICY "Users can read own voice wallet" ON public.voice_wallets FOR SELECT USING (auth.uid() = user_id);

-- Voice Ledger: Users can read their own
CREATE POLICY "Users can read own voice ledger" ON public.voice_ledger FOR SELECT USING (auth.uid() = user_id);

-- Customer Voices: Users can read, update, delete their own
CREATE POLICY "Users can read own voices" ON public.customer_voices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voices" ON public.customer_voices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own voices" ON public.customer_voices FOR DELETE USING (auth.uid() = user_id);
