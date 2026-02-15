import { NextRequest, NextResponse } from 'next/server'
import { checkBillingStatus } from '@/lib/billing'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    const status = await checkBillingStatus(orgId)
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error fetching billing status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing status' },
      { status: 500 }
    )
  }
}