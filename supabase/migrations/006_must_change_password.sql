-- ============================================
-- Migration: Add must_change_password flag
-- Tracks whether user needs to change their password
-- ============================================

-- 1. Add must_change_password column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE;

-- 2. Update login_user function to return must_change_password flag
DROP FUNCTION IF EXISTS login_user(VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION login_user(p_nip VARCHAR, p_password VARCHAR)
RETURNS TABLE(
    user_id UUID,
    nip VARCHAR,
    full_name VARCHAR,
    email VARCHAR,
    role_id INTEGER,
    role_code VARCHAR,
    role_name VARCHAR,
    is_active BOOLEAN,
    password_needs_change BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id AS user_id,
        u.nip,
        u.full_name,
        u.email,
        u.role_id,
        r.code AS role_code,
        r.name AS role_name,
        u.is_active,
        COALESCE(u.must_change_password, TRUE) AS password_needs_change
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE u.nip = p_nip 
      AND u.is_active = TRUE
      AND verify_password(p_password, u.password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update change_user_password to also clear the must_change_password flag
DROP FUNCTION IF EXISTS change_user_password(UUID, VARCHAR);

CREATE OR REPLACE FUNCTION change_user_password(p_user_id UUID, p_new_password VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET password_hash = hash_password(p_new_password),
        must_change_password = FALSE,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update admin_set_password to set must_change_password = TRUE
DROP FUNCTION IF EXISTS admin_set_password(UUID, VARCHAR);

CREATE OR REPLACE FUNCTION admin_set_password(p_user_id UUID, p_new_password VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET password_hash = hash_password(p_new_password),
        must_change_password = TRUE,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Set must_change_password = TRUE for all existing users (they have default passwords)
UPDATE users
SET must_change_password = TRUE
WHERE must_change_password IS NULL OR must_change_password = TRUE;

COMMENT ON COLUMN users.must_change_password IS 'When TRUE, user will be prompted to change their password on next login';
