-- ============================================
-- Migration: Unique Field Validation & Ticket Number Prefix
-- ============================================

-- 1. Add is_unique column to field_master for unique field validation
ALTER TABLE field_master
ADD COLUMN IF NOT EXISTS is_unique BOOLEAN DEFAULT FALSE;

-- 2. Create a table to track unique field values across transactions
CREATE TABLE IF NOT EXISTS unique_field_values (
    id SERIAL PRIMARY KEY,
    field_code VARCHAR(50) NOT NULL,
    field_value VARCHAR(500) NOT NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    transaction_type_id INTEGER REFERENCES transaction_types(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(field_code, field_value, transaction_type_id)
);

CREATE INDEX IF NOT EXISTS idx_unique_field_values_lookup 
ON unique_field_values(field_code, field_value, transaction_type_id);

-- 3. Drop and recreate generate_ticket_number function (parameter name changed from type_code to p_type_code)
DROP FUNCTION IF EXISTS generate_ticket_number(VARCHAR);

CREATE OR REPLACE FUNCTION generate_ticket_number(p_type_code VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    today_str VARCHAR;
    seq_num INTEGER;
    ticket VARCHAR;
    prefix VARCHAR;
BEGIN
    today_str := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Use transaction type code as prefix, fallback to 'TRX' if not provided
    IF p_type_code IS NOT NULL AND p_type_code != '' THEN
        prefix := p_type_code;
    ELSE
        prefix := 'TRX';
    END IF;
    
    -- Get next sequence number for this prefix and date
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(ticket_number FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1
    INTO seq_num
    FROM transactions
    WHERE ticket_number LIKE prefix || '-' || today_str || '-%';
    
    ticket := prefix || '-' || today_str || '-' || LPAD(seq_num::TEXT, 4, '0');
    RETURN ticket;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to check unique field value before insert
CREATE OR REPLACE FUNCTION check_unique_field_value(
    p_field_code VARCHAR,
    p_field_value VARCHAR,
    p_transaction_type_id INTEGER,
    p_exclude_transaction_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    existing_count INTEGER;
BEGIN
    -- Check if field is marked as unique
    IF NOT EXISTS (
        SELECT 1 FROM field_master 
        WHERE code = p_field_code AND is_unique = TRUE
    ) THEN
        -- Field is not unique, allow any value
        RETURN TRUE;
    END IF;
    
    -- Check for existing value
    SELECT COUNT(*)
    INTO existing_count
    FROM unique_field_values
    WHERE field_code = p_field_code
      AND field_value = p_field_value
      AND transaction_type_id = p_transaction_type_id
      AND (p_exclude_transaction_id IS NULL OR transaction_id != p_exclude_transaction_id);
    
    RETURN existing_count = 0;
END;
$$ LANGUAGE plpgsql;

-- 5. Update the Nomor CL field to be unique (if it exists)
UPDATE field_master
SET is_unique = TRUE
WHERE code = 'NOMOR_CL' OR code = 'nomor_cl' OR code = 'nomorCL';

COMMENT ON COLUMN field_master.is_unique IS 'When TRUE, the field value must be unique across all transactions of the same type to prevent duplicate entries (e.g., double payment prevention)';
