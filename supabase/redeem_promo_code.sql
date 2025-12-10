-- =====================================================
-- PROMO CODE WITH 3-LAYER ANTI-CHEAT
-- =====================================================
-- Layer 1: FingerprintJS browser fingerprint (device_id)
-- Layer 2: localStorage persistent token (local_token)
-- Layer 3: IP Address from request headers (ip_address)
-- =====================================================
-- Copy and paste this SQL into Supabase Dashboard > SQL Editor
-- This replaces the existing redeem_promo_code function
-- =====================================================

-- STEP 0: Drop old function versions to avoid ambiguity
DROP FUNCTION IF EXISTS redeem_promo_code(TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS redeem_promo_code(TEXT, UUID, TEXT, TEXT, TEXT);

-- STEP 1: Add new columns to user_used_promos table
ALTER TABLE user_used_promos 
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS local_token TEXT;

-- STEP 2: Create updated function
CREATE OR REPLACE FUNCTION redeem_promo_code(
    code_input TEXT,
    user_id_input UUID,
    device_id_input TEXT DEFAULT NULL,
    local_token_input TEXT DEFAULT NULL,
    ip_address_input TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    promo RECORD;
    user_record RECORD;
    existing_usage RECORD;
    device_usage RECORD;
    token_usage RECORD;
    ip_usage RECORD;
    new_balance NUMERIC;
BEGIN
    -- 1. Validate promo code exists and is active
    SELECT * INTO promo FROM promo_codes 
    WHERE UPPER(code) = UPPER(code_input) 
    AND is_active = true 
    AND is_used_up = false
    AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Mã không hợp lệ hoặc đã hết hạn');
    END IF;
    
    -- 2. Check usage limit
    IF promo.max_uses_total IS NOT NULL THEN
        IF promo.current_uses >= promo.max_uses_total THEN
            RETURN json_build_object('success', false, 'message', 'Mã đã hết lượt sử dụng');
        END IF;
    END IF;
    
    -- 3. Get user profile
    SELECT * INTO user_record FROM profiles WHERE id = user_id_input;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Không tìm thấy người dùng');
    END IF;
    
    -- =====================================================
    -- TYPE-SPECIFIC VALIDATION
    -- =====================================================
    
    IF promo.type = 'KOL' THEN
        -- KOL CODE LOGIC
        -- Step 1: Check if user already has a referral code
        IF user_record.referred_by_code IS NOT NULL THEN
            RETURN json_build_object('success', false, 'message', 'Bạn đã sử dụng mã giới thiệu trước đó');
        END IF;
        
        -- Step 2: Check if this device already used ANY KOL code (fingerprint)
        IF device_id_input IS NOT NULL AND device_id_input != '' THEN
            SELECT * INTO device_usage FROM user_used_promos uup
            JOIN promo_codes pc ON uup.promo_code = pc.code
            WHERE uup.device_id = device_id_input 
            AND pc.type = 'KOL'
            LIMIT 1;
            
            IF FOUND THEN
                RETURN json_build_object('success', false, 'message', 'Thiết bị bạn đã sử dụng mã giới thiệu');
            END IF;
        END IF;
        
        -- Step 3: Check localStorage token for any KOL code
        IF local_token_input IS NOT NULL AND local_token_input != '' THEN
            SELECT * INTO token_usage FROM user_used_promos uup
            JOIN promo_codes pc ON uup.promo_code = pc.code
            WHERE uup.local_token = local_token_input 
            AND pc.type = 'KOL'
            LIMIT 1;
            
            IF FOUND THEN
                RETURN json_build_object('success', false, 'message', 'Thiết bị đã sử dụng mã giới thiệu');
            END IF;
        END IF;
        
        -- Step 4: Check IP address for any KOL code
        IF ip_address_input IS NOT NULL AND ip_address_input != '' THEN
            SELECT * INTO ip_usage FROM user_used_promos uup
            JOIN promo_codes pc ON uup.promo_code = pc.code
            WHERE uup.ip_address = ip_address_input 
            AND pc.type = 'KOL'
            LIMIT 1;
            
            IF FOUND THEN
                RETURN json_build_object('success', false, 'message', 'Thiết bị này đã sử dụng mã giới thiệu');
            END IF;
        END IF;
        
    ELSIF promo.type = 'VOUCHER' THEN
        -- VOUCHER CODE LOGIC - Check ALL 3 identifiers
        
        -- Step 1: Check if user already used this specific code
        SELECT * INTO existing_usage FROM user_used_promos 
        WHERE user_id = user_id_input AND UPPER(promo_code) = UPPER(code_input)
        LIMIT 1;
        
        IF FOUND THEN
            RETURN json_build_object('success', false, 'message', 'Bạn đã sử dụng mã này rồi');
        END IF;
        
        -- Step 2: Check fingerprint (device_id)
        IF device_id_input IS NOT NULL AND device_id_input != '' THEN
            SELECT * INTO device_usage FROM user_used_promos 
            WHERE device_id = device_id_input AND UPPER(promo_code) = UPPER(code_input)
            LIMIT 1;
            
            IF FOUND THEN
                RETURN json_build_object('success', false, 'message', 'Thiết bị này đã sử dụng mã này');
            END IF;
        END IF;
        
        -- Step 3: Check localStorage token
        IF local_token_input IS NOT NULL AND local_token_input != '' THEN
            SELECT * INTO token_usage FROM user_used_promos 
            WHERE local_token = local_token_input AND UPPER(promo_code) = UPPER(code_input)
            LIMIT 1;
            
            IF FOUND THEN
                RETURN json_build_object('success', false, 'message', 'Trình duyệt này đã sử dụng mã này');
            END IF;
        END IF;
        
        -- Step 4: Check IP address
        IF ip_address_input IS NOT NULL AND ip_address_input != '' THEN
            SELECT * INTO ip_usage FROM user_used_promos 
            WHERE ip_address = ip_address_input AND UPPER(promo_code) = UPPER(code_input)
            LIMIT 1;
            
            IF FOUND THEN
                RETURN json_build_object('success', false, 'message', 'Mạng này đã sử dụng mã này');
            END IF;
        END IF;
        
    ELSE
        -- DEFAULT/OTHER TYPE (PUBLIC, PRIVATE): Check user already used this code
        SELECT * INTO existing_usage FROM user_used_promos 
        WHERE user_id = user_id_input AND UPPER(promo_code) = UPPER(code_input)
        LIMIT 1;
        
        IF FOUND THEN
            RETURN json_build_object('success', false, 'message', 'Bạn đã sử dụng mã này rồi');
        END IF;
    END IF;
    
    -- =====================================================
    -- APPLY REWARD
    -- =====================================================
    
    -- Add credits to user
    new_balance := COALESCE(user_record.credits, 0) + promo.credits_reward;
    
    UPDATE profiles SET credits = new_balance WHERE id = user_id_input;
    
    -- Record usage with ALL identifiers
    INSERT INTO user_used_promos (user_id, promo_code, device_id, local_token, ip_address)
    VALUES (user_id_input, promo.code, device_id_input, local_token_input, ip_address_input);
    
    -- Update usage count
    UPDATE promo_codes SET current_uses = COALESCE(current_uses, 0) + 1 WHERE code = promo.code;
    
    -- For KOL codes, update user's referred_by_code
    IF promo.type = 'KOL' THEN
        UPDATE profiles SET referred_by_code = promo.code WHERE id = user_id_input;
    END IF;
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Nhập mã thành công! +' || promo.credits_reward || ' Xu',
        'reward', promo.credits_reward,
        'new_balance', new_balance
    );
END;
$$;
