# Seed Data Guide

## Overview
The `seed.sql` file provides test data for development and testing environments. This data should **NEVER** be used in production.

## Prerequisites
Before running the seed data:

1. **Auth Users Required**: The seed script requires existing users in `auth.users`. Create test users through:
   - Supabase Auth UI
   - Auth API
   - Manual user registration

2. **Environment Check**: Ensure you're in a development/testing environment

## Data Structure

### Organizations (3 test orgs)
- **Acme Manufacturing Co**: Manufacturing/inventory tracking use case
- **TechStart Solutions**: IT asset management use case  
- **Global Logistics Inc**: Simple logistics tracking use case

### Test Scenarios Covered

#### 1. Manufacturing Inventory (Org 1)
- **Schema**: 15 columns including product details, quality control, supplier info
- **Sample Data**: Industrial motors, control panels with quality notes
- **Use Case**: Manufacturing quality control and inventory management

#### 2. IT Asset Management (Org 1) 
- **Schema**: 10 columns for asset tracking, warranty, assignments
- **Sample Data**: Laptops, monitors with department assignments
- **Use Case**: Corporate IT asset lifecycle management

#### 3. Simple Logistics (Org 2)
- **Schema**: 5 columns for basic package tracking
- **Sample Data**: Packages with carrier and destination info
- **Use Case**: Simple logistics and shipping tracking

### Data Features Tested
- ✅ Multiple organizations with different users
- ✅ Different batch statuses (open, synced, closed)
- ✅ Various schema configurations (5-15 columns)
- ✅ Different capture types and sources
- ✅ Geographic data (lat/lng coordinates)
- ✅ RFID tag associations
- ✅ Billing status variations
- ✅ Cross-organizational data isolation

## Usage

### Running the Seed Data
```bash
# Connect to your Supabase instance
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Run the seed script
\i supabase/seed.sql
```

### Cleaning Up
The script includes cleanup logic, but you can manually clean up:
```sql
-- Remove all seed data
DELETE FROM billing_org WHERE stripe_customer_id LIKE 'cus_test_%';
DELETE FROM captures_universal WHERE org_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222', 
    '33333333-3333-3333-3333-333333333333'
);
-- ... continue with other tables
```

## Testing Scenarios

### User Roles & Permissions
- Test admin vs member permissions
- Cross-organization access isolation
- RLS policy enforcement

### Data Validation
- Foreign key constraint validation
- Check constraint testing (status values)
- Schema flexibility testing

### API Testing
- Batch creation with different schemas
- Capture insertion and querying
- Organization management operations

## Security Notes

⚠️ **Important Security Considerations**:
- Uses predictable UUIDs - acceptable for testing only
- Test Stripe customer IDs included
- Geographic coordinates are real NYC locations
- RFID tags use test format patterns

## Troubleshooting

### Common Issues

1. **"No users found in auth.users"**
   - Create test users first through Supabase Auth
   - Verify auth.users table has data

2. **Foreign key violations**
   - Check that all referenced IDs exist
   - Verify org_members relationships

3. **RLS policy blocking inserts**
   - Ensure you're running as a user with proper permissions
   - Check that auth context is properly set

### Verification Queries
```sql
-- Verify seed data was inserted
SELECT 
    o.name,
    COUNT(DISTINCT om.user_id) as members,
    COUNT(DISTINCT b.batch_id) as batches,
    COUNT(DISTINCT c.cntid) as captures
FROM organizations o
LEFT JOIN org_members om ON o.org_id = om.org_id  
LEFT JOIN batches b ON o.org_id = b.org_id
LEFT JOIN captures_universal c ON o.org_id = c.org_id
WHERE o.org_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
)
GROUP BY o.org_id, o.name;
```