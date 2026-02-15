'use client'

import { useState } from 'react'
import { Plus, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrganization } from '@/contexts/org-context'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { generateSlug } from '@/lib/utils'

export default function OrganizationsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  
  const { organizations, refreshOrganizations, switchOrganization, user } = useOrganization()
  const supabase = createBrowserSupabaseClient()

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsCreating(true)
    setError('')

    try {
      const slug = generateSlug(orgName)
      
      // Check if slug already exists
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .single()

      if (existing) {
        setError('An organization with this name already exists')
        return
      }

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          slug: slug,
        })
        .select()
        .single()

      if (orgError) {
        setError(orgError.message)
        return
      }

      // Add user as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'owner',
          joined_at: new Date().toISOString(),
        })

      if (memberError) {
        setError(memberError.message)
        return
      }

      // Refresh organizations list
      await refreshOrganizations()
      
      // Switch to new organization
      switchOrganization(org.id)
      
      setOrgName('')
      setShowCreateForm(false)
    } catch (error) {
      setError('Failed to create organization')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">
            Select or create an organization to get started
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Organization
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Organization</CardTitle>
            <CardDescription>
              Start managing your RFID field captures in a new organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="orgName" className="text-sm font-medium">
                  Organization Name
                </label>
                <Input
                  id="orgName"
                  placeholder="Enter organization name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
              
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Organization'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false)
                    setOrgName('')
                    setError('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <Card
            key={org.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => switchOrganization(org.id)}
          >
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{org.name}</CardTitle>
                  <CardDescription>/{org.slug}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Click to switch to this organization
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {organizations.length === 0 && !showCreateForm && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No organizations yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first organization to start managing RFID captures
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Organization
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}