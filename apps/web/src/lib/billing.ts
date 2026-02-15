import { getBillingOrg } from './db'

export interface BillingStatus {
  isActive: boolean
  canSync: boolean
  canExport: boolean
  maxTeamSize: number
  currentTeamSize: number
  subscriptionStatus?: string
  currentPeriodEnd?: Date
}

export async function checkBillingStatus(orgId: string): Promise<BillingStatus> {
  const org = await getBillingOrg(orgId)
  
  if (!org) {
    return {
      isActive: false,
      canSync: false,
      canExport: false,
      maxTeamSize: 1,
      currentTeamSize: 0,
    }
  }

  const isActive = org.subscriptionStatus === 'active' || org.subscriptionStatus === 'trialing'
  
  return {
    isActive,
    canSync: isActive && org.features.sync,
    canExport: isActive && org.features.export,
    maxTeamSize: org.features.unlimitedTeamSize ? Infinity : (isActive ? 10 : 1),
    currentTeamSize: org.teamSize,
    subscriptionStatus: org.subscriptionStatus,
    currentPeriodEnd: org.currentPeriodEnd,
  }
}

export function canPerformAction(status: BillingStatus, action: 'sync' | 'export' | 'addTeamMember'): boolean {
  switch (action) {
    case 'sync':
      return status.canSync
    case 'export':
      return status.canExport
    case 'addTeamMember':
      return status.currentTeamSize < status.maxTeamSize
    default:
      return false
  }
}