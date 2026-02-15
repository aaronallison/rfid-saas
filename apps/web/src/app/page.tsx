import { createServerSupabaseClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = createServerSupabaseClient(cookies)
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect based on authentication status
  if (!user) {
    redirect('/login')
  }

  // If authenticated, redirect to dashboard
  redirect('/orgs')
}