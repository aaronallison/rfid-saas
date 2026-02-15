# Supabase Seed Data Documentation

This directory contains seed data and setup scripts for development and testing environments.

## ⚠️ Important Security Notice

**DO NOT use these scripts in production environments.** These files contain test data, predictable UUIDs, and mock authentication credentials that are only suitable for development and testing.

## Files Overview

### `seed.sql`
Main seed data file containing:
- 3 test organizations with realistic business scenarios
- 4 test batches in different states (open, synced, closed)
- Comprehensive batch schemas for different use cases
- 9 sample capture records with realistic data
- Billing configurations for subscription testing

### `create_test_users.sql` 
Creates test users in the Supabase Auth system that correspond to the user IDs referenced in `seed.sql`.

### Migration Files
- `20241201000001_create_organizations.sql` - Organizations table
- `20241201000002_create_org_members.sql` - Organization membership
- `20241201000003_create_batches.sql` - Data collection batches
- `20241201000004_create_batch_schema.sql` - Column definitions
- `20241201000005_create_captures_universal.sql` - Captured data
- `20241201000006_create_billing_org.sql` - Billing information
- `20241201000007_create_rls_helper_function.sql` - RLS helper function

### `rls_policies.sql`
Row Level Security policies for all tables.

## Setup Instructions

### 1. Apply Database Migrations
First, ensure all migration files have been applied:

```sql
-- Run migrations in order (001 through 007)
\i supabase/migrations/20241201000001_create_organizations.sql
\i supabase/migrations/20241201000002_create_org_members.sql
\i supabase/migrations/20241201000003_create_batches.sql
\i supabase/migrations/20241201000004_create_batch_schema.sql
\i supabase/migrations/20241201000005_create_captures_universal.sql
\i supabase/migrations/20241201000006_create_billing_org.sql
\i supabase/migrations/20241201000007_create_rls_helper_function.sql
```

### 2. Apply RLS Policies
```sql
\i supabase/rls_policies.sql
```

### 3. Create Test Users (Development Only)
```sql
\i supabase/create_test_users.sql
```

### 4. Load Seed Data
```sql
\i supabase/seed.sql
```

## Test Data Overview

### Organizations
1. **Acme Manufacturing Corp** - Manufacturing inventory management
2. **TechStart Solutions** - Technology equipment tracking  
3. **Global Logistics Demo** - Package and shipment tracking

### Test Users
- `admin@acme.test` - Admin at Acme Manufacturing
- `member@acme.test` - Member at Acme Manufacturing  
- `admin@techstart.test` - Admin at TechStart Solutions
- `admin@globallogistics.test` - Admin at Global Logistics

### Sample Batches
- **Inventory Management** - Active data collection (open)
- **Asset Tracking** - Completed and synced batch
- **Equipment Audit** - In progress (open)
- **Logistics Tracking** - Completed (closed)

## Data Validation

The seed script includes:
- **Prerequisites validation** - Ensures all required tables exist
- **Conflict handling** - Uses `ON CONFLICT` clauses to prevent duplicate key errors
- **Environment protection** - Prevents execution in production
- **Comprehensive logging** - Provides detailed feedback on data creation

## Usage in Development

After running the seed scripts, you can:

1. **Test authentication** with the created test users
2. **Verify RLS policies** work correctly across organizations
3. **Test application features** with realistic data scenarios
4. **Validate data relationships** between organizations, batches, and captures

## Cleanup

To remove all seed data:

```sql
-- Remove in reverse dependency order
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

-- Remove test users (if needed)
DELETE FROM auth.identities WHERE user_id IN (
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555',
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777'
);

DELETE FROM auth.users WHERE id IN (
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555',
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777'
);
```

## Security Considerations

- All test data uses predictable UUIDs for consistency
- Test users have mock password hashes
- Billing data references test Stripe customer IDs
- Geographic coordinates are for New York/New Jersey area
- RFID tags follow a consistent test pattern

Remember to never use this test data in production environments!