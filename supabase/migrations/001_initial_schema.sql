-- ============================================
-- SENTRA Database Schema
-- Version: 1.0.0
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nip VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    auth_user_id UUID UNIQUE, -- Links to Supabase Auth
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRANSACTION TYPES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transaction_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FIELD MASTER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS field_master (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'number', 'currency', 'date', 'file', 'select', 'textarea', 'checkbox')),
    options JSONB, -- For select type: [{label, value}]
    validation_rules JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROUTING MATRIX TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS routing_matrix (
    id SERIAL PRIMARY KEY,
    transaction_type_id INTEGER REFERENCES transaction_types(id) ON DELETE CASCADE,
    stage_order INTEGER NOT NULL,
    stage_code VARCHAR(50) NOT NULL,
    stage_name VARCHAR(100) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    is_final BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(transaction_type_id, stage_order),
    UNIQUE(transaction_type_id, stage_code)
);

-- ============================================
-- FIELD ACCESS MATRIX TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS field_access_matrix (
    id SERIAL PRIMARY KEY,
    transaction_type_id INTEGER REFERENCES transaction_types(id) ON DELETE CASCADE,
    field_id INTEGER REFERENCES field_master(id) ON DELETE CASCADE,
    stage_code VARCHAR(50) NOT NULL,
    is_visible BOOLEAN DEFAULT FALSE,
    is_editable BOOLEAN DEFAULT FALSE,
    is_mandatory BOOLEAN DEFAULT FALSE,
    field_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(transaction_type_id, field_id, stage_code)
);

-- ============================================
-- STAGE STATEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stage_statements (
    id SERIAL PRIMARY KEY,
    transaction_type_id INTEGER REFERENCES transaction_types(id) ON DELETE CASCADE,
    stage_code VARCHAR(50) NOT NULL,
    statement_text TEXT NOT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_type_id INTEGER REFERENCES transaction_types(id),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    current_stage VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'REJECTED')),
    data JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    stage_started_at TIMESTAMPTZ DEFAULT NOW(),
    stage_sla_deadline TIMESTAMPTZ,
    total_sla_deadline TIMESTAMPTZ,
    sla_status VARCHAR(20) DEFAULT 'ON_TRACK' CHECK (sla_status IN ('ON_TRACK', 'WARNING', 'AT_RISK', 'BREACHED')),
    is_sla_breached BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRANSACTION HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transaction_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    stage_code VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('CREATED', 'APPROVED', 'REJECTED', 'RETURNED')),
    action_by UUID REFERENCES users(id),
    comment TEXT,
    data_snapshot JSONB,
    statements_accepted JSONB, -- Array of accepted statement IDs
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRANSACTION ATTACHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transaction_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    field_code VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SLA CONFIGURATION TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS sla_settings (
    id SERIAL PRIMARY KEY,
    working_hour_start INTEGER DEFAULT 8,
    working_hour_end INTEGER DEFAULT 17,
    working_days INTEGER[] DEFAULT '{1,2,3,4,5}',
    warning_threshold_percent INTEGER DEFAULT 75,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sla_config (
    id SERIAL PRIMARY KEY,
    transaction_type_id INTEGER UNIQUE REFERENCES transaction_types(id) ON DELETE CASCADE,
    total_sla_hours INTEGER NOT NULL,
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stage_sla_config (
    id SERIAL PRIMARY KEY,
    transaction_type_id INTEGER REFERENCES transaction_types(id) ON DELETE CASCADE,
    stage_code VARCHAR(50) NOT NULL,
    sla_hours INTEGER NOT NULL,
    warning_threshold_percent INTEGER DEFAULT 75,
    escalation_enabled BOOLEAN DEFAULT FALSE,
    escalation_to_role_id INTEGER REFERENCES roles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(transaction_type_id, stage_code)
);

CREATE TABLE IF NOT EXISTS holidays (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_nip ON users(nip);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ticket ON transactions(ticket_number);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_stage ON transactions(current_stage);
CREATE INDEX IF NOT EXISTS idx_transactions_creator ON transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_transactions_sla ON transactions(sla_status);
CREATE INDEX IF NOT EXISTS idx_transaction_history_tx ON transaction_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_type = 'BASE TABLE'
             AND table_name NOT IN ('schema_migrations')
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number(type_code VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    today_str VARCHAR;
    seq_num INTEGER;
    ticket VARCHAR;
BEGIN
    today_str := TO_CHAR(NOW(), 'YYYYMMDD');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(ticket_number FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1
    INTO seq_num
    FROM transactions
    WHERE ticket_number LIKE 'TRX-' || today_str || '-%';
    
    ticket := 'TRX-' || today_str || '-' || LPAD(seq_num::TEXT, 4, '0');
    RETURN ticket;
END;
$$ LANGUAGE plpgsql;
