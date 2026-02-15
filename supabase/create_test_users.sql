-- =====================================================
-- Create Test Users for Seed Data
-- =====================================================
-- This script creates test users in auth.users table that correspond 
-- to the user IDs referenced in seed.sql
--
-- IMPORTANT: This should only be used in development environments
-- DO NOT run this in production!
--
-- Prerequisites:
-- - Supabase Auth should be set up
-- - This should be run BEFORE seed.sql
-- =====================================================

-- Prevent accidental execution in production
DO $$
BEGIN
    IF current_setting('app.environment', true) = 'production' THEN
        RAISE EXCEPTION 'Test users should not be created in production environment';
    END IF;
END $$;

-- Create test users in auth.users table
-- Note: These are mock users for development only
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES
    -- Test user 1: Admin at Acme Manufacturing
    (
        '00000000-0000-0000-0000-000000000000',
        '44444444-4444-4444-4444-444444444444',
        'authenticated',
        'authenticated',
        'admin@acme.test',
        '$2a$10$test.hash.for.development.purposes.only',
        NOW(),
        NULL,
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "John Admin", "role": "admin"}',
        '2024-01-01 10:00:00'::timestamptz,
        NOW(),
        '',
        '',
        '',
        ''
    ),
    -- Test user 2: Member at Acme Manufacturing
    (
        '00000000-0000-0000-0000-000000000000',
        '55555555-5555-5555-5555-555555555555',
        'authenticated',
        'authenticated',
        'member@acme.test',
        '$2a$10$test.hash.for.development.purposes.only',
        NOW(),
        NULL,
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "Jane Member", "role": "member"}',
        '2024-01-01 10:30:00'::timestamptz,
        NOW(),
        '',
        '',
        '',
        ''
    ),
    -- Test user 3: Admin at TechStart Solutions
    (
        '00000000-0000-0000-0000-000000000000',
        '66666666-6666-6666-6666-666666666666',
        'authenticated',
        'authenticated',
        'admin@techstart.test',
        '$2a$10$test.hash.for.development.purposes.only',
        NOW(),
        NULL,
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "Bob TechAdmin", "role": "admin"}',
        '2024-01-02 14:00:00'::timestamptz,
        NOW(),
        '',
        '',
        '',
        ''
    ),
    -- Test user 4: Admin at Global Logistics Demo
    (
        '00000000-0000-0000-0000-000000000000',
        '77777777-7777-7777-7777-777777777777',
        'authenticated',
        'authenticated',
        'admin@globallogistics.test',
        '$2a$10$test.hash.for.development.purposes.only',
        NOW(),
        NULL,
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "Alice LogAdmin", "role": "admin"}',
        '2024-01-03 09:00:00'::timestamptz,
        NOW(),
        '',
        '',
        '',
        ''
    )
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

-- Create corresponding auth.identities records
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES
    (
        '44444444-4444-4444-4444-444444444444',
        '44444444-4444-4444-4444-444444444444',
        '{"sub": "44444444-4444-4444-4444-444444444444", "email": "admin@acme.test"}',
        'email',
        NOW(),
        '2024-01-01 10:00:00'::timestamptz,
        NOW()
    ),
    (
        '55555555-5555-5555-5555-555555555555',
        '55555555-5555-5555-5555-555555555555',
        '{"sub": "55555555-5555-5555-5555-555555555555", "email": "member@acme.test"}',
        'email',
        NOW(),
        '2024-01-01 10:30:00'::timestamptz,
        NOW()
    ),
    (
        '66666666-6666-6666-6666-666666666666',
        '66666666-6666-6666-6666-666666666666',
        '{"sub": "66666666-6666-6666-6666-666666666666", "email": "admin@techstart.test"}',
        'email',
        NOW(),
        '2024-01-02 14:00:00'::timestamptz,
        NOW()
    ),
    (
        '77777777-7777-7777-7777-777777777777',
        '77777777-7777-7777-7777-777777777777',
        '{"sub": "77777777-7777-7777-7777-777777777777", "email": "admin@globallogistics.test"}',
        'email',
        NOW(),
        '2024-01-03 09:00:00'::timestamptz,
        NOW()
    )
ON CONFLICT (id, provider) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = NOW();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Test users created successfully!';
    RAISE NOTICE 'You can now run seed.sql to populate the database with test data.';
    RAISE NOTICE '';
    RAISE NOTICE 'Test user credentials (for development only):';
    RAISE NOTICE '- admin@acme.test (Admin at Acme Manufacturing)';
    RAISE NOTICE '- member@acme.test (Member at Acme Manufacturing)';
    RAISE NOTICE '- admin@techstart.test (Admin at TechStart Solutions)';
    RAISE NOTICE '- admin@globallogistics.test (Admin at Global Logistics)';
    RAISE NOTICE '';
    RAISE NOTICE 'Note: All users have the same development password hash.';
    RAISE NOTICE 'In a real environment, use proper authentication flows.';
END $$;