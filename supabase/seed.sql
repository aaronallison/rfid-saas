-- Seed data for development and testing
-- 
-- PREREQUISITES:
-- 1. All migrations must be applied before running this seed script
-- 2. For production environments, replace test user IDs with actual auth.users IDs
-- 3. Consider creating test users in auth.users table before running org_members inserts
-- 
-- USAGE:
-- psql -d your_database -f supabase/seed.sql

-- Insert test organizations
INSERT INTO organizations (org_id, name) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Test Organization 1'),
    ('22222222-2222-2222-2222-222222222222', 'Test Organization 2'),
    ('33333333-3333-3333-3333-333333333333', 'Demo Company')
ON CONFLICT (org_id) DO NOTHING;

-- WARNING: The following user IDs are test placeholders
-- In production, these must be replaced with actual user IDs from auth.users
-- Consider creating test users first:
-- 
-- Example SQL to create test users (run in Supabase Auth):
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
-- VALUES 
--   ('44444444-4444-4444-4444-444444444444', 'admin1@test.com', '$2a$10$...', now(), now(), now()),
--   ('55555555-5555-5555-5555-555555555555', 'member1@test.com', '$2a$10$...', now(), now(), now()),
--   ('66666666-6666-6666-6666-666666666666', 'admin2@test.com', '$2a$10$...', now(), now(), now()),
--   ('77777777-7777-7777-7777-777777777777', 'admin3@test.com', '$2a$10$...', now(), now(), now());

