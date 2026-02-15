-- =====================================================
-- Seed Data for Development and Testing Environment
-- =====================================================
-- This file provides sample data for development, testing, and demo purposes.
-- DO NOT use this in production environments.
--
-- Prerequisites:
-- - All migration files must be applied first
-- - Test users should be created in auth.users table before running this seed
--
-- Data Structure:
-- - 3 test organizations with different scenarios
-- - Multiple user roles (admin/member) per organization
-- - Sample batches in different states (open/synced/closed)
-- - Schema definitions for different use cases
-- - Sample capture data with realistic field values
-- - Billing information for subscription testing
-- =====================================================

-- Prevent accidental execution in production
DO $
BEGIN
    IF current_setting('app.environment', true) = 'production' THEN
        RAISE EXCEPTION 'Seed data should not be loaded in production environment';
    END IF;
END $;

-- =====================================================
-- PREREQUISITES VALIDATION
-- =====================================================
-- Verify that all required tables exist before inserting seed data
DO $
DECLARE
    missing_tables text[] := ARRAY[]::text[];
BEGIN
    -- Check for required tables
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'organizations') THEN
        missing_tables := array_append(missing_tables, 'organizations');
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'org_members') THEN
        missing_tables := array_append(missing_tables, 'org_members');
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'batches') THEN
        missing_tables := array_append(missing_tables, 'batches');
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'batch_schema') THEN
        missing_tables := array_append(missing_tables, 'batch_schema');
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'captures_universal') THEN
        missing_tables := array_append(missing_tables, 'captures_universal');
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'billing_org') THEN
        missing_tables := array_append(missing_tables, 'billing_org');
    END IF;
    
    -- Raise error if any tables are missing
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing required tables: %. Please run all migration files first.', array_to_string(missing_tables, ', ');
    END IF;
    
    RAISE NOTICE 'All required tables found. Proceeding with seed data insertion...';
END $;

-- =====================================================
-- TEST ORGANIZATIONS
-- =====================================================
-- Create diverse organizations for testing different scenarios
INSERT INTO organizations (org_id, name, created_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Acme Manufacturing Corp', '2024-01-01 10:00:00'::timestamptz),
    ('22222222-2222-2222-2222-222222222222', 'TechStart Solutions', '2024-01-02 14:30:00'::timestamptz),
    ('33333333-3333-3333-3333-333333333333', 'Global Logistics Demo', '2024-01-03 09:15:00'::timestamptz)
ON CONFLICT (org_id) DO NOTHING;

-- =====================================================
-- TEST ORGANIZATION MEMBERS
-- =====================================================
-- Note: These user IDs must exist in auth.users table
-- In development, create test users first or replace with actual user IDs
-- Skipping foreign key validation for seed data (will fail gracefully if users don't exist)
INSERT INTO org_members (org_id, user_id, role, created_at) VALUES
    -- Acme Manufacturing Corp members
    ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'admin', '2024-01-01 10:05:00'::timestamptz),
    ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'member', '2024-01-01 11:00:00'::timestamptz),
    
    -- TechStart Solutions members
    ('22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'admin', '2024-01-02 14:35:00'::timestamptz),
    
    -- Global Logistics Demo members
    ('33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', 'admin', '2024-01-03 09:20:00'::timestamptz)
ON CONFLICT (org_id, user_id) DO NOTHING;

-- =====================================================
-- TEST BATCHES
-- =====================================================
-- Create batches in different states for comprehensive testing
INSERT INTO batches (batch_id, org_id, created_by, status, created_at) VALUES
    -- Acme Manufacturing Corp batches
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'open', '2024-01-15 08:00:00'::timestamptz),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'synced', '2024-01-10 16:30:00'::timestamptz),
    
    -- TechStart Solutions batches
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'open', '2024-01-20 13:45:00'::timestamptz),
    
    -- Global Logistics Demo batches
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', 'closed', '2024-01-05 11:20:00'::timestamptz)
ON CONFLICT (batch_id) DO NOTHING;

