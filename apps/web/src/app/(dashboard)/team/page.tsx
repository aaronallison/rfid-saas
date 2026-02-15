'use client'

import { useState, useEffect } from 'react'
import { Mail, UserPlus, Crown, Shield, User, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrganization } from '@/contexts/org-context'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { Database } from '@/lib/supabase'

type OrganizationMember = Database['public']['Tables']['organization_members']['Row'] & {
  profiles?: {
    email: string
  }
}

export default function TeamPage() {
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [isLoading, setIsLoading] = useState(true)
  const [isInviting, setIsInviting] = useState(false)
  const [error, setError] = useState('')
  
  const { currentOrg, userRole } = useOrganization()
  const supabase = createBrowserSupabaseClient()
  const isAdmin = userRole === 'owner' || userRole === 'admin'

  const fetchMembers = async () => {
    if (!currentOrg) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          profiles:user_id (
            email
          )
        `)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setMembers(data || [])
      }
    } catch (error) {
      setError('Failed to fetch team members')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentOrg) return

    setIsInviting(true)
    setError('')

    try {
      // Check if user is already a member or invited
      const { data: existing } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', currentOrg.id)
        .eq('invited_email', inviteEmail)
        .single()

      if (existing) {
        setError('User already invited or is a member')
        return
      }

      // Create invitation
      const { error: inviteError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: currentOrg.id,
          invited_email: inviteEmail,
          role: inviteRole,
          invited_at: new Date().toISOString(),
        })

      if (inviteError) {
        setError(inviteError.message)
        return
      }

      // TODO: Send email invitation here
      // For now, we'll just show a success message

      await fetchMembers()
      setInviteEmail('')
      setInviteRole('member')
      setShowInviteForm(false)
    } catch (error) {
      setError('Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!currentOrg || !confirm('Are you sure you want to remove this member?')) return

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)

      if (error) {
        setError(error.message)
      } else {
        await fetchMembers()
      }
    } catch (error) {
      setError('Failed to remove member')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  useEffect(() => {
    fetchMembers()
  }, [currentOrg])

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Please select an organization first</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Team</h1>
          <p className="text-muted-foreground">
            Manage members and permissions for {currentOrg.name}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowInviteForm(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      {showInviteForm && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Team Member</CardTitle>
            <CardDescription>
              Send an invitation to join {currentOrg.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="role" className="text-sm font-medium">
                  Role
                </label>
                <Select
                  id="role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
              
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <Button type="submit" disabled={isInviting}>
                  {isInviting ? 'Sending...' : 'Send Invitation'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowInviteForm(false)
                    setInviteEmail('')
                    setInviteRole('member')
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

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading team members...</p>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      {member.joined_at ? (
                        <User className="h-5 w-5 text-primary" />
                      ) : (
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">
                          {member.profiles?.email || member.invited_email}
                        </p>
                        {getRoleIcon(member.role)}
                        <span className="text-sm text-muted-foreground">
                          {getRoleLabel(member.role)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {member.joined_at 
                          ? `Joined ${formatDate(member.joined_at)}`
                          : `Invited ${formatDate(member.invited_at!)}`
                        }
                      </p>
                    </div>
                  </div>
                  
                  {isAdmin && member.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              {members.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No team members yet</p>
                  {isAdmin && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setShowInviteForm(true)}
                    >
                      Invite Your First Member
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}