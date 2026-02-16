'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Building2, 
  Users, 
  Package, 
  CreditCard, 
  LogOut,
  Menu,
  X,
  ChevronDown
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useOrganization } from '@/contexts/org-context'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

const navigation = [
  { name: 'Organizations', href: '/orgs', icon: Building2 },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Batches', href: '/batches', icon: Package },
  { name: 'Billing', href: '/billing', icon: CreditCard },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false)
  const { user, currentOrg, organizations, switchOrganization } = useOrganization()
  const supabase = createBrowserSupabaseClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Organization Selector */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <button
            onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
            className="w-full flex items-center justify-between p-2 text-sm font-medium text-foreground hover:bg-accent rounded-md"
          >
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span className="truncate">
                {currentOrg?.name || 'Select Organization'}
              </span>
            </div>
            <ChevronDown className="h-4 w-4" />
          </button>
          
          {isOrgDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    switchOrganization(org.id)
                    setIsOrgDropdownOpen(false)
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-accent',
                    currentOrg?.id === org.id && 'bg-accent'
                  )}
                >
                  {org.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-foreground">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-8 w-8"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-background border border-border shadow-md"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-25" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          className
        )}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-md hover:bg-accent"
        >
          <X className="h-5 w-5" />
        </button>

        <SidebarContent />
      </aside>

      {/* Click outside to close dropdown */}
      {isOrgDropdownOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setIsOrgDropdownOpen(false)}
        />
      )}
    </>
  )
}