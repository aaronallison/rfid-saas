// Simple in-memory storage for demo purposes
// In production, replace with actual database queries

interface BillingOrg {
  id: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  subscriptionStatus?: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
  currentPeriodEnd?: Date
  planId?: string
  teamSize: number
  features: {
    sync: boolean
    export: boolean
    unlimitedTeamSize: boolean
  }
}

// In-memory storage (replace with real database)
const billingOrgs = new Map<string, BillingOrg>()

// Initialize some demo data
billingOrgs.set('org_1', {
  id: 'org_1',
  teamSize: 1,
  features: {
    sync: false,
    export: false,
    unlimitedTeamSize: false
  }
})

export async function getBillingOrg(orgId: string): Promise<BillingOrg | null> {
  return billingOrgs.get(orgId) || null
}

export async function updateBillingOrg(orgId: string, updates: Partial<BillingOrg>): Promise<void> {
  const existing = billingOrgs.get(orgId)
  if (existing) {
    billingOrgs.set(orgId, { ...existing, ...updates })
  } else {
    billingOrgs.set(orgId, {
      id: orgId,
      teamSize: 1,
      features: {
        sync: false,
        export: false,
        unlimitedTeamSize: false
      },
      ...updates
    })
  }
}

export async function createBillingOrg(orgId: string, data: Partial<BillingOrg>): Promise<BillingOrg> {
  const org: BillingOrg = {
    id: orgId,
    teamSize: 1,
    features: {
      sync: false,
      export: false,
      unlimitedTeamSize: false
    },
    ...data
  }
  billingOrgs.set(orgId, org)
  return org
}