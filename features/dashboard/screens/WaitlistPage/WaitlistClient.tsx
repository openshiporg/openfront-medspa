'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus,
  Phone,
  Clock,
  User,
  Calendar,
  Bell,
  X,
  CheckCircle,
  RefreshCw,
} from 'lucide-react'
import { gql, request } from 'graphql-request'

interface WaitlistEntry {
  id: string
  client: {
    id: string
    name: string
    email: string
  } | null
  guestName: string | null
  guestPhone: string | null
  status: 'active' | 'notified' | 'converted' | 'removed'
  service: {
    id: string
    name: string
    baseDuration: number
  } | null
  preferredProviders: {
    id: string
    user: { name: string }
  }[]
  preferredTimeRange: string | null
  dateRangeStart: string | null
  dateRangeEnd: string | null
  isActive: boolean
  notifiedAt: string | null
  notes: string | null
  createdAt: string
}

interface Service {
  id: string
  name: string
  baseDuration: number
}

interface Provider {
  id: string
  user: { name: string }
  tier: string
}

const GET_WAITLIST_ENTRIES = gql`
  query GetWaitlistEntries {
    waitlistEntries(
      where: { isActive: { equals: true } }
      orderBy: { createdAt: asc }
    ) {
      id
      client {
        id
        name
        email
      }
      guestName
      guestPhone
      status
      service {
        id
        name
        baseDuration
      }
      preferredProviders {
        id
        user { name }
      }
      preferredTimeRange
      dateRangeStart
      dateRangeEnd
      isActive
      notifiedAt
      notes
      createdAt
    }
  }
`

const GET_SERVICES = gql`
  query GetServices {
    services(where: { status: { equals: active } }, orderBy: { name: asc }) {
      id
      name
      baseDuration
    }
  }
`

const GET_STYLISTS = gql`
  query GetProviders {
    providers(where: { isActive: { equals: true } }, orderBy: { user: { name: asc } }) {
      id
      user { name }
      tier
    }
  }
`

const JOIN_WAITLIST = gql`
  mutation JoinWaitlist(
    $guestName: String!
    $guestPhone: String
    $serviceId: ID!
    $preferredProviderIds: [ID!]
    $preferredTimeRange: String
    $notes: String
    $idempotencyKey: String!
  ) {
    joinWaitlist(
      guestName: $guestName
      guestPhone: $guestPhone
      serviceId: $serviceId
      preferredProviderIds: $preferredProviderIds
      preferredTimeRange: $preferredTimeRange
      notes: $notes
      idempotencyKey: $idempotencyKey
    ) {
      success
      waitlistEntryId
      error
    }
  }
`

const TRANSITION_WAITLIST_ENTRY = gql`
  mutation TransitionWaitlistEntry($id: ID!, $action: String!, $reason: String) {
    transitionWaitlistEntry(waitlistEntryId: $id, action: $action, reason: $reason) {
      success
      status
      error
    }
  }
`

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