-- =====================================================
-- TEST BATCH SCHEMAS
-- =====================================================
-- Define column schemas for different types of data collection scenarios
INSERT INTO batch_schema (
    schema_id, batch_id, org_id, 
    col_1_name, col_2_name, col_3_name, col_4_name, col_5_name,
    col_6_name, col_7_name, col_8_name, col_9_name, col_10_name,
    created_at
) VALUES
    -- Inventory Management Schema (Acme Manufacturing - Batch A)
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
        '11111111-1111-1111-1111-111111111111',
        'Product Name', 'SKU', 'Quantity', 'Location', 'Inspector',
        'Date', 'Notes', 'Category', 'Condition', 'Batch Number',
        '2024-01-15 08:05:00'::timestamptz
    ),
    
    -- Asset Tracking Schema (Acme Manufacturing - Batch B)
    (
        'ffffffff-ffff-ffff-ffff-ffffffffffff', 
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
        '11111111-1111-1111-1111-111111111111',
        'Asset Tag', 'Description', 'Department', 'Employee', 'Status',
        'Last Checked', 'Warranty', 'Model', 'Serial', 'Cost',
        '2024-01-10 16:35:00'::timestamptz
    ),
    
    -- Equipment Audit Schema (TechStart Solutions - Batch C)
    (
        '10101010-1010-1010-1010-101010101010',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '22222222-2222-2222-2222-222222222222',
        'Equipment ID', 'Type', 'Manufacturer', 'Model', 'Serial Number',
        'Purchase Date', 'Condition', 'Location', 'Responsible Person', 'Notes',
        '2024-01-20 13:50:00'::timestamptz
    ),
    
    -- Logistics Tracking Schema (Global Logistics Demo - Batch D)
    (
        '20202020-2020-2020-2020-202020202020',
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '33333333-3333-3333-3333-333333333333',
        'Package ID', 'Destination', 'Weight', 'Dimensions', 'Priority',
        'Sender', 'Receiver', 'Tracking Number', 'Service Type', 'Special Instructions',
        '2024-01-05 11:25:00'::timestamptz
    )
ON CONFLICT (schema_id) DO NOTHING;

-- =====================================================
-- TEST CAPTURE DATA
-- =====================================================
-- Sample data captures representing different business scenarios
INSERT INTO captures_universal (
    org_id, batch_id, type, f1, f2, f3, f4, f5,
    f6, f7, f8, f9, f10, rfid_tag, lat, lng, accuracy_m,
    captured_at, source_device_id
) VALUES
    -- Inventory captures for Acme Manufacturing (Batch A)
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
        'Super Component X', 'SCX-2024-001', '100', 'Warehouse C-3', 'Mike Johnson',
        '2024-01-15', 'Perfect condition', 'Components', 'New', 'B2024-001',
        'E200341700102023073018GH', 40.7125, -74.0058, 4.1,
        '2024-01-15 14:40:00'::timestamptz, 'RFID-READER-001'
    ),

    -- Asset tracking captures for Acme Manufacturing (Batch B - Synced)
    (
        '11111111-1111-1111-1111-111111111111',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'data',
        'COMP-2024-001', 'Dell Workstation', 'IT Department', 'Alice Johnson', 'Active',
        '2024-01-10', '2026-12-31', 'OptiPlex 7090', 'DL7090-ABC123', '$1,200.00',
        'E200341700102023073017EF', 40.7135, -74.0065, 4.2,
        '2024-01-10 09:15:00'::timestamptz, 'MOBILE-SCANNER-002'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'data',
        'PRINTER-2024-005', 'HP LaserJet Pro', 'Marketing Dept', 'Bob Wilson', 'Active',
        '2024-01-10', '2025-06-15', 'LaserJet Pro 4301', 'HP4301-XYZ789', '$450.00',
        'E200341700102023073019IJ', 40.7140, -74.0070, 3.8,
        '2024-01-10 09:25:00'::timestamptz, 'MOBILE-SCANNER-002'
    ),

    -- Equipment audit captures for TechStart Solutions (Batch C)
    (
        '22222222-2222-2222-2222-222222222222',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'data',
        'SERVER-001', 'Server Rack', 'Dell Technologies', 'PowerEdge R750', 'PE750-001234',
        '2023-06-15', 'Excellent', 'Data Center A', 'Tom Anderson', 'Primary production server',
        'E200341700102023073020KL', 40.7580, -73.9855, 2.5,
        '2024-01-20 14:00:00'::timestamptz, 'HANDHELD-003'
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'data',
        'LAPTOP-042', 'Laptop Computer', 'Apple Inc.', 'MacBook Pro 16"', 'MBP16-567890',
        '2023-09-20', 'Good', 'Engineering Floor 3', 'Sarah Davis', 'Development workstation',
        'E200341700102023073021MN', 40.7585, -73.9860, 3.2,
        '2024-01-20 14:15:00'::timestamptz, 'HANDHELD-003'
    ),

    -- Logistics tracking captures for Global Logistics Demo (Batch D - Closed)
    (
        '33333333-3333-3333-3333-333333333333',
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'data',
        'PKG-20240105-001', 'New York, NY', '2.5 kg', '30x20x15 cm', 'Express',
        'Global Supply Co.', 'TechCorp Inc.', 'TRK-987654321', 'Next Day Air', 'Fragile - Handle with care',
        'E200341700102023073022OP', 40.6892, -74.0445, 5.0,
        '2024-01-05 12:00:00'::timestamptz, 'WAREHOUSE-SCANNER-004'
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'data',
        'PKG-20240105-002', 'Los Angeles, CA', '1.2 kg', '25x15x10 cm', 'Standard',
        'West Coast Dist.', 'Retail Store 45', 'TRK-123456789', 'Ground Service', 'None',
        'E200341700102023073023QR', 40.6895, -74.0450, 4.8,
        '2024-01-05 12:30:00'::timestamptz, 'WAREHOUSE-SCANNER-004'
    );

