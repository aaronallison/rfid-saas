export type BillingStatus = 'trialing' | 'active' | 'past_due' | 'canceled'

export interface BillingInfo {
  org_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  billing_status: BillingStatus | null
  updated_at: string
}

export interface FeatureAccess {
  canSync: boolean
  canExport: boolean
  canAddTeamMembers: boolean
  maxTeamSize: number
  billingStatus: BillingStatus | null
}

export interface CheckoutRequest {
  org_id: string
}

export interface CheckoutResponse {
  url: string
}

export interface PortalRequest {
  org_id: string
}

export interface PortalResponse {
  url: string
}

export interface ApiError {
  error: string
}

export interface WebhookEvent {
  received: boolean
}

// Stripe webhook event types we handle
export type SupportedWebhookEventType = 
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_failed'
  | 'invoice.payment_succeeded'

export interface OrganizationRole {
  role: 'owner' | 'admin' | 'member'
}