export function WaitlistClient() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null)

  const [newEntry, setNewEntry] = useState({
    clientName: '',
    clientPhone: '',
    serviceId: '',
    providerIds: [] as string[],
    preferredTimeRange: '',
    notes: '',
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const [entriesData, servicesData, providersData] = await Promise.all([
        request('/api/graphql', GET_WAITLIST_ENTRIES),
        request('/api/graphql', GET_SERVICES),
        request('/api/graphql', GET_STYLISTS),
      ])

      setEntries((entriesData as any).waitlistEntries || [])
      setServices((servicesData as any).services || [])
      setProviders((providersData as any).providers || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleAddEntry = async () => {
    if (!newEntry.clientName || !newEntry.serviceId) return

    try {
      const result = await request<{ joinWaitlist: { success: boolean; error?: string | null } }>('/api/graphql', JOIN_WAITLIST, {
        guestName: newEntry.clientName,
        guestPhone: newEntry.clientPhone || null,
        serviceId: newEntry.serviceId,
        preferredProviderIds: newEntry.providerIds,
        preferredTimeRange: newEntry.preferredTimeRange || null,
        notes: newEntry.notes || null,
        idempotencyKey: crypto.randomUUID(),
      })
      if (!result.joinWaitlist.success) throw new Error(result.joinWaitlist.error || 'Waitlist request failed')

      setNewEntry({
        clientName: '',
        clientPhone: '',
        serviceId: '',
        providerIds: [],
        preferredTimeRange: '',
        notes: '',
      })
      setAddDialogOpen(false)
      fetchData()
    } catch (err) {
      console.error('Error creating waitlist entry:', err)
    }
  }

  const handleNotify = async (entry: WaitlistEntry) => {
    try {
      const result = await request<{ transitionWaitlistEntry: { success: boolean; error?: string | null } }>('/api/graphql', TRANSITION_WAITLIST_ENTRY, {
        id: entry.id,
        action: 'notify',
        reason: 'Availability notification sent from waitlist queue',
      })
      if (!result.transitionWaitlistEntry.success) throw new Error(result.transitionWaitlistEntry.error || 'Waitlist notification failed')
      fetchData()
    } catch (err) {
      console.error('Error notifying:', err)
    }
  }

  const handleConvertToAppointment = (entry: WaitlistEntry) => {
    const serviceParam = entry.service?.id ? `service=${entry.service.id}` : ''
    const providerParam = entry.preferredProviders?.[0]?.id
      ? `&provider=${entry.preferredProviders[0].id}`
      : ''
    window.location.href = `/book?${serviceParam}${providerParam}`
  }

  const handleRemove = async (entry: WaitlistEntry) => {
    if (!confirm('Remove this entry from the waitlist?')) return

    try {
      const result = await request<{ transitionWaitlistEntry: { success: boolean; error?: string | null } }>('/api/graphql', TRANSITION_WAITLIST_ENTRY, {
        id: entry.id,
        action: 'remove',
        reason: 'Removed from waitlist queue',
      })
      if (!result.transitionWaitlistEntry.success) throw new Error(result.transitionWaitlistEntry.error || 'Waitlist removal failed')
      fetchData()
    } catch (err) {
      console.error('Error removing entry:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{entries.length} waiting</Badge>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add to Waitlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to Waitlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Client Name *</Label>
                <Input
                  value={newEntry.clientName}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, clientName: e.target.value })
                  }
                  placeholder="Walk-in client name"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={newEntry.clientPhone}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, clientPhone: e.target.value })
                  }
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label>Service *</Label>
                <Select
                  value={newEntry.serviceId}
                  onValueChange={(v) =>
                    setNewEntry({ ...newEntry, serviceId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} ({service.baseDuration}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Preferred Provider</Label>
                <Select
                  value={newEntry.providerIds[0] || ''}
                  onValueChange={(v) =>
                    setNewEntry({ ...newEntry, providerIds: v ? [v] : [] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any available" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any available</SelectItem>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.user.name} ({provider.tier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Preferred Time</Label>
                <Select
                  value={newEntry.preferredTimeRange}
                  onValueChange={(v) =>
                    setNewEntry({ ...newEntry, preferredTimeRange: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Anytime" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Anytime</SelectItem>
                    <SelectItem value="morning">Morning (9am-12pm)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12pm-5pm)</SelectItem>
                    <SelectItem value="evening">Evening (5pm-8pm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={newEntry.notes}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, notes: e.target.value })
                  }
                  placeholder="Any special requests..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEntry}>Add to Waitlist</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No one waiting</h3>
            <p className="text-muted-foreground">
              Add walk-in clients to the waitlist as they arrive
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <Card key={entry.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {entry.client?.name || entry.guestName || 'Walk-in'}
                        </span>
                        {entry.notifiedAt && (
                          <Badge variant="outline" className="text-green-600">
                            <Bell className="h-3 w-3 mr-1" />
                            Notified
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(entry.createdAt)}
                        </span>
                        {entry.service && (
                          <span>{entry.service.name}</span>
                        )}
                        {entry.preferredTimeRange && (
                          <span className="capitalize">
                            {entry.preferredTimeRange}
                          </span>
                        )}
                      </div>
                      {entry.preferredProviders.length > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>
                            Prefers:{' '}
                            {entry.preferredProviders
                              .map((s) => s.user.name)
                              .join(', ')}
                          </span>
                        </div>
                      )}
                      {entry.notes && (
                        <div className="text-sm text-muted-foreground italic">
                          "{entry.notes}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!entry.notifiedAt && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleNotify(entry)}
                      >
                        <Bell className="h-4 w-4 mr-1" />
                        Notify
                      </Button>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleConvertToAppointment(entry)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Book
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(entry)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
