-- Seed data for development and testing
-- 
-- IMPORTANT: This seed file is intended for development/testing environments only.
-- Do not use in production as it contains hardcoded UUIDs and test data.
--
-- Prerequisites:
-- 1. Ensure all migrations have been applied
-- 2. Create test users in auth.users first, or modify user_ids below
-- 3. Run this in a transaction to ensure data consistency

BEGIN;

-- Insert test organizations
-- These organizations represent different customer types for testing
INSERT INTO organizations (org_id, name, created_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Acme Manufacturing Corp', '2024-01-01 10:00:00'::timestamptz),
    ('22222222-2222-2222-2222-222222222222', 'TechStart Solutions', '2024-01-02 10:00:00'::timestamptz),
    ('33333333-3333-3333-3333-333333333333', 'Global Logistics Ltd', '2024-01-03 10:00:00'::timestamptz)
ON CONFLICT (org_id) DO NOTHING;

-- Insert test org members
-- WARNING: These user IDs must exist in auth.users table
-- In development, create these users through your auth provider first
-- or replace with actual user IDs from your auth.users table
-- 
-- For safety, we'll use INSERT ... ON CONFLICT DO NOTHING to avoid failures
-- if the referenced users don't exist yet
DO $
BEGIN
    -- Only insert if we can verify the users exist (in case this is run against a real auth setup)
    -- Otherwise, skip org_members to avoid foreign key violations
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users' AND schemaname = 'auth') THEN
        INSERT INTO org_members (org_id, user_id, role, created_at) 
        SELECT * FROM (VALUES
            ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'admin', '2024-01-01 10:05:00'::timestamptz),
            ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'member', '2024-01-01 10:10:00'::timestamptz),
            ('22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'admin', '2024-01-02 10:05:00'::timestamptz),
            ('33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', 'admin', '2024-01-03 10:05:00'::timestamptz)
        ) AS t(org_id, user_id, role, created_at)
        WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = t.user_id)
        ON CONFLICT (org_id, user_id) DO NOTHING;
    ELSE
        RAISE NOTICE 'Skipping org_members insert - auth.users table not accessible or users do not exist';
        RAISE NOTICE 'Create users with IDs: 44444444-4444-4444-4444-444444444444, 55555555-5555-5555-5555-555555555555, 66666666-6666-6666-6666-666666666666, 77777777-7777-7777-7777-777777777777';
    END IF;
END $;

-- Insert test batches
-- These represent different batch states and use cases
INSERT INTO batches (batch_id, org_id, created_by, status, created_at) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'open', '2024-01-15 08:00:00'::timestamptz),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'synced', '2024-01-10 09:00:00'::timestamptz),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'open', '2024-01-20 10:00:00'::timestamptz)
ON CONFLICT (batch_id) DO NOTHING;

-- Insert test batch schemas
-- Schema for batch 1: Inventory management use case
INSERT INTO batch_schema (
    schema_id, batch_id, org_id, 
    col_1_name, col_2_name, col_3_name, col_4_name, col_5_name,
    col_6_name, col_7_name, col_8_name, col_9_name, col_10_name,
    created_at
) VALUES
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd', 
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
        '11111111-1111-1111-1111-111111111111',
        'Product Name', 'SKU', 'Quantity', 'Location', 'Inspector',
        'Date Checked', 'Notes', 'Category', 'Condition', 'Batch Number',
        '2024-01-15 08:05:00'::timestamptz
    )
ON CONFLICT (schema_id) DO NOTHING;

-- Schema for batch 2: Asset tracking use case  
INSERT INTO batch_schema (
    schema_id, batch_id, org_id,
    col_1_name, col_2_name, col_3_name, col_4_name, col_5_name,
    col_6_name, col_7_name, col_8_name, col_9_name, col_10_name,
    created_at
) VALUES
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
        '11111111-1111-1111-1111-111111111111',
        'Asset Tag', 'Description', 'Department', 'Employee', 'Status',
        'Last Checked', 'Warranty Expiry', 'Model', 'Serial Number', 'Purchase Cost',
        '2024-01-10 09:05:00'::timestamptz
    )
ON CONFLICT (schema_id) DO NOTHING;

-- Insert test captures
-- Captures for Inventory Management batch (open status)
INSERT INTO captures_universal (
    org_id, batch_id, type, f1, f2, f3, f4, f5,
    f6, f7, f8, f9, f10, rfid_tag, lat, lng, accuracy_m,
    captured_at, source_device_id
) VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'data',
        'Widget Pro 3000', 'WP3000-001', '50', 'Warehouse A-1', 'John Doe',
        '2024-01-15', 'All items accounted for', 'Electronics', 'New', 'B2024-001',
        'E200341700102023073015AB', 40.7128, -74.0060, 3.5,
        '2024-01-15 14:30:00'::timestamptz, 'RFID-READER-001'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'data',
        'Gadget Ultra', 'GU-2023-042', '25', 'Warehouse B-2', 'Jane Smith',
        '2024-01-15', 'Minor scratches noted', 'Electronics', 'Used', 'B2024-001',
        'E200341700102023073016CD', 40.7130, -74.0062, 2.8,
        '2024-01-15 14:35:00'::timestamptz, 'RFID-READER-001'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'data',
        'Smart Sensor v2', 'SS-V2-078', '15', 'Warehouse C-3', 'Mike Wilson',
        '2024-01-15', 'Ready for deployment', 'IoT Devices', 'New', 'B2024-001',
        'E200341700102023073018GH', 40.7132, -74.0058, 2.1,
        '2024-01-15 14:40:00'::timestamptz, 'RFID-READER-001'
    );