-- Insert test org members (requires users to exist in auth.users)
-- This will fail if the user IDs don't exist - comment out if needed for initial setup
INSERT INTO org_members (org_id, user_id, role) VALUES
    ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'admin'),
    ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'member'),
    ('22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'admin'),
    ('33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', 'admin')
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Insert test batches
INSERT INTO batches (batch_id, org_id, created_by, status) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'open'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'synced'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'open'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', 'closed')
ON CONFLICT (batch_id) DO NOTHING;

-- Insert test batch schemas
INSERT INTO batch_schema (
    schema_id, batch_id, org_id, 
    col_1_name, col_2_name, col_3_name, col_4_name, col_5_name,
    col_6_name, col_7_name, col_8_name, col_9_name, col_10_name,
    col_11_name, col_12_name, col_13_name, col_14_name, col_15_name
) VALUES
    (
        'eeee1111-eeee-eeee-eeee-eeeeeeeeeeee', 
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
        '11111111-1111-1111-1111-111111111111',
        'Product Name', 'SKU', 'Quantity', 'Location', 'Inspector',
        'Date', 'Notes', 'Category', 'Condition', 'Batch Number',
        'Supplier', 'Unit Price', 'Total Value', 'Expiry Date', 'Certification'
    ),
    (
        'eeee2222-eeee-eeee-eeee-eeeeeeeeeeee', 
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
        '11111111-1111-1111-1111-111111111111',
        'Asset Tag', 'Description', 'Department', 'Employee', 'Status',
        'Last Checked', 'Warranty', 'Model', 'Serial', 'Cost',
        'Purchase Date', 'Vendor', 'Location', 'Maintenance Due', 'Insurance'
    ),
    (
        'eeee3333-eeee-eeee-eeee-eeeeeeeeeeee', 
        'cccccccc-cccc-cccc-cccc-cccccccccccc', 
        '22222222-2222-2222-2222-222222222222',
        'Item ID', 'Name', 'Type', 'Owner', 'Priority',
        'Created', 'Updated', 'Tags', 'Project', 'Phase',
        'Budget', 'Hours', 'Progress', 'Dependencies', 'Risk Level'
    ),
    (
        'eeee4444-eeee-eeee-eeee-eeeeeeeeeeee', 
        'dddddddd-dddd-dddd-dddd-dddddddddddd', 
        '33333333-3333-3333-3333-333333333333',
        'Document ID', 'Title', 'Author', 'Version', 'Status',
        'Created Date', 'Modified Date', 'File Size', 'Format', 'Category',
        'Access Level', 'Archive Date', 'Retention', 'Approval', 'Comments'
    )
ON CONFLICT (schema_id) DO NOTHING;

-- Insert test captures
INSERT INTO captures_universal (
    org_id, batch_id, type, f1, f2, f3, f4, f5,
    f6, f7, f8, f9, f10, f11, f12, f13, f14, f15,
    rfid_tag, lat, lng, accuracy_m, captured_at, source_device_id
) VALUES
    -- Product inventory captures for batch 1
    (
        '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'data',
        'Widget Pro 3000', 'WP3000-001', '50', 'Warehouse A', 'John Doe',
        '2024-01-15', 'All items accounted for', 'Electronics', 'New', 'B2024-001',
        'ACME Corp', '$29.99', '$1499.50', '2026-12-31', 'CE Certified',
        'E200341700102023073015AB', 40.7128, -74.0060, 3.5,
        '2024-01-15 14:30:00'::timestamptz, 'DEVICE001'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'data',
        'Gadget Ultra', 'GU-2023-042', '25', 'Warehouse B', 'Jane Smith',
        '2024-01-15', 'Minor scratches noted', 'Electronics', 'Used', 'B2024-001',
        'TechSupply Inc', '$45.00', '$1125.00', '2025-06-30', 'FCC Approved',
        'E200341700102023073016CD', 40.7130, -74.0062, 2.8,
        '2024-01-15 14:35:00'::timestamptz, 'DEVICE001'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'data',
        'Smart Display', 'SD-2024-100', '10', 'Warehouse C', 'Bob Wilson',
        '2024-01-15', 'Perfect condition', 'Electronics', 'New', 'B2024-001',
        'DisplayTech', '$199.99', '$1999.90', '2027-03-15', 'Energy Star',
        'E200341700102023073018GH', 40.7132, -74.0064, 2.1,
        '2024-01-15 14:40:00'::timestamptz, 'DEVICE001'
    ),
    -- Asset tracking captures for batch 2
    (
        '11111111-1111-1111-1111-111111111111',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'data',
        'COMP-2024-001', 'Dell Workstation', 'IT Department', 'Alice Johnson', 'Active',
        '2024-01-10', '2026-12-31', 'OptiPlex 7090', 'DL7090-ABC123', '$1200',
        '2023-06-01', 'Dell Technologies', 'Floor 3 - Desk 42', '2024-12-01', 'Policy #INS789',
        'E200341700102023073017EF', 40.7135, -74.0065, 4.2,
        '2024-01-10 09:15:00'::timestamptz, 'DEVICE002'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'data',
        'MON-2024-001', 'Samsung Monitor', 'Design Department', 'Carol Davis', 'Active',
        '2024-01-10', '2025-08-15', '27" QLED', 'SAM27Q-XYZ789', '$450',
        '2023-08-15', 'Samsung Electronics', 'Floor 2 - Station 15', '2024-08-15', 'Policy #INS790',
        'E200341700102023073019IJ', 40.7137, -74.0063, 3.8,
        '2024-01-10 09:20:00'::timestamptz, 'DEVICE002'
    ),
    -- Project management captures for batch 3
    (
        '22222222-2222-2222-2222-222222222222',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'data',
        'PROJ-001', 'Website Redesign', 'Development', 'Mike Brown', 'High',
        '2024-01-05', '2024-01-20', 'frontend,ux,responsive', 'Customer Portal', 'Phase 2',
        '$15000', '120', '75%', 'PROJ-002,PROJ-003', 'Medium',
        'E200341700102023073020KL', 40.7140, -74.0070, 5.0,
        '2024-01-20 16:45:00'::timestamptz, 'DEVICE003'
    ),
    -- Document management captures for batch 4 (closed status)
    (
        '33333333-3333-3333-3333-333333333333',
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'data',
        'DOC-2024-001', 'Annual Report 2023', 'Finance Team', '1.2', 'Approved',
        '2024-01-01', '2024-01-15', '2.5MB', 'PDF', 'Financial',
        'Confidential', '2031-01-01', '7 years', 'CFO Approved', 'Final version ready',
        'E200341700102023073021MN', 40.7142, -74.0068, 1.9,
        '2024-01-15 11:30:00'::timestamptz, 'DEVICE004'
    ),
    -- Edge case: Capture with minimal data
    (
        '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'data',
        'Unknown Item', NULL, NULL, 'Storage Room', NULL,
        NULL, 'Needs investigation', NULL, NULL, NULL,
        NULL, NULL, NULL, NULL, NULL,
        'E200341700102023073022OP', NULL, NULL, NULL,
        '2024-01-16 08:00:00'::timestamptz, 'DEVICE001'
    )
ON CONFLICT DO NOTHING;

-- Insert test billing data
INSERT INTO billing_org (org_id, stripe_customer_id, billing_status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'cus_test123456789', 'trialing'),
    ('22222222-2222-2222-2222-222222222222', 'cus_test987654321', 'active'),
    ('33333333-3333-3333-3333-333333333333', 'cus_test456789123', 'past_due')
ON CONFLICT (org_id) DO UPDATE SET
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    billing_status = EXCLUDED.billing_status,
    updated_at = NOW();

-- Update statistics for development insights
DO $
BEGIN
    RAISE NOTICE 'Seed data inserted successfully!';
    RAISE NOTICE 'Organizations: %', (SELECT COUNT(*) FROM organizations);
    RAISE NOTICE 'Org Members: %', (SELECT COUNT(*) FROM org_members);
    RAISE NOTICE 'Batches: %', (SELECT COUNT(*) FROM batches);
    RAISE NOTICE 'Batch Schemas: %', (SELECT COUNT(*) FROM batch_schema);
    RAISE NOTICE 'Captures: %', (SELECT COUNT(*) FROM captures_universal);
    RAISE NOTICE 'Billing Records: %', (SELECT COUNT(*) FROM billing_org);
END $;