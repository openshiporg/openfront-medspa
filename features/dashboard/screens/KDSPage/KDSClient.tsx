'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { gql, request } from 'graphql-request'

// Kitchen stations
const STATIONS = [
  { id: 'all', label: 'All Stations' },
  { id: 'grill', label: 'Grill' },
  { id: 'fryer', label: 'Fryer' },
  { id: 'salad', label: 'Salad' },
  { id: 'dessert', label: 'Dessert' },
  { id: 'bar', label: 'Bar' },
  { id: 'expo', label: 'Expo' },
]

interface OrderItem {
  id: string
  quantity: number
  specialInstructions: string | null
  courseNumber: number
  sentToKitchen: string | null
  menuItem: {
    id: string
    name: string
    kitchenStation: string
    prepTime: number
  } | null
}

interface Order {
  id: string
  orderNumber: string
  orderType: string
  status: string
  guestCount: number
  createdAt: string
  table: {
    id: string
    name: string
  } | null
  orderItems: OrderItem[]
}

// GraphQL query for orders with items
const GET_KITCHEN_ORDERS = gql`
  query GetKitchenOrders {
    restaurantOrders(
      where: {
        OR: [
          { status: { equals: "open" } }
          { status: { equals: "in_progress" } }
        ]
      }
      orderBy: { createdAt: asc }
    ) {
      id
      orderNumber
      orderType
      status
      guestCount
      createdAt
      table {
        id
        name
      }
      orderItems {
        id
        quantity
        specialInstructions
        courseNumber
        sentToKitchen
        menuItem {
          id
          name
          kitchenStation
          prepTime
        }
      }
    }
  }
`

// Mutation to bump (mark as ready) an item
const BUMP_ORDER_ITEM = gql`
  mutation BumpOrderItem($id: ID!, $data: OrderItemUpdateInput!) {
    updateOrderItem(where: { id: $id }, data: $data) {
      id
    }
  }
`

// Mutation to update order status
const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($id: ID!, $data: RestaurantOrderUpdateInput!) {
    updateRestaurantOrder(where: { id: $id }, data: $data) {
      id
      status
    }
  }
`

function formatTimeAgo(dateString: string, currentTime: number): string {
  const date = new Date(dateString)
  const diffMs = currentTime - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  return `${diffHours}h ${diffMins % 60}m ago`
}

function getTicketColor(minutes: number): string {
  if (minutes < 5) return 'bg-green-500/10 border-green-500/50'
  if (minutes < 10) return 'bg-yellow-500/10 border-yellow-500/50'
  return 'bg-red-500/10 border-red-500/50'
}

interface TicketCardProps {
  order: Order
  station: string
  onBump: (orderId: string, itemId: string) => void
  onCompleteOrder: (orderId: string) => void
  currentTime: number
}

function TicketCard({ order, station, onBump, onCompleteOrder, currentTime }: TicketCardProps) {
  const createdAt = new Date(order.createdAt)
  const diffMins = Math.floor((currentTime - createdAt.getTime()) / 60000)
  const ticketColor = getTicketColor(diffMins)

  // Filter items by station if specific station selected
  const filteredItems = station === 'all'
    ? order.orderItems
    : order.orderItems.filter(item => item.menuItem?.kitchenStation === station)

  if (filteredItems.length === 0) return null

  // Group items by course
  const itemsByCourse = filteredItems.reduce((acc, item) => {
    const course = item.courseNumber || 1
    if (!acc[course]) acc[course] = []
    acc[course].push(item)
    return acc
  }, {} as Record<number, OrderItem[]>)

  return (
    <Card className={`${ticketColor} border-2`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">
            #{order.orderNumber}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={order.orderType === 'dine_in' ? 'default' : 'secondary'}>
              {order.orderType === 'dine_in' ? 'Dine-in' : order.orderType === 'takeout' ? 'Takeout' : 'Delivery'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {order.table && (
            <span>Table: {order.table.name}</span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimeAgo(order.createdAt, currentTime)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {Object.entries(itemsByCourse).map(([course, items]) => (
          <div key={course} className="mb-3">
            {Object.keys(itemsByCourse).length > 1 && (
              <div className="text-xs font-semibold text-muted-foreground mb-1">
                Course {course}
              </div>
            )}
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-2 bg-background rounded-md"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {item.quantity}x {item.menuItem?.name || 'Unknown Item'}
                    </div>
                    {item.specialInstructions && (
                      <div className="text-sm text-orange-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        {item.specialInstructions}
                      </div>
                    )}
                    {station === 'all' && item.menuItem?.kitchenStation && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {item.menuItem.kitchenStation}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onBump(order.id, item.id)}
                    className="ml-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="mt-3 pt-3 border-t flex justify-end">
          <Button
            size="sm"
            variant="default"
            onClick={() => onCompleteOrder(order.id)}
          >
            Complete Order
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function KDSClient() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStation, setSelectedStation] = useState('all')
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const data = await request('/api/graphql', GET_KITCHEN_ORDERS)
      setOrders((data as any).restaurantOrders || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError('Failed to load orders')
    } finally {
      setCurrentTime(Date.now())
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleBump = async (orderId: string, itemId: string) => {
    try {
      await request('/api/graphql', BUMP_ORDER_ITEM, {
        id: itemId,
        data: {
          // Mark the item as sent to kitchen with current timestamp
          sentToKitchen: new Date().toISOString()
        }
      })

      // Remove the item from the local state
      setOrders(prev => prev.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            orderItems: order.orderItems.filter(item => item.id !== itemId)
          }
        }
        return order
      }).filter(order => order.orderItems.length > 0))
    } catch (err) {
      console.error('Error bumping item:', err)
    }
  }

  const handleCompleteOrder = async (orderId: string) => {
    try {
      await request('/api/graphql', UPDATE_ORDER_STATUS, {
        id: orderId,
        data: { status: 'ready' }
      })

      // Remove the order from local state
      setOrders(prev => prev.filter(order => order.id !== orderId))
    } catch (err) {
      console.error('Error completing order:', err)
    }
  }

  // Filter orders based on selected station
  const filteredOrders = orders.filter(order => {
    if (selectedStation === 'all') return true
    return order.orderItems.some(item => item.menuItem?.kitchenStation === selectedStation)
  })

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="w-full p-4 md:p-6">
      <Tabs value={selectedStation} onValueChange={setSelectedStation}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            {STATIONS.map(station => (
              <TabsTrigger key={station.id} value={station.id}>
                {station.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md">
            {error}
          </div>
        )}

        {STATIONS.map(station => (
          <TabsContent key={station.id} value={station.id} className="mt-0">
            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground">
                  No pending orders for {station.label.toLowerCase()}.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredOrders.map(order => (
                    <TicketCard
                      key={order.id}
                      order={order}
                      station={selectedStation}
                      onBump={handleBump}
                      onCompleteOrder={handleCompleteOrder}
                      currentTime={currentTime || new Date(order.createdAt).getTime()}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
