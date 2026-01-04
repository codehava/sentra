-- ============================================
-- SENTRA Seed Data
-- ============================================

-- ============================================
-- ROLES
-- ============================================
INSERT INTO roles (code, name, description) VALUES
('ADMIN', 'Administrator', 'Full access to all features and configuration'),
('MAKER', 'Maker', 'Can create new transactions'),
('APPROVER', 'Approver', 'First level approval'),
('VALIDATOR', 'Validator', 'Document validation'),
('USER1', 'User 1', 'Entry CMS'),
('USER2', 'User 2', 'Review CMS'),
('USER3', 'User 3', 'Release/Tanggal Rilis'),
('USER4', 'User 4', 'Jurnal FMS')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- TRANSACTION TYPES (9 types)
-- ============================================
INSERT INTO transaction_types (code, name, icon, description) VALUES
('BU', 'Beban Usaha', 'wallet', 'Pembayaran beban usaha operasional'),
('KKS', 'Klaim KURBPD & Swasta', 'file-text', 'Klaim asuransi KURBPD dan Swasta'),
('KNA', 'Klaim Non Asum', 'file-minus', 'Klaim non asuransi'),
('SPM', 'Share Premi ke Member', 'share', 'Pembagian premi ke member'),
('KA', 'Komisi Agen', 'user', 'Pembayaran komisi agen'),
('KB', 'Komisi Broker', 'building', 'Pembayaran komisi broker'),
('CFB', 'Collection Fee BPD', 'landmark', 'Collection fee dari BPD'),
('RRP', 'Restitusi & Refund Premi', 'refresh-cw', 'Restitusi dan refund premi'),
('EF', 'Engineering Fee', 'settings', 'Engineering fee')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- FIELD MASTER (Core fields)
-- ============================================
INSERT INTO field_master (code, name, type, options) VALUES
('nomor_dokumen', 'Nomor Dokumen', 'text', NULL),
('jenis_beban_usaha', 'Jenis Beban Usaha', 'select', '[{"label":"Operasional","value":"operasional"},{"label":"Non-Operasional","value":"non_operasional"},{"label":"Investasi","value":"investasi"}]'),
('perihal', 'Perihal', 'textarea', NULL),
('jumlah_pembayaran', 'Jumlah Pembayaran', 'currency', NULL),
('terbilang', 'Terbilang', 'text', NULL),
('nama_rekening', 'Nama Rekening', 'text', NULL),
('nomor_rekening', 'Nomor Rekening', 'text', NULL),
('bank_rekening', 'Bank Rekening', 'select', '[{"label":"BCA","value":"bca"},{"label":"BRI","value":"bri"},{"label":"BNI","value":"bni"},{"label":"Mandiri","value":"mandiri"},{"label":"Bank Lainnya","value":"other"}]'),
('mata_anggaran', 'Mata Anggaran', 'text', NULL),
('deskripsi', 'Deskripsi', 'textarea', NULL),
('tanggal_dokumen', 'Tanggal Dokumen', 'date', NULL),
('dokumen', 'Dokumen', 'file', NULL),
('nama_polis', 'Nama Polis', 'text', NULL),
('nomor_polis', 'Nomor Polis', 'text', NULL),
('nama_tertanggung', 'Nama Tertanggung', 'text', NULL),
('nomor_klaim', 'Nomor Klaim', 'text', NULL),
('tanggal_kejadian', 'Tanggal Kejadian', 'date', NULL),
('nilai_klaim', 'Nilai Klaim', 'currency', NULL),
('catatan_approver', 'Catatan Approver', 'textarea', NULL),
('catatan_validator', 'Catatan Validator', 'textarea', NULL),
('tanggal_entry_cms', 'Tanggal Entry CMS', 'date', NULL),
('nomor_voucher_cms', 'Nomor Voucher CMS', 'text', NULL),
('tanggal_review_cms', 'Tanggal Review CMS', 'date', NULL),
('tanggal_rilis', 'Tanggal Rilis', 'date', NULL),
('nomor_jurnal_fms', 'Nomor Jurnal FMS', 'text', NULL),
('tanggal_jurnal_fms', 'Tanggal Jurnal FMS', 'date', NULL),
('pernyataan_maker', 'Pernyataan Maker', 'checkbox', NULL),
('pernyataan_approver', 'Pernyataan Approver', 'checkbox', NULL)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- ROUTING MATRIX - Beban Usaha (3 stages)
-- ============================================
INSERT INTO routing_matrix (transaction_type_id, stage_order, stage_code, stage_name, role_id, is_final)
SELECT 
    (SELECT id FROM transaction_types WHERE code = 'BU'),
    s.stage_order,
    s.stage_code,
    s.stage_name,
    (SELECT id FROM roles WHERE code = s.role_code),
    s.is_final
FROM (VALUES
    (1, 'MAKER', 'Maker', 'MAKER', false),
    (2, 'APPROVER', 'Approver', 'APPROVER', false),
    (3, 'USER1', 'Entry & Release', 'USER1', true)
) AS s(stage_order, stage_code, stage_name, role_code, is_final)
ON CONFLICT DO NOTHING;

