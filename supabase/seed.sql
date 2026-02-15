-- Seed data for development and testing
-- WARNING: This script is for development/testing environments only
-- Do not run in production as it uses hardcoded test data

-- Clean up existing test data to avoid conflicts
DELETE FROM captures_universal WHERE org_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222', 
    '33333333-3333-3333-3333-333333333333'
);
DELETE FROM batch_schema WHERE org_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
);
DELETE FROM batches WHERE org_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
);
DELETE FROM billing_org WHERE org_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
);
DELETE FROM org_members WHERE org_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
);
DELETE FROM organizations WHERE org_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
);

-- Insert test organizations
INSERT INTO organizations (org_id, name) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Test Organization 1'),
    ('22222222-2222-2222-2222-222222222222', 'Test Organization 2'),
    ('33333333-3333-3333-3333-333333333333', 'Demo Company')
ON CONFLICT (org_id) DO NOTHING;

-- Create test users in auth.users if they don't exist
-- Note: This requires superuser privileges and should only be used in development
DO $
BEGIN
    -- Only proceed if we're not in production (check for specific development indicator)
    IF current_setting('app.environment', true) IS DISTINCT FROM 'production' THEN
        -- Insert test users into auth.users if they don't exist
        INSERT INTO auth.users (
            id, 
            instance_id, 
            aud, 
            role, 
            email, 
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token,
            email_change_token_new
        ) VALUES
            ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin1@test.local', crypt('testpassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', ''),
            ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member1@test.local', crypt('testpassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', ''),
            ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin2@test.local', crypt('testpassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', ''),
            ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin3@test.local', crypt('testpassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '')
        ON CONFLICT (id) DO NOTHING;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Silently continue if we can't create auth users (e.g., insufficient privileges)
    -- In this case, org_members inserts will fail but won't break the entire seed
    RAISE NOTICE 'Could not create test users in auth.users. Org member creation may fail.';
END $;

