'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
} from '@/components/ui/dialog'
import { Plus, Minus, Trash2, Send, ShoppingCart } from 'lucide-react'
import { gql, request } from 'graphql-request'

// Types
interface Table {
  id: string
  name: string
  capacity: number
  status: string
}

interface MenuCategory {
  id: string
  name: string
}

interface MenuItem {
  id: string
  name: string
  price: string
  kitchenStation: string
  available: boolean
  category: {
    id: string
    name: string
  } | null
}

interface CartItem {
  menuItem: MenuItem
  quantity: number
  specialInstructions: string
  courseNumber: number
}

// GraphQL queries
const GET_TABLES = gql`
  query GetTables {
    tables(where: { status: { in: ["available", "occupied"] } }, orderBy: { name: asc }) {
      id
      name
      capacity
      status
    }
  }
`

const GET_MENU_CATEGORIES = gql`
  query GetMenuCategories {
    menuCategories(orderBy: { sortOrder: asc }) {
      id
      name
    }
  }
`

const GET_MENU_ITEMS = gql`
  query GetMenuItems($categoryId: ID) {
    menuItems(
      where: {
        available: { equals: true }
        category: { id: { equals: $categoryId } }
      }
      orderBy: { name: asc }
    ) {
      id
      name
      price
      kitchenStation
      available
      category {
        id
        name
      }
    }
  }
`

const GET_ALL_MENU_ITEMS = gql`
  query GetAllMenuItems {
    menuItems(
      where: { available: { equals: true } }
      orderBy: { name: asc }
    ) {
      id
      name
      price
      kitchenStation
      available
      category {
        id
        name
      }
    }
  }
`

const CREATE_ORDER = gql`
  mutation CreateOrder($data: RestaurantOrderCreateInput!) {
    createRestaurantOrder(data: $data) {
      id
      orderNumber
    }
  }
`

const CREATE_ORDER_ITEMS = gql`
  mutation CreateOrderItems($data: [OrderItemCreateInput!]!) {
    createOrderItems(data: $data) {
      id
    }
  }
`

function generateOrderNumber(): string {
  const now = new Date()
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, '')
  const timePart = now.getTime().toString().slice(-4)
  return `${datePart}-${timePart}`
}

