# Supabase Seed Data Documentation

## Overview
This directory contains SQL scripts for seeding the database with test data for development and testing purposes.

## Files
- `seed.sql` - Main seed script that populates all tables with test data
- `cleanup_seed.sql` - Script to remove all test data
- `SEED_README.md` - This documentation file

## Test Data Structure

### Organizations (3 test orgs)
- **Test Organization 1** - Has multiple users and batches with different statuses
- **Test Organization 2** - Single admin, one batch  
- **Demo Company** - Single admin, equipment tracking scenario

### User Accounts
- 4 test users with different roles across organizations
- Default password: `testpassword123` for all test users
- Email format: `{role}{number}@test.local`

### Batches (4 total)
- **Open batches** - Active data collection
- **Synced batches** - Completed data collection
- **Closed batches** - Finalized and archived

### Schema Configurations
1. **Inventory Management** - Product tracking with 10 fields
2. **Asset Tracking** - IT equipment with warranty/cost data
3. **Comprehensive Item Tracking** - 15-field detailed schema
4. **Equipment Calibration** - Specialized for equipment maintenance

### Sample Data Coverage
- ✅ Multi-organization scenarios
- ✅ Different user permission levels
- ✅ Various batch lifecycle states
- ✅ Multiple schema configurations (10-15 columns)
- ✅ GPS location data with realistic coordinates
- ✅ RFID tag associations
- ✅ Multiple capture devices
- ✅ Time-series data with proper timestamps
- ✅ Billing status variations (trialing, active, past_due)

## Usage

### Running Seed Script
```sql
-- Run in your Supabase SQL editor or via psql
\i supabase/seed.sql
```

### Cleaning Up Test Data  
```sql
-- Remove all test data
\i supabase/cleanup_seed.sql
```

## Safety Features

### Production Protection
- Script checks for production environment and skips auth user creation
- Uses `ON CONFLICT DO NOTHING` to prevent duplicate key errors
- Includes error handling for foreign key constraint violations
- Cleans up existing test data before inserting new data

### Error Handling
- Graceful handling when auth.users table cannot be modified
- Continues execution even if org_members creation fails
- Uses PL/pgSQL blocks with exception handling

## Test Scenarios

### Authentication Testing
Test users are created in `auth.users` (development only):
- Admin users with full organization permissions
- Member users with limited permissions
- Cross-organization access testing

### Data Relationships
- Organizations → Org Members → Batches → Schemas → Captures
- Billing data linked to organizations
- Location data with GPS coordinates
- RFID tag associations with captures

### Billing Integration
- Stripe customer IDs for payment testing
- Different billing statuses for testing subscription scenarios
- Subscription ID tracking

## Important Notes

⚠️ **Development Use Only** - Never run in production environments

⚠️ **Auth Dependencies** - Org member creation depends on auth.users table access

⚠️ **UUID Consistency** - Uses predictable UUIDs for testing (not recommended for production)

⚠️ **Password Security** - Test passwords are not secure and should never be used in production

## Extending Test Data

To add new test scenarios:
1. Add new organizations with unique UUIDs
2. Create corresponding users in the auth section
3. Add batches with appropriate org_id references
4. Define schemas matching your use case
5. Insert sample captures with realistic data
6. Update cleanup script to include new data

## Troubleshooting

### Common Issues
- **Auth user creation fails**: Normal in hosted environments, org_members will fail gracefully
- **Foreign key violations**: Ensure migration scripts have been run first
- **Duplicate key errors**: Script includes cleanup section to handle this
- **Permission errors**: Some operations require superuser privileges in self-hosted setups