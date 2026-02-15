import { Sidebar } from '@/components/sidebar'
import { OrganizationProvider } from '@/contexts/org-context'
import { createServerSupabaseClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSupabaseClient(cookies())
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <OrganizationProvider initialUser={user}>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 lg:pl-64 overflow-auto">
          <div className="p-4 pt-16 lg:pt-4">
            {children}
          </div>
        </main>
      </div>
    </OrganizationProvider>
  )
}