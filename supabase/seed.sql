-- Seed data for development and testing
-- WARNING: This file contains test data and should NOT be run in production

-- Start transaction for atomic operations
BEGIN;

-- Create test users in auth.users if they don't exist
-- Note: In Supabase, auth.users is managed by the auth system
-- This is only for development/testing purposes
DO $
BEGIN
    -- Check if we're in a test environment (you may want to add environment checks here)
    IF NOT EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
        RAISE NOTICE 'No users found in auth.users - seed data requires existing auth users';
        RAISE NOTICE 'Please create test users through the auth system first';
        ROLLBACK;
        RETURN;
    END IF;
END $;

-- Clean up existing seed data (in case of re-running)
DELETE FROM billing_org WHERE org_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
);

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
-- Using predictable UUIDs for testing purposes only
INSERT INTO organizations (org_id, name) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Acme Manufacturing Co'),
    ('22222222-2222-2222-2222-222222222222', 'TechStart Solutions'),
    ('33333333-3333-3333-3333-333333333333', 'Global Logistics Inc')
ON CONFLICT (org_id) DO NOTHING;

-- Get some existing user IDs for testing
-- This approach is safer than hardcoding non-existent user IDs
DO $
DECLARE
    user_ids UUID[];
    test_user_1 UUID;
    test_user_2 UUID;
    test_user_3 UUID;
    test_user_4 UUID;
BEGIN
    -- Get up to 4 existing user IDs from auth.users
    SELECT ARRAY(SELECT id FROM auth.users ORDER BY created_at LIMIT 4) INTO user_ids;
    
    -- Check if we have enough users for testing
    IF array_length(user_ids, 1) < 2 THEN
        RAISE NOTICE 'Need at least 2 users in auth.users for seed data';
        RAISE NOTICE 'Current user count: %', COALESCE(array_length(user_ids, 1), 0);
        RETURN;
    END IF;
    
    -- Assign users to variables (with fallback to first user if not enough users)
    test_user_1 := user_ids[1];
    test_user_2 := COALESCE(user_ids[2], user_ids[1]);
    test_user_3 := COALESCE(user_ids[3], user_ids[1]);
    test_user_4 := COALESCE(user_ids[4], user_ids[1]);
    
    RAISE NOTICE 'Using test users: %, %, %, %', test_user_1, test_user_2, test_user_3, test_user_4;
    
    -- Insert test org members with real user IDs
    INSERT INTO org_members (org_id, user_id, role) VALUES
        ('11111111-1111-1111-1111-111111111111', test_user_1, 'admin'),
        ('11111111-1111-1111-1111-111111111111', test_user_2, 'member'),
        ('22222222-2222-2222-2222-222222222222', test_user_2, 'admin'),
        ('33333333-3333-3333-3333-333333333333', test_user_3, 'admin')
    ON CONFLICT (org_id, user_id) DO NOTHING;
    
    -- Insert test batches with real user IDs as creators
    INSERT INTO batches (batch_id, org_id, created_by, status) VALUES
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', test_user_1, 'open'),
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', test_user_2, 'synced'),
        ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', test_user_2, 'open'),
        ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', test_user_3, 'closed')
    ON CONFLICT (batch_id) DO NOTHING;
    
END $;

-- Insert test batch schemas
-- Testing different schema configurations to cover various use cases
INSERT INTO batch_schema (
    schema_id, batch_id, org_id, 
    col_1_name, col_2_name, col_3_name, col_4_name, col_5_name,
    col_6_name, col_7_name, col_8_name, col_9_name, col_10_name,
    col_11_name, col_12_name, col_13_name, col_14_name, col_15_name
) VALUES
    -- Manufacturing inventory schema (15 columns)
    (
        '11111111-aaaa-bbbb-cccc-dddddddddddd', 
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
        '11111111-1111-1111-1111-111111111111',
        'Product Name', 'SKU', 'Quantity', 'Location', 'Inspector',
        'Inspection Date', 'Quality Notes', 'Category', 'Condition', 'Batch Number',
        'Supplier', 'Cost per Unit', 'Total Value', 'Expiry Date', 'Lot Number'
    ),
    -- IT Asset management schema (10 columns)
    (
        '22222222-bbbb-cccc-dddd-eeeeeeeeeeee', 
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
        '11111111-1111-1111-1111-111111111111',
        'Asset Tag', 'Description', 'Department', 'Assigned To', 'Status',
        'Last Audit Date', 'Warranty Expiry', 'Model', 'Serial Number', 'Purchase Cost'
    ),
    -- Simple logistics schema (5 columns)
    (
        '33333333-cccc-dddd-eeee-ffffffffffff', 
        'cccccccc-cccc-cccc-cccc-cccccccccccc', 
        '22222222-2222-2222-2222-222222222222',
        'Package ID', 'Destination', 'Weight', 'Status', 'Carrier'
    )