-- ============================================
-- ROUTING MATRIX - Klaim KURBPD (7 stages)
-- ============================================
INSERT INTO routing_matrix (transaction_type_id, stage_order, stage_code, stage_name, role_id, is_final)
SELECT 
    (SELECT id FROM transaction_types WHERE code = 'KKS'),
    s.stage_order,
    s.stage_code,
    s.stage_name,
    (SELECT id FROM roles WHERE code = s.role_code),
    s.is_final
FROM (VALUES
    (1, 'MAKER', 'Maker', 'MAKER', false),
    (2, 'APPROVER', 'Approver', 'APPROVER', false),
    (3, 'VALIDATOR', 'Validator', 'VALIDATOR', false),
    (4, 'USER1', 'Entry CMS', 'USER1', false),
    (5, 'USER2', 'Review CMS', 'USER2', false),
    (6, 'USER3', 'Tanggal Rilis', 'USER3', false),
    (7, 'USER4', 'Jurnal FMS', 'USER4', true)
) AS s(stage_order, stage_code, stage_name, role_code, is_final)
ON CONFLICT DO NOTHING;

-- ============================================
-- SLA SETTINGS (Global)
-- ============================================
INSERT INTO sla_settings (working_hour_start, working_hour_end, working_days, warning_threshold_percent)
VALUES (8, 17, '{1,2,3,4,5}', 75)
ON CONFLICT DO NOTHING;

-- ============================================
-- SLA CONFIG per Transaction Type
-- ============================================
INSERT INTO sla_config (transaction_type_id, total_sla_hours, priority)
SELECT t.id, s.sla_hours, s.priority
FROM transaction_types t
JOIN (VALUES
    ('BU', 27, 'NORMAL'),   -- 3 days
    ('KKS', 63, 'HIGH'),    -- 7 days
    ('KNA', 63, 'HIGH'),    -- 7 days
    ('SPM', 45, 'NORMAL'),  -- 5 days
    ('KA', 54, 'NORMAL'),   -- 6 days
    ('KB', 54, 'NORMAL'),   -- 6 days
    ('CFB', 54, 'NORMAL'),  -- 6 days
    ('RRP', 63, 'HIGH'),    -- 7 days
    ('EF', 45, 'NORMAL')    -- 5 days
) AS s(code, sla_hours, priority) ON t.code = s.code
ON CONFLICT (transaction_type_id) DO NOTHING;

-- ============================================
-- STAGE SLA CONFIG for Beban Usaha
-- ============================================
INSERT INTO stage_sla_config (transaction_type_id, stage_code, sla_hours, warning_threshold_percent)
SELECT 
    (SELECT id FROM transaction_types WHERE code = 'BU'),
    s.stage_code,
    s.sla_hours,
    75
FROM (VALUES
    ('APPROVER', 16),
    ('USER1', 8)
) AS s(stage_code, sla_hours)
ON CONFLICT DO NOTHING;

-- ============================================
-- STAGE STATEMENTS
-- ============================================
INSERT INTO stage_statements (transaction_type_id, stage_code, statement_text, is_mandatory, display_order)
SELECT 
    (SELECT id FROM transaction_types WHERE code = 'BU'),
    s.stage_code,
    s.statement_text,
    true,
    s.display_order
FROM (VALUES
    ('MAKER', 'Saya menyatakan bahwa data yang diinput dan dokumen yang dilampirkan adalah benar, asli, valid dan dapat dipertanggungjawabkan', 1),
    ('MAKER', 'Saya menyatakan tidak melakukan pengajuan data dokumen secara dobel/ganda', 2),
    ('MAKER', 'Jika ditemukan adanya ketidaksesuaian atau pemalsuan, saya bersedia menerima sanksi sesuai ketentuan yang berlaku', 3),
    ('APPROVER', 'Saya telah memeriksa kelengkapan dan kebenaran dokumen', 1),
    ('APPROVER', 'Saya menyetujui transaksi ini untuk diproses lebih lanjut', 2)
) AS s(stage_code, statement_text, display_order)
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE USERS (for testing)
-- UUIDs must match the mock users in login-page.tsx
-- ============================================
INSERT INTO users (id, nip, full_name, email, role_id, is_active)
SELECT 
    u.id::UUID,
    u.nip,
    u.full_name,
    u.email,
    (SELECT id FROM roles WHERE code = u.role_code),
    true
FROM (VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin', 'Administrator', 'admin@sentra.id', 'ADMIN'),
    ('00000000-0000-0000-0000-000000000002', 'maker', 'Budi Maker', 'maker@sentra.id', 'MAKER'),
    ('00000000-0000-0000-0000-000000000003', 'approver', 'Dewi Approver', 'approver@sentra.id', 'APPROVER'),
    ('00000000-0000-0000-0000-000000000004', 'validator', 'Ahmad Validator', 'validator@sentra.id', 'VALIDATOR'),
    ('00000000-0000-0000-0000-000000000005', 'user1', 'Citra User1', 'user1@sentra.id', 'USER1'),
    ('00000000-0000-0000-0000-000000000006', 'user2', 'Eko User2', 'user2@sentra.id', 'USER2'),
    ('00000000-0000-0000-0000-000000000007', 'user3', 'Fitri User3', 'user3@sentra.id', 'USER3'),
    ('00000000-0000-0000-0000-000000000008', 'user4', 'Gunawan User4', 'user4@sentra.id', 'USER4')
) AS u(id, nip, full_name, email, role_code)
ON CONFLICT (nip) DO UPDATE SET id = EXCLUDED.id;
