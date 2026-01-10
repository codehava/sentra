-- ============================================
-- Migration: User Branch Assignment
-- ============================================

-- 1. Create user_branches mapping table
CREATE TABLE IF NOT EXISTS user_branches (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    branch_code VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, branch_code)
);

-- 2. Add branch_code to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS branch_code VARCHAR(20);

-- 3. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_branches_user ON user_branches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_branch ON user_branches(branch_code);
CREATE INDEX IF NOT EXISTS idx_transactions_branch ON transactions(branch_code);

-- 4. Seed some demo data for testing
-- Assign admin to all branches
INSERT INTO user_branches (user_id, branch_code)
SELECT '00000000-0000-0000-0000-000000000001', code FROM branches
ON CONFLICT DO NOTHING;

-- Assign maker to first 2 branches
INSERT INTO user_branches (user_id, branch_code)
SELECT '00000000-0000-0000-0000-000000000002', code FROM branches LIMIT 2
ON CONFLICT DO NOTHING;

-- Assign approver to first 2 branches
INSERT INTO user_branches (user_id, branch_code)
SELECT '00000000-0000-0000-0000-000000000003', code FROM branches LIMIT 2
ON CONFLICT DO NOTHING;
