"use client"

import { useState } from "react"

interface ClientInfo {
  name: string
  email: string
  phone: string
  notes: string
}

interface BookingFormProps {
  onSubmit: (clientInfo: ClientInfo) => void
  isSubmitting?: boolean
}

export default function BookingForm({ onSubmit, isSubmitting = false }: BookingFormProps) {
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name: "",
    email: "",
    phone: "",
    notes: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(clientInfo)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name *</label>
        <input
          type="text"
          required
          value={clientInfo.name}
          onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
          className="w-full p-3 border rounded-md"
          placeholder="Your full name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email *</label>
        <input
          type="email"
          required
          value={clientInfo.email}
          onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
          className="w-full p-3 border rounded-md"
          placeholder="Email address"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Phone *</label>
        <input
          type="tel"
          required
          value={clientInfo.phone}
          onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
          className="w-full p-3 border rounded-md"
          placeholder="Phone number"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          Special Requests (optional)
        </label>
        <textarea
          value={clientInfo.notes}
          onChange={(e) => setClientInfo({ ...clientInfo, notes: e.target.value })}
          className="w-full p-3 border rounded-md h-24"
          placeholder="Any special requests or notes for your provider..."
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary text-primary-foreground py-3 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Submitting request..." : "Submit pending request"}
      </button>
    </form>
  )
}
