-- Migration: Add system fields support

-- 1. Add is_system column to field_master
ALTER TABLE field_master
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- 2. Add source_table column for dynamic options (branches, roles, etc)
ALTER TABLE field_master
ADD COLUMN IF NOT EXISTS source_table VARCHAR(50);

-- 3. Add description column if not exists
ALTER TABLE field_master
ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Seed default branches
INSERT INTO branches (code, name, city) VALUES
('HO', 'Head Office', 'Jakarta'),
('JKT01', 'Jakarta Pusat', 'Jakarta'),
('JKT02', 'Jakarta Selatan', 'Jakarta'),
('BDG01', 'Bandung', 'Bandung'),
('SBY01', 'Surabaya', 'Surabaya')
ON CONFLICT (code) DO NOTHING;

-- 6. Add system fields to field_master
INSERT INTO field_master (code, name, type, is_system, source_table, is_active) VALUES
('kantor_cabang', 'Kantor Cabang', 'select', true, 'branches', true),
('role', 'Role', 'select', true, 'roles', true),
('transaction_type', 'Jenis Transaksi', 'select', true, 'transaction_types', true)
ON CONFLICT (code) DO UPDATE SET 
  is_system = true,
  source_table = EXCLUDED.source_table;

-- 7. Create stage_definitions table
CREATE TABLE IF NOT EXISTS stage_definitions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sequence INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Seed default stage definitions
INSERT INTO stage_definitions (code, name, sequence) VALUES
('MAKER', 'Maker/Creator', 1),
('CHECKER', 'Checker', 2),
('VALIDATOR', 'Validator', 3),
('APPROVER', 'Approver', 4),
('USER1', 'User 1', 5),
('USER2', 'User 2', 6),
('FINANCE', 'Finance', 7),
('DIRECTOR', 'Director', 8)
ON CONFLICT (code) DO NOTHING;

-- 9. Add return_to_stage to routing_matrix
ALTER TABLE routing_matrix 
ADD COLUMN IF NOT EXISTS return_to_stage VARCHAR(50);

-- 10. Update return_to_stage for existing routing
UPDATE routing_matrix 
SET return_to_stage = 'MAKER' 
WHERE return_to_stage IS NULL;

-- 11. Create statements table for configurable statements
CREATE TABLE IF NOT EXISTS statements (
  id SERIAL PRIMARY KEY,
  transaction_type_id INT REFERENCES transaction_types(id),
  stage_code VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  sequence INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(is_active);
CREATE INDEX IF NOT EXISTS idx_stage_definitions_active ON stage_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_field_master_system ON field_master(is_system);
