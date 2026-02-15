-- Cleanup script for seed data
-- Use this to remove all test data before re-running seed.sql

-- Remove in reverse order of dependencies
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

-- Reset sequences if needed (only affects auto-generated IDs)
-- This is not strictly necessary for the current schema but good practice
SELECT setval('captures_universal_cntid_seq', COALESCE((SELECT MAX(cntid) FROM captures_universal), 1), false);