-- Insert test org members (will fail gracefully if auth users don't exist)
DO $
BEGIN
    INSERT INTO org_members (org_id, user_id, role) VALUES
        ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'admin'),
        ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'member'),
        ('22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'admin'),
        ('33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', 'admin')
    ON CONFLICT (org_id, user_id) DO NOTHING;
EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'Could not create org members due to missing auth users. This is expected in environments where auth.users cannot be directly manipulated.';
END $;

-- Insert test batches
-- Covers different scenarios: open batch, synced batch, multiple orgs
INSERT INTO batches (batch_id, org_id, created_by, status) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'open'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'synced'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'open'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', 'closed')
ON CONFLICT (batch_id) DO NOTHING;

-- Insert test batch schemas
-- Schema 1: Inventory management (10 columns)
-- Schema 2: Asset tracking (10 columns) 
-- Schema 3: Full schema example (20+ columns)
INSERT INTO batch_schema (
    schema_id, batch_id, org_id, 
    col_1_name, col_2_name, col_3_name, col_4_name, col_5_name,
    col_6_name, col_7_name, col_8_name, col_9_name, col_10_name,
    col_11_name, col_12_name, col_13_name, col_14_name, col_15_name
) VALUES
    (
        '11111111-2222-3333-4444-555555555555', 
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
        '11111111-1111-1111-1111-111111111111',
        'Product Name', 'SKU', 'Quantity', 'Location', 'Inspector',
        'Date', 'Notes', 'Category', 'Condition', 'Batch Number',
        NULL, NULL, NULL, NULL, NULL
    ),
    (
        '22222222-3333-4444-5555-666666666666', 
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
        '11111111-1111-1111-1111-111111111111',
        'Asset Tag', 'Description', 'Department', 'Employee', 'Status',
        'Last Checked', 'Warranty', 'Model', 'Serial', 'Cost',
        NULL, NULL, NULL, NULL, NULL
    ),
    (
        '33333333-4444-5555-6666-777777777777',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '22222222-2222-2222-2222-222222222222',
        'Item ID', 'Name', 'Type', 'Brand', 'Model',
        'Serial Number', 'Purchase Date', 'Warranty End', 'Cost', 'Supplier',
        'Department', 'Assigned To', 'Status', 'Last Service', 'Next Service'
    ),
    (
        '44444444-5555-6666-7777-888888888888',
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '33333333-3333-3333-3333-333333333333',
        'Equipment ID', 'Equipment Name', 'Type', 'Manufacturer', 'Model',
        'Serial', 'Install Date', 'Last Calibration', 'Next Calibration', 'Technician',
        NULL, NULL, NULL, NULL, NULL
    )
ON CONFLICT (schema_id) DO NOTHING;

-- Insert test captures
-- Includes various test scenarios: different batches, organizations, data types, and locations
INSERT INTO captures_universal (
    org_id, batch_id, type, f1, f2, f3, f4, f5,
    f6, f7, f8, f9, f10, f11, f12, f13, f14, f15,
    rfid_tag, lat, lng, accuracy_m, captured_at, source_device_id
) VALUES
    -- Inventory captures for org 1, batch 1
    (
        '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'data',
        'Widget Pro 3000', 'WP3000-001', '50', 'Warehouse A', 'John Doe',
        '2024-01-15', 'All items accounted for', 'Electronics', 'New', 'B2024-001',
        NULL, NULL, NULL, NULL, NULL,
        'E200341700102023073015AB', 40.7128, -74.0060, 3.5,
        '2024-01-15 14:30:00'::timestamptz, 'DEVICE001'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'data',
        'Gadget Ultra', 'GU-2023-042', '25', 'Warehouse B', 'Jane Smith',
        '2024-01-15', 'Minor scratches noted', 'Electronics', 'Used', 'B2024-001',
        NULL, NULL, NULL, NULL, NULL,
        'E200341700102023073016CD', 40.7130, -74.0062, 2.8,
        '2024-01-15 14:35:00'::timestamptz, 'DEVICE001'
    ),
    -- Asset tracking captures for org 1, batch 2
    (
        '11111111-1111-1111-1111-111111111111',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'data',
        'COMP-2024-001', 'Dell Workstation', 'IT Department', 'Alice Johnson', 'Active',
        '2024-01-10', '2026-12-31', 'OptiPlex 7090', 'DL7090-ABC123', '$1200',
        NULL, NULL, NULL, NULL, NULL,
        'E200341700102023073017EF', 40.7135, -74.0065, 4.2,
        '2024-01-10 09:15:00'::timestamptz, 'DEVICE002'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'data',
        'LAPTOP-2024-003', 'MacBook Pro 14"', 'Marketing', 'Bob Wilson', 'Active',
        '2024-01-12', '2027-01-12', 'MacBook Pro', 'MBP14-XYZ789', '$2400',
        NULL, NULL, NULL, NULL, NULL,
        'E200341700102023073018GH', 40.7140, -74.0068, 3.1,
        '2024-01-12 11:20:00'::timestamptz, 'DEVICE002'
    ),
    -- Comprehensive captures for org 2, batch 3
    (
        '22222222-2222-2222-2222-222222222222',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'data',
        'ITM-001', 'Industrial Printer', 'Equipment', 'HP', 'LaserJet Pro 4301fdw',
        'HP4301-ABC123', '2023-06-15', '2026-06-15', '$450', 'Office Supply Co',
        'Operations', 'Sarah Connor', 'Active', '2024-01-01', '2024-07-01',
        'E200341700102023073019IJ', 40.7200, -74.0100, 2.5,
        '2024-01-20 13:45:00'::timestamptz, 'DEVICE003'
    ),
    -- Equipment captures for org 3, batch 4  
    (
        '33333333-3333-3333-3333-333333333333',
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'data',
        'EQ-2024-001', 'Digital Multimeter', 'Test Equipment', 'Fluke', '87V',
        'FL87V-DEF456', '2023-12-01', '2024-06-01', '2024-12-01', 'Mike Johnson',
        NULL, NULL, NULL, NULL, NULL,
        'E200341700102023073020KL', 40.7300, -74.0200, 4.0,
        '2024-01-25 16:30:00'::timestamptz, 'DEVICE004'
    );

-- Insert test billing data
-- Covers different billing scenarios: trialing, active, past_due
INSERT INTO billing_org (org_id, stripe_customer_id, stripe_subscription_id, billing_status, updated_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 'cus_test123456789', 'sub_test123456789', 'trialing', NOW()),
    ('22222222-2222-2222-2222-222222222222', 'cus_test987654321', 'sub_test987654321', 'active', NOW()),
    ('33333333-3333-3333-3333-333333333333', 'cus_test456789123', 'sub_test456789123', 'past_due', NOW())
ON CONFLICT (org_id) DO UPDATE SET
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    billing_status = EXCLUDED.billing_status,
    updated_at = EXCLUDED.updated_at;

-- Summary of seeded data:
-- Organizations: 3 test orgs with different billing statuses
-- Users: 4 test users (1 admin + 1 member for org1, 1 admin each for org2 & org3)  
-- Batches: 4 batches across 3 orgs with different statuses (open, synced, closed)
-- Schemas: 4 different schema configurations (10-15 columns each)
-- Captures: 6 sample captures with realistic test data
-- Billing: 3 billing configurations covering main scenarios

-- Test scenario coverage:
-- ✓ Multi-organization setup
-- ✓ Different user roles (admin/member)
-- ✓ Various batch statuses
-- ✓ Different schema configurations
-- ✓ Location data with GPS coordinates
-- ✓ RFID tag associations
-- ✓ Multiple device sources
-- ✓ Billing status variations
-- ✓ Time-series data (different capture timestamps)