-- =====================================================
-- CAMPAIGN REGISTRATIONS TABLE
-- =====================================================
-- Lưu đăng ký từ chiến dịch Holiday Campaign
-- Copy và chạy trong Supabase Dashboard > SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS campaign_registrations (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('shop', 'creator')),
    brand_name TEXT NOT NULL,
    email TEXT NOT NULL,
    tiktok_url TEXT,
    instagram_url TEXT,
    facebook_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index để tìm kiếm nhanh theo email và type
CREATE INDEX IF NOT EXISTS idx_campaign_registrations_email ON campaign_registrations(email);
CREATE INDEX IF NOT EXISTS idx_campaign_registrations_type ON campaign_registrations(type);

-- RLS Policy (cho phép insert từ anon/authenticated, chỉ admin đọc)
ALTER TABLE campaign_registrations ENABLE ROW LEVEL SECURITY;

-- Cho phép mọi người insert (public form)
CREATE POLICY "Allow public insert" ON campaign_registrations
    FOR INSERT WITH CHECK (true);

-- Chỉ service role/admin có thể đọc
CREATE POLICY "Only service role can read" ON campaign_registrations
    FOR SELECT USING (auth.role() = 'service_role');