-- =====================================================
-- TEST BILLING DATA
-- =====================================================
-- Billing configurations for testing different subscription states
INSERT INTO billing_org (org_id, stripe_customer_id, stripe_subscription_id, billing_status, updated_at) VALUES
    -- Acme Manufacturing Corp - Active subscription
    ('11111111-1111-1111-1111-111111111111', 'cus_test_acme_mfg_123456', 'sub_test_acme_active_001', 'active', '2024-01-15 10:00:00'::timestamptz),
    
    -- TechStart Solutions - Trial period
    ('22222222-2222-2222-2222-222222222222', 'cus_test_techstart_789012', 'sub_test_techstart_trial_002', 'trialing', '2024-01-20 14:00:00'::timestamptz),
    
    -- Global Logistics Demo - Trial period
    ('33333333-3333-3333-3333-333333333333', 'cus_test_global_log_345678', 'sub_test_global_trial_003', 'trialing', '2024-01-03 09:30:00'::timestamptz)
ON CONFLICT (org_id) DO UPDATE SET
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    billing_status = EXCLUDED.billing_status,
    updated_at = EXCLUDED.updated_at;

-- =====================================================
-- SEED DATA COMPLETION NOTICE
-- =====================================================
DO $
BEGIN
    RAISE NOTICE 'Seed data has been successfully loaded!';
    RAISE NOTICE 'Organizations created: 3';
    RAISE NOTICE 'Org members created: 4 (requires valid auth.users entries)';
    RAISE NOTICE 'Batches created: 4';
    RAISE NOTICE 'Batch schemas created: 4';
    RAISE NOTICE 'Capture records created: 9';
    RAISE NOTICE 'Billing records created: 3';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps for development:';
    RAISE NOTICE '1. Create corresponding test users in auth.users table';
    RAISE NOTICE '2. Verify RLS policies are working correctly';
    RAISE NOTICE '3. Test data access from your application';
    RAISE NOTICE '';
    RAISE NOTICE 'Test user IDs referenced in this seed:';
    RAISE NOTICE '- 44444444-4444-4444-4444-444444444444 (Admin - Acme Manufacturing)';
    RAISE NOTICE '- 55555555-5555-5555-5555-555555555555 (Member - Acme Manufacturing)';
    RAISE NOTICE '- 66666666-6666-6666-6666-666666666666 (Admin - TechStart Solutions)';
    RAISE NOTICE '- 77777777-7777-7777-7777-777777777777 (Admin - Global Logistics)';
END $;