export function POSClient() {
  // State
  const [tables, setTables] = useState<Table[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [orderType, setOrderType] = useState<string>('dine_in')
  const [guestCount, setGuestCount] = useState<number>(1)
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [specialInstructionsDialog, setSpecialInstructionsDialog] = useState<{
    open: boolean
    itemIndex: number
    instructions: string
  }>({ open: false, itemIndex: -1, instructions: '' })

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [tablesData, categoriesData, itemsData] = await Promise.all([
          request('/api/graphql', GET_TABLES),
          request('/api/graphql', GET_MENU_CATEGORIES),
          request('/api/graphql', GET_ALL_MENU_ITEMS),
        ])

        setTables((tablesData as any).tables || [])
        setCategories((categoriesData as any).menuCategories || [])
        setMenuItems((itemsData as any).menuItems || [])
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Fetch menu items by category
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        let data
        if (selectedCategory === 'all') {
          data = await request('/api/graphql', GET_ALL_MENU_ITEMS)
        } else {
          data = await request('/api/graphql', GET_MENU_ITEMS, {
            categoryId: selectedCategory,
          })
        }
        setMenuItems((data as any).menuItems || [])
      } catch (err) {
        console.error('Error fetching menu items:', err)
      }
    }

    fetchMenuItems()
  }, [selectedCategory])

  // Cart functions
  const addToCart = (menuItem: MenuItem) => {
    const existingIndex = cart.findIndex(
      (item) => item.menuItem.id === menuItem.id && item.specialInstructions === ''
    )

    if (existingIndex >= 0) {
      const newCart = [...cart]
      newCart[existingIndex].quantity += 1
      setCart(newCart)
    } else {
      setCart([
        ...cart,
        {
          menuItem,
          quantity: 1,
          specialInstructions: '',
          courseNumber: 1,
        },
      ])
    }
  }

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart]
    newCart[index].quantity += delta

    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1)
    }

    setCart(newCart)
  }

  const removeFromCart = (index: number) => {
    const newCart = [...cart]
    newCart.splice(index, 1)
    setCart(newCart)
  }

  const updateSpecialInstructions = (index: number, instructions: string) => {
    const newCart = [...cart]
    newCart[index].specialInstructions = instructions
    setCart(newCart)
  }

  const updateCourseNumber = (index: number, courseNumber: number) => {
    const newCart = [...cart]
    newCart[index].courseNumber = courseNumber
    setCart(newCart)
  }

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => {
    return sum + parseFloat(item.menuItem.price) * item.quantity
  }, 0)

  const tax = subtotal * 0.08 // 8% tax
  const total = subtotal + tax

  // Submit order
  const submitOrder = async () => {
    if (cart.length === 0) return
    if (orderType === 'dine_in' && !selectedTable) return

    try {
      setSubmitting(true)

      // Create the order
      const orderData: any = {
        orderNumber: generateOrderNumber(),
        orderType,
        status: 'open',
        guestCount,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
      }

      if (orderType === 'dine_in' && selectedTable) {
        orderData.table = { connect: { id: selectedTable } }
      }

      const orderResult = await request('/api/graphql', CREATE_ORDER, {
        data: orderData,
      })

      const orderId = (orderResult as any).createRestaurantOrder.id

      // Create order items
      const orderItemsData = cart.map((item) => ({
        quantity: item.quantity,
        price: item.menuItem.price,
        specialInstructions: item.specialInstructions || null,
        courseNumber: item.courseNumber,
        order: { connect: { id: orderId } },
        menuItem: { connect: { id: item.menuItem.id } },
      }))

      await request('/api/graphql', CREATE_ORDER_ITEMS, {
        data: orderItemsData,
      })

      // Reset cart and form
      setCart([])
      setSelectedTable('')
      setGuestCount(1)

      // Show success (you could add a toast here)
      alert(`Order ${orderData.orderNumber} created successfully!`)
    } catch (err) {
      console.error('Error creating order:', err)
      alert('Failed to create order. Please try again.')
    } finally {
      setSubmitting(false)
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
    <div className="flex h-[calc(100vh-200px)]">
      {/* Menu Section */}
      <div className="flex-1 p-4 overflow-hidden">
        {/* Category tabs */}
        <div className="mb-4">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Menu items grid */}
        <ScrollArea className="h-[calc(100%-60px)]">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {menuItems.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:bg-muted transition-colors"
                onClick={() => addToCart(item)}
              >
                <CardContent className="p-3">
                  <div className="font-medium text-sm truncate">{item.name}</div>
                  <div className="text-sm text-muted-foreground">
                    ${parseFloat(item.price).toFixed(2)}
                  </div>
                  {item.category && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {item.category.name}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Cart Section */}
      <div className="w-96 border-l flex flex-col">
        <Card className="flex-1 rounded-none border-0 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Current Order
              </CardTitle>
              <Badge variant="secondary">{cart.length} items</Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden flex flex-col">
            {/* Order settings */}
            <div className="space-y-3 mb-4">
              <div>
                <Label>Order Type</Label>
                <Select value={orderType} onValueChange={setOrderType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dine_in">Dine-in</SelectItem>
                    <SelectItem value="takeout">Takeout</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {orderType === 'dine_in' && (
                <div>
                  <Label>Table</Label>
                  <Select value={selectedTable} onValueChange={setSelectedTable}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select table" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          {table.name} (Cap: {table.capacity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Guest Count</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center">{guestCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setGuestCount(guestCount + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="my-2" />

            {/* Cart items */}
            <ScrollArea className="flex-1">
              {cart.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No items in cart
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item, index) => (
                    <div
                      key={`${item.menuItem.id}-${index}`}
                      className="p-2 bg-muted rounded-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {item.menuItem.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${parseFloat(item.menuItem.price).toFixed(2)} each
                          </div>
                          {item.specialInstructions && (
                            <div className="text-xs text-orange-600 mt-1">
                              Note: {item.specialInstructions}
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-medium">
                          ${(parseFloat(item.menuItem.price) * item.quantity).toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(index, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(index, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-1">
                          <Select
                            value={item.courseNumber.toString()}
                            onValueChange={(v) =>
                              updateCourseNumber(index, parseInt(v))
                            }
                          >
                            <SelectTrigger className="h-6 w-20 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Course 1</SelectItem>
                              <SelectItem value="2">Course 2</SelectItem>
                              <SelectItem value="3">Course 3</SelectItem>
                            </SelectContent>
                          </Select>

                          <Dialog
                            open={
                              specialInstructionsDialog.open &&
                              specialInstructionsDialog.itemIndex === index
                            }
                            onOpenChange={(open) => {
                              if (open) {
                                setSpecialInstructionsDialog({
                                  open: true,
                                  itemIndex: index,
                                  instructions: item.specialInstructions,
                                })
                              } else {
                                setSpecialInstructionsDialog({
                                  open: false,
                                  itemIndex: -1,
                                  instructions: '',
                                })
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <span className="text-xs">...</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Special Instructions</DialogTitle>
                              </DialogHeader>
                              <Textarea
                                placeholder="Add special instructions..."
                                value={specialInstructionsDialog.instructions}
                                onChange={(e) =>
                                  setSpecialInstructionsDialog((prev) => ({
                                    ...prev,
                                    instructions: e.target.value,
                                  }))
                                }
                              />
                              <Button
                                onClick={() => {
                                  updateSpecialInstructions(
                                    index,
                                    specialInstructionsDialog.instructions
                                  )
                                  setSpecialInstructionsDialog({
                                    open: false,
                                    itemIndex: -1,
                                    instructions: '',
                                  })
                                }}
                              >
                                Save
                              </Button>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => removeFromCart(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <Separator className="my-2" />

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Submit button */}
            <Button
              className="w-full mt-4"
              size="lg"
              onClick={submitOrder}
              disabled={cart.length === 0 || submitting || (orderType === 'dine_in' && !selectedTable)}
            >
              {submitting ? (
                'Creating Order...'
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send to Kitchen
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