ON CONFLICT (schema_id) DO NOTHING;

-- Insert test captures with realistic data
-- Covering different scenarios and edge cases
INSERT INTO captures_universal (
    org_id, batch_id, type, f1, f2, f3, f4, f5,
    f6, f7, f8, f9, f10, f11, f12, f13, f14, f15,
    rfid_tag, lat, lng, accuracy_m, captured_at, source_device_id
) VALUES
    -- Manufacturing data (matches first schema)
    (
        '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'data',
        'Industrial Motor v2.1', 'MOTOR-2024-001', '150', 'Warehouse A-12', 'John Smith',
        '2024-12-01', 'All units tested and certified', 'Motors', 'New', 'BATCH-2024-12-001',
        'Motors Inc', '299.99', '44998.50', '2026-12-01', 'LOT-240001',
        'E280117021003011C02002040', 40.7128, -74.0060, 2.5,
        '2024-12-01 14:30:00'::timestamptz, 'SCANNER-001'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'data',
        'Control Panel Display', 'DISPLAY-2024-045', '75', 'Warehouse A-15', 'Sarah Johnson',
        '2024-12-01', 'Minor cosmetic damage on 3 units', 'Electronics', 'Used', 'BATCH-2024-12-001',
        'TechParts Co', '125.50', '9412.50', '2025-06-01', 'LOT-240002',
        'E280117021003011C02002041', 40.7130, -74.0062, 3.1,
        '2024-12-01 14:45:00'::timestamptz, 'SCANNER-001'
    ),
    -- IT Asset data (matches second schema)
    (
        '11111111-1111-1111-1111-111111111111',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'data',
        'LAPTOP-2024-156', 'Dell Latitude 5520 Laptop', 'Engineering', 'Mike Chen', 'Active',
        '2024-11-15', '2027-03-15', 'Latitude 5520', 'DL5520-78945612', '1299.00',
        NULL, NULL, NULL, NULL, NULL,
        'E280117021003011C02002042', 40.7135, -74.0065, 1.8,
        '2024-11-15 09:15:00'::timestamptz, 'MOBILE-002'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'data',
        'MONITOR-2024-089', '27" 4K Monitor', 'Design Team', 'Lisa Park', 'Active',
        '2024-11-15', '2026-08-20', 'UltraSharp U2720Q', 'US2720-45678901', '549.99',
        NULL, NULL, NULL, NULL, NULL,
        'E280117021003011C02002043', 40.7138, -74.0068, 2.2,
        '2024-11-15 09:30:00'::timestamptz, 'MOBILE-002'
    ),
    -- Logistics data (matches third schema)
    (
        '22222222-2222-2222-2222-222222222222',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'data',
        'PKG-2024-78901', 'New York Distribution Center', '12.5', 'In Transit', 'FedEx Express',
        NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
        'E280117021003011C02002044', 40.7589, -73.9851, 5.0,
        '2024-12-01 16:22:00'::timestamptz, 'HANDHELD-003'
    );

-- Insert test billing data
INSERT INTO billing_org (org_id, stripe_customer_id, billing_status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'cus_test_manufacturing', 'active'),
    ('22222222-2222-2222-2222-222222222222', 'cus_test_techstart', 'trialing'),
    ('33333333-3333-3333-3333-333333333333', 'cus_test_logistics', 'active')
ON CONFLICT (org_id) DO NOTHING;

-- Commit the transaction
COMMIT;

-- Log successful completion
DO $
BEGIN
    RAISE NOTICE 'Seed data successfully inserted';
    RAISE NOTICE 'Organizations: %', (SELECT COUNT(*) FROM organizations WHERE org_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'));
    RAISE NOTICE 'Org members: %', (SELECT COUNT(*) FROM org_members WHERE org_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'));
    RAISE NOTICE 'Batches: %', (SELECT COUNT(*) FROM batches WHERE org_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'));
    RAISE NOTICE 'Captures: %', (SELECT COUNT(*) FROM captures_universal WHERE org_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'));
END $;