'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Package, Search, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrganization } from '@/contexts/org-context'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { Database } from '@/lib/supabase'

type Batch = Database['public']['Tables']['batches']['Row'] & {
  capture_count?: number
}

type BatchStatus = 'active' | 'completed' | 'archived'

interface FormErrors {
  name?: string
  general?: string
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [batchName, setBatchName] = useState('')
  const [batchDescription, setBatchDescription] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  
  const { currentOrg, user } = useOrganization()
  const supabase = createBrowserSupabaseClient()
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchBatches = async () => {
    if (!currentOrg) return

    setIsLoading(true)
    try {
      // Fetch batches with capture counts
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          captures (count)
        `)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        const batchesWithCounts = data?.map(batch => ({
          ...batch,
          capture_count: batch.captures?.[0]?.count || 0
        })) || []
        setBatches(batchesWithCounts)
        setFilteredBatches(batchesWithCounts)
      }
    } catch (error) {
      setError('Failed to fetch batches')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentOrg || !user) return

    setIsCreating(true)
    setError('')

    try {
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .insert({
          organization_id: currentOrg.id,
          name: batchName,
          description: batchDescription || null,
          created_by: user.id,
          status: 'active',
        })
        .select()
        .single()

      if (batchError) {
        setError(batchError.message)
        return
      }

      await fetchBatches()
      setBatchName('')
      setBatchDescription('')
      setShowCreateForm(false)
    } catch (error) {
      setError('Failed to create batch')
    } finally {
      setIsCreating(false)
    }
  }

  // Filter batches based on search and status
  useEffect(() => {
    let filtered = batches

    if (searchTerm) {
      filtered = filtered.filter(batch =>
        batch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(batch => batch.status === statusFilter)
    }

    setFilteredBatches(filtered)
  }, [batches, searchTerm, statusFilter])

  useEffect(() => {
    fetchBatches()
  }, [currentOrg])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

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
          <h1 className="text-3xl font-bold">Batches</h1>
          <p className="text-muted-foreground">
            Manage RFID capture batches for {currentOrg.name}
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Batch
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search batches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:w-48"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Batch</CardTitle>
            <CardDescription>
              Start a new RFID capture batch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="batchName" className="text-sm font-medium">
                  Batch Name
                </label>
                <Input
                  id="batchName"
                  placeholder="Enter batch name"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="batchDescription" className="text-sm font-medium">
                  Description (optional)
                </label>
                <Input
                  id="batchDescription"
                  placeholder="Enter batch description"
                  value={batchDescription}
                  onChange={(e) => setBatchDescription(e.target.value)}
                />
              </div>
              
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Batch'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false)
                    setBatchName('')
                    setBatchDescription('')
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

      {/* Batches List */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading batches...</p>
          </CardContent>
        </Card>
      ) : filteredBatches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {batches.length === 0 ? 'No batches yet' : 'No batches match your filters'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {batches.length === 0 
                ? 'Create your first batch to start capturing RFID data'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {batches.length === 0 && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Batch
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBatches.map((batch) => (
            <Link key={batch.id} href={`/batches/${batch.id}`}>
              <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg truncate">{batch.name}</CardTitle>
                        <CardDescription className="truncate">
                          {batch.description || 'No description'}
                        </CardDescription>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(batch.status)}`}>
                      {batch.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Captures</span>
                      <span className="font-medium">{batch.capture_count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">{formatDate(batch.created_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}