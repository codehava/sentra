-- ============================================
-- Migration: User Password Management
-- Adds password_hash column for custom authentication
-- ============================================

-- 1. Add password_hash column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 2. Create extension for password hashing (pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Create function to hash password
CREATE OR REPLACE FUNCTION hash_password(plain_password VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
    RETURN crypt(plain_password, gen_salt('bf', 8));
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to verify password
CREATE OR REPLACE FUNCTION verify_password(plain_password VARCHAR, hashed_password VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    IF hashed_password IS NULL OR hashed_password = '' THEN
        RETURN FALSE;
    END IF;
    RETURN hashed_password = crypt(plain_password, hashed_password);
END;
$$ LANGUAGE plpgsql;

-- 5. Create login function that accepts NIP and password
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
        (u.password_hash IS NULL OR u.password_hash = '') AS password_needs_change
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE u.nip = p_nip 
      AND u.is_active = TRUE
      AND verify_password(p_password, u.password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to change password
CREATE OR REPLACE FUNCTION change_user_password(p_user_id UUID, p_new_password VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET password_hash = hash_password(p_new_password),
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function for admin to set/reset user password
CREATE OR REPLACE FUNCTION admin_set_password(p_user_id UUID, p_new_password VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET password_hash = hash_password(p_new_password),
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Set default passwords for existing users (format: Sentra@{NIP})
-- This updates users that don't have a password yet
UPDATE users
SET password_hash = hash_password('Sentra@' || nip)
WHERE password_hash IS NULL;

COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password for custom authentication. Default password format: Sentra@{NIP}';