-- Captures for Asset Tracking batch (synced status)
INSERT INTO captures_universal (
    org_id, batch_id, type, f1, f2, f3, f4, f5,
    f6, f7, f8, f9, f10, rfid_tag, lat, lng, accuracy_m,
    captured_at, source_device_id, synced_at
) VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'data',
        'COMP-2024-001', 'Dell Workstation', 'IT Department', 'Alice Johnson', 'Active',
        '2024-01-10', '2026-12-31', 'OptiPlex 7090', 'DL7090-ABC123', '$1,200.00',
        'E200341700102023073017EF', 40.7135, -74.0065, 4.2,
        '2024-01-10 09:15:00'::timestamptz, 'MOBILE-SCANNER-002', '2024-01-10 16:30:00'::timestamptz
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'data',
        'MONITOR-2024-042', 'Samsung 27" Monitor', 'IT Department', 'Bob Chen', 'Active',
        '2024-01-10', '2025-06-15', 'Samsung S27F350', 'SAM27-XYZ789', '$320.00',
        'E200341700102023073019IJ', 40.7138, -74.0067, 3.8,
        '2024-01-10 09:20:00'::timestamptz, 'MOBILE-SCANNER-002', '2024-01-10 16:30:00'::timestamptz
    );

-- Test capture for different organization
INSERT INTO captures_universal (
    org_id, batch_id, type, f1, f2, f3, f4, f5,
    f6, f7, f8, f9, f10, rfid_tag, lat, lng, accuracy_m,
    captured_at, source_device_id
) VALUES
    (
        '22222222-2222-2222-2222-222222222222',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'data',
        'Server Rack Unit', 'SRU-001-2024', '1', 'Data Center Floor 1', 'Tech Lead',
        '2024-01-20', 'Operational status verified', 'Infrastructure', 'Excellent', 'DC-2024-Q1',
        'E200341700102023073020KL', 40.7589, -73.9851, 1.5,
        '2024-01-20 11:45:00'::timestamptz, 'HANDHELD-003'
    );

-- Insert test billing data
-- Represents different billing states for testing payment flows
INSERT INTO billing_org (org_id, stripe_customer_id, stripe_subscription_id, billing_status, updated_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 'cus_test_acme_manufacturing', 'sub_test_acme_pro_plan', 'active', '2024-01-15 10:00:00'::timestamptz),
    ('22222222-2222-2222-2222-222222222222', 'cus_test_techstart_solutions', NULL, 'trialing', '2024-01-02 10:00:00'::timestamptz),
    ('33333333-3333-3333-3333-333333333333', 'cus_test_global_logistics', 'sub_test_global_basic_plan', 'active', '2024-01-03 10:00:00'::timestamptz)
ON CONFLICT (org_id) DO UPDATE SET
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    billing_status = EXCLUDED.billing_status,
    updated_at = EXCLUDED.updated_at;

-- Commit the transaction
COMMIT;

-- Summary of test data created
DO $
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== SEED DATA SUMMARY ===';
    RAISE NOTICE 'Organizations: %', (SELECT COUNT(*) FROM organizations WHERE org_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'));
    RAISE NOTICE 'Org Members: %', (SELECT COUNT(*) FROM org_members WHERE org_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'));
    RAISE NOTICE 'Batches: %', (SELECT COUNT(*) FROM batches WHERE batch_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc'));
    RAISE NOTICE 'Batch Schemas: %', (SELECT COUNT(*) FROM batch_schema WHERE schema_id IN ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'));
    RAISE NOTICE 'Captures: %', (SELECT COUNT(*) FROM captures_universal WHERE batch_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc'));
    RAISE NOTICE 'Billing Records: %', (SELECT COUNT(*) FROM billing_org WHERE org_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'));
    RAISE NOTICE '';
    RAISE NOTICE 'Test organizations created:';
    RAISE NOTICE '- Acme Manufacturing Corp (Active billing, has batches with captures)';
    RAISE NOTICE '- TechStart Solutions (Trialing, has open batch)';  
    RAISE NOTICE '- Global Logistics Ltd (Active billing, minimal data)';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Ensure test users exist in auth.users with these IDs:';
    RAISE NOTICE '- 44444444-4444-4444-4444-444444444444 (Admin for Acme)';
    RAISE NOTICE '- 55555555-5555-5555-5555-555555555555 (Member for Acme)';
    RAISE NOTICE '- 66666666-6666-6666-6666-666666666666 (Admin for TechStart)';
    RAISE NOTICE '- 77777777-7777-7777-7777-777777777777 (Admin for Global)';
    RAISE NOTICE '=========================';
END $;