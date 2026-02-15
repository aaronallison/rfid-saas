# Billing Module

This module provides utilities for managing organization billing and feature access in the RFID system.

## Overview

The billing system uses Stripe for payment processing and Supabase for data storage. It supports:
- Free tier with limited features
- Pro tier with premium features
- Automatic feature gating based on billing status
- Webhook handling for subscription changes

## Types

### BillingStatus
Valid billing statuses:
- `'trialing'` - Free trial period
- `'active'` - Active paid subscription
- `'past_due'` - Payment failed, subscription past due
- `'canceled'` - Subscription canceled or expired

### BillingInfo
Complete billing information for an organization:
```typescript
interface BillingInfo {
  org_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  billing_status: BillingStatus | null
  updated_at: string
}
```

### FeatureAccess
Feature permissions for an organization:
```typescript
interface FeatureAccess {
  canSync: boolean
  canExport: boolean
  canAddTeamMembers: boolean
  maxTeamSize: number
}
```

## Functions

### Core Functions

#### `checkBillingStatus(supabase, org_id): Promise<boolean>`
Check if an organization has active billing (trialing or active).

#### `getBillingInfo(supabase, org_id): Promise<BillingInfo | null>`
Retrieve complete billing information for an organization.

#### `updateBillingInfo(supabase, org_id, billingData): Promise<void>`
Update or create billing information for an organization.

#### `checkFeatureAccess(supabase, org_id): Promise<FeatureAccess>`
Get complete feature access permissions for an organization.

### Utility Functions

#### `isFeatureAvailable(supabase, org_id, feature): Promise<boolean>`
Check availability of a specific feature. More efficient than `checkFeatureAccess` when checking only one feature.

#### `mapStripeStatusToBillingStatus(stripeStatus): BillingStatus`
Map Stripe subscription statuses to our internal billing statuses.

## Feature Tiers

### Free Tier
- Max team size: 3 members
- RFID capture: ✅
- Data sync: ❌
- Data export: ❌
- Add team members: ✅

### Pro Tier
- Max team size: 50 members
- RFID capture: ✅
- Data sync: ✅
- Data export: ✅
- Add team members: ✅

## Usage Examples

### Check if organization can sync data
```typescript
const canSync = await isFeatureAvailable(supabase, orgId, 'sync')
if (!canSync) {
  // Show upgrade prompt
}
```

### Get full feature access
```typescript
const features = await checkFeatureAccess(supabase, orgId)
if (features.canExport) {
  // Enable export functionality
}
```

### Update billing after webhook
```typescript
const billingStatus = mapStripeStatusToBillingStatus(stripeSubscription.status)
await updateBillingInfo(supabase, orgId, { 
  billing_status: billingStatus,
  stripe_subscription_id: stripeSubscription.id
})
```

## Error Handling

All functions include comprehensive error handling:
- Input validation with clear error messages
- Database error handling with meaningful error propagation
- Graceful degradation (defaults to free tier on errors)
- Consistent error logging for debugging

## Security Considerations

- All functions validate input parameters
- Database queries use parameterized queries
- Feature access defaults to free tier permissions on errors
- No sensitive information logged in error messages

## Integration Points

### Webhook Handler
The webhook handler uses `mapStripeStatusToBillingStatus` to ensure consistent status mapping.

### Frontend Components
The billing page uses `getBillingInfo` and `checkFeatureAccess` to display current status and available features.

### Feature Gates
Throughout the app, use `isFeatureAvailable` or `checkFeatureAccess` to gate premium features.