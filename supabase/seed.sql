-- Seed data for development and testing
-- WARNING: This seed data is for development only. Do not use in production.

-- Store generated UUIDs for referential integrity
DO $
DECLARE
    org1_id UUID := '11111111-1111-1111-1111-111111111111';
    org2_id UUID := '22222222-2222-2222-2222-222222222222';
    org3_id UUID := '33333333-3333-3333-3333-333333333333';
    user1_id UUID := '44444444-4444-4444-4444-444444444444';
    user2_id UUID := '55555555-5555-5555-5555-555555555555';
    user3_id UUID := '66666666-6666-6666-6666-666666666666';
    user4_id UUID := '77777777-7777-7777-7777-777777777777';
    batch1_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    batch2_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    batch3_id UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    schema1_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    schema2_id UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
BEGIN

-- Insert test organizations
INSERT INTO organizations (org_id, name) VALUES
    (org1_id, 'Test Organization 1'),
    (org2_id, 'Test Organization 2'),
    (org3_id, 'Demo Company');

    -- Note: In a real environment, you would need actual user IDs from auth.users
    -- For testing purposes, assuming test users exist with these IDs
    -- Insert test org members (replace with actual user IDs when available)
    INSERT INTO org_members (org_id, user_id, role) VALUES
        (org1_id, user1_id, 'admin'),
        (org1_id, user2_id, 'member'),
        (org2_id, user3_id, 'admin'),
        (org3_id, user4_id, 'admin');

-- Insert test batches
INSERT INTO batches (batch_id, org_id, created_by, status) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'open'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'synced'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'open');

-- Insert test batch schemas
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
    );

-- Insert test captures
INSERT INTO captures_universal (
    org_id, batch_id, type, f1, f2, f3, f4, f5,
    f6, f7, f8, f9, f10, rfid_tag, lat, lng, accuracy_m,
    captured_at, source_device_id
) VALUES
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
    (
        '11111111-1111-1111-1111-111111111111',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'data',
        'COMP-2024-001', 'Dell Workstation', 'IT Department', 'Alice Johnson', 'Active',
        '2024-01-10', '2026-12-31', 'OptiPlex 7090', 'DL7090-ABC123', '$1200',
        'E200341700102023073017EF', 40.7135, -74.0065, 4.2,
        '2024-01-10 09:15:00'::timestamptz, 'DEVICE002'
    );

-- Insert test billing data
INSERT INTO billing_org (org_id, stripe_customer_id, billing_status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'cus_test123456789', 'trialing'),
    ('22222222-2222-2222-2222-222222222222', 'cus_test987654321', 'active'),
    ('33333333-3333-3333-3333-333333333333', 'cus_test456789123', 'trialing');