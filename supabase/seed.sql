-- ============================================================================
-- Seed data for development and testing
-- ============================================================================
-- WARNING: This file contains test data with hardcoded UUIDs for development purposes only.
-- Do not use in production environments.
-- 
-- This script:
-- 1. Creates test users in auth.users (if not exists)
-- 2. Creates test organizations
-- 3. Sets up organization memberships
-- 4. Creates sample batches with different statuses
-- 5. Defines batch schemas for different use cases
-- 6. Inserts sample capture data
-- 7. Sets up billing information
-- 
-- All inserts use ON CONFLICT DO NOTHING to make the script idempotent.
-- ============================================================================

-- Temporarily disable triggers and constraints for bulk insert performance
SET session_replication_role = replica;

-- Validate required extensions and functions exist
DO $
BEGIN
    -- Check if the is_org_member function exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'is_org_member'
    ) THEN
        RAISE EXCEPTION 'Required function is_org_member does not exist. Run migrations first.';
    END IF;
    
    -- Check if required tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        RAISE EXCEPTION 'Required table organizations does not exist. Run migrations first.';
    END IF;
END $;

-- Insert test organizations
INSERT INTO organizations (org_id, name) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Test Organization 1'),
    ('22222222-2222-2222-2222-222222222222', 'Test Organization 2'),
    ('33333333-3333-3333-3333-333333333333', 'Demo Company')
ON CONFLICT (org_id) DO NOTHING;

-- Create test users in auth.users if they don't exist
-- Note: In a real Supabase environment, these would be created through authentication
INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, 
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, 
    is_super_admin, role
) VALUES
    ('44444444-4444-4444-4444-444444444444', 'admin1@test.com', 'dummy', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated'),
    ('55555555-5555-5555-5555-555555555555', 'member1@test.com', 'dummy', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated'),
    ('66666666-6666-6666-6666-666666666666', 'admin2@test.com', 'dummy', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated'),
    ('77777777-7777-7777-7777-777777777777', 'admin3@test.com', 'dummy', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Insert test org members with proper role validation
INSERT INTO org_members (org_id, user_id, role) VALUES
    ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'admin'),
    ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'member'),
    ('22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'admin'),
    ('33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', 'admin')
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Insert test batches with validated status values
INSERT INTO batches (batch_id, org_id, created_by, status) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'open'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'synced'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'open')
ON CONFLICT (batch_id) DO NOTHING;

-- Insert test batch schemas with proper foreign key references
INSERT INTO batch_schema (
    schema_id, batch_id, org_id, 
    col_1_name, col_2_name, col_3_name, col_4_name, col_5_name,
    col_6_name, col_7_name, col_8_name, col_9_name, col_10_name
) VALUES
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd', 
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
        '11111111-1111-1111-1111-111111111111',
        'Product Name', 'SKU', 'Quantity', 'Location', 'Inspector',
        'Date', 'Notes', 'Category', 'Condition', 'Batch Number'
    ),
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
        '11111111-1111-1111-1111-111111111111',
        'Asset Tag', 'Description', 'Department', 'Employee', 'Status',
        'Last Checked', 'Warranty', 'Model', 'Serial', 'Cost'
    ),
    (
        'ffffffff-ffff-ffff-ffff-ffffffffffff', 
        'cccccccc-cccc-cccc-cccc-cccccccccccc', 
        '22222222-2222-2222-2222-222222222222',
        'Item ID', 'Name', 'Type', 'Owner', 'Condition',
        'Purchase Date', 'Value', 'Location', 'Notes', 'Status'
    )
ON CONFLICT (schema_id) DO NOTHING;

-- Insert test captures with validated data and proper foreign key references
INSERT INTO captures_universal (
    org_id, batch_id, type, f1, f2, f3, f4, f5,
    f6, f7, f8, f9, f10, rfid_tag, lat, lng, accuracy_m,
    captured_at, source_device_id
) VALUES
    -- Batch 1 captures (Product inventory)
    (
        '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'data',
        'Widget Pro 3000', 'WP3000-001', '50', 'Warehouse A', 'John Doe',
        '2024-01-15', 'All items accounted for', 'Electronics', 'New', 'B2024-001',
        'E200341700102023073015AB', 40.7128, -74.0060, 3.5,
        '2024-01-15 14:30:00'::timestamptz, 'DEVICE001'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'data',
        'Gadget Ultra', 'GU-2023-042', '25', 'Warehouse B', 'Jane Smith',
        '2024-01-15', 'Minor scratches noted', 'Electronics', 'Used', 'B2024-001',
        'E200341700102023073016CD', 40.7130, -74.0062, 2.8,
        '2024-01-15 14:35:00'::timestamptz, 'DEVICE001'
    ),
    -- Batch 2 captures (Asset tracking)
    (
        '11111111-1111-1111-1111-111111111111',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'data',
        'COMP-2024-001', 'Dell Workstation', 'IT Department', 'Alice Johnson', 'Active',
        '2024-01-10', '2026-12-31', 'OptiPlex 7090', 'DL7090-ABC123', '$1200',
        'E200341700102023073017EF', 40.7135, -74.0065, 4.2,
        '2024-01-10 09:15:00'::timestamptz, 'DEVICE002'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'data',
        'LAPTOP-2024-002', 'MacBook Pro M2', 'Design Department', 'Bob Wilson', 'Active',
        '2024-01-11', '2025-12-31', 'MBP16-M2', 'MBP-XYZ789', '$2400',
        'E200341700102023073018GH', 40.7140, -74.0070, 3.1,
        '2024-01-11 10:20:00'::timestamptz, 'DEVICE002'
    ),
    -- Batch 3 captures (General inventory)
    (
        '22222222-2222-2222-2222-222222222222',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'data',
        'ITEM-001', 'Office Chair', 'Furniture', 'Admin Office', 'Good',
        '2023-12-01', '$299.99', 'Floor 2', 'Ergonomic desk chair', 'In Use',
        'E200341700102023073019IJ', 40.7125, -74.0055, 4.8,
        '2024-01-12 11:45:00'::timestamptz, 'DEVICE003'
    );

-- Insert test billing data with validated status values
INSERT INTO billing_org (org_id, stripe_customer_id, billing_status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'cus_test123456789', 'trialing'),
    ('22222222-2222-2222-2222-222222222222', 'cus_test987654321', 'active'),
    ('33333333-3333-3333-3333-333333333333', 'cus_test456789123', 'trialing')
ON CONFLICT (org_id) DO NOTHING;

-- Re-enable triggers and constraints
SET session_replication_role = DEFAULT;

-- ============================================================================
-- Seed data insertion complete
-- ============================================================================
-- Test Data Summary:
-- - 3 Organizations: Test Organization 1, Test Organization 2, Demo Company
-- - 4 Test Users: admin1@test.com, member1@test.com, admin2@test.com, admin3@test.com
-- - 3 Batches: 2 for Org 1 (open, synced), 1 for Org 2 (open)
-- - 3 Batch Schemas: Product inventory, Asset tracking, General inventory
-- - 5 Sample Captures: Various RFID-tagged items with location data
-- - 3 Billing Records: Mix of trialing and active statuses
-- ============================================================================