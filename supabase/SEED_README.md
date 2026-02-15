# Seed Data Documentation

This directory contains seed data for development and testing environments.

## Files

- `seed.sql` - Main seed data script
- `seed_cleanup.sql` - Script to remove all test data
- `SEED_README.md` - This documentation file

## Prerequisites

Before running the seed script:

1. **Apply all migrations** - Ensure all database migrations have been applied
2. **Create test users** - The seed data references specific user IDs that must exist in `auth.users`
3. **Development environment only** - Never run this on production

## Required Test Users

Create these users in your authentication provider (or replace the UUIDs in seed.sql with real user IDs):

```
44444444-4444-4444-4444-444444444444 - Admin for Acme Manufacturing Corp
55555555-5555-5555-5555-555555555555 - Member for Acme Manufacturing Corp  
66666666-6666-6666-6666-666666666666 - Admin for TechStart Solutions
77777777-7777-7777-7777-777777777777 - Admin for Global Logistics Ltd
```

## Running the Seed Script

```bash
# Apply migrations first
supabase db reset

# Run seed script
psql -d your_database -f supabase/seed.sql
```

Or using Supabase CLI:
```bash
supabase db reset --linked
# seed.sql will be run automatically if placed in supabase/seed.sql
```

## Test Data Overview

### Organizations (3)
- **Acme Manufacturing Corp** - Full test data with active billing, batches, captures
- **TechStart Solutions** - Minimal data, trialing status
- **Global Logistics Ltd** - Active billing, minimal operational data

### Batches (3)
- **Inventory Management** (open) - 3 captures, full schema
- **Asset Tracking** (synced) - 2 captures, different schema  
- **Infrastructure Audit** (open) - 1 capture, different org

### Use Cases Covered
- Multi-organization data isolation
- Different batch statuses (open, synced)
- Various RFID capture scenarios
- Different billing states (trialing, active)
- Location data with GPS coordinates
- Different device types (readers, scanners, handhelds)

## Cleanup

To remove all seed data:

```bash
psql -d your_database -f supabase/seed_cleanup.sql
```

## Customization

To customize for your needs:

1. **Replace UUIDs** - Use real user IDs from your auth system
2. **Modify organizations** - Change names/details to match your test scenarios
3. **Update schemas** - Modify batch_schema columns for your field requirements
4. **Adjust captures** - Change field data to match your testing scenarios
5. **Location data** - Update lat/lng coordinates for your geographic region

## Safety Features

- Uses transactions to ensure atomicity
- Includes `ON CONFLICT` clauses to prevent duplicate key errors
- Validates user existence before creating org_members
- Provides detailed logging of what was created
- Safe to run multiple times

## Common Issues

1. **Foreign key violations** - Ensure test users exist in auth.users
2. **Migration not applied** - Run migrations before seed data
3. **RLS policies** - Seed runs with elevated privileges, but application access uses RLS

## Production Warning

⚠️ **NEVER run seed.sql in production** ⚠️

This file contains:
- Hardcoded UUIDs that could conflict with real data
- Test customer data
- Development-only configurations