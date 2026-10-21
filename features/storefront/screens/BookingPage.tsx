"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Check, ChevronRight, ChevronLeft, Calendar as CalendarIcon, User, Clock, Mail, Phone, MessageSquare } from "lucide-react"
import { Service } from "../lib/data/services"
import { getProvidersForService, type Provider } from "../lib/data/providers"
import { createAppointment } from "../lib/data/appointments"
import { getAvailableTimeSlots, type BookingSlot } from "../lib/data/availability"
import { ServiceCard } from "../components/ServiceCard"
import { ProviderCard } from "../components/ProviderCard"
import { ProviderProfilesUnavailable } from "../components/ProviderProfilesUnavailable"
import { TimeSlotPicker } from "../components/TimeSlotPicker"
import { BookingStepIndicator } from "../components/BookingStepIndicator"

interface ClientInfo {
  name: string
  email: string
  phone: string
  notes: string
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

const STEPS = [
  { number: 1, title: "Service", description: "Choose service" },
  { number: 2, title: "Provider", description: "Pick your provider" },
  { number: 3, title: "Date & Time", description: "Select slot" },
  { number: 4, title: "Details", description: "Your information" }
]

interface BookingPageProps {
  initialServices?: Service[]
}

const EMPTY_SERVICES: Service[] = []

export function BookingPage({ initialServices = EMPTY_SERVICES }: BookingPageProps) {
  const searchParams = useSearchParams()
  const preselectedService = searchParams?.get("service") ?? null
  const preselectedProvider = searchParams?.get("provider") ?? null

  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<string | null>(preselectedService)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(preselectedProvider)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name: "",
    email: "",
    phone: "",
    notes: "",
  })

  // Data state
  const services = initialServices
  const [providers, setProviders] = useState<Provider[]>([])
  const [providerLoadStatus, setProviderLoadStatus] = useState<'idle' | 'loading' | 'loaded' | 'unavailable'>('idle')
  const [availableSlots, setAvailableSlots] = useState<BookingSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const bookingRequest = useRef<{ fingerprint: string; key: string } | null>(null)

  // Auto-advance to step 2 if service is preselected
  useEffect(() => {
    if (preselectedService && services.some((service) => service.id === preselectedService)) {
      setStep(2)
    }
  }, [preselectedService, services])

  // Auto-advance to step 2 if provider is preselected
  useEffect(() => {
    if (preselectedProvider && !preselectedService) {
      setStep(1)
    }
  }, [preselectedProvider, preselectedService])

  // Fetch providers when service is selected
  useEffect(() => {
    let cancelled = false

    async function fetchProviders() {
      if (!selectedService) {
        setProviders([])
        setProviderLoadStatus('idle')
        return
      }

      setProviders([])
      setProviderLoadStatus('loading')
      try {
        const result = await getProvidersForService(selectedService)
        if (cancelled) return
        if (result.status === 'unavailable') {
          setProviderLoadStatus('unavailable')
          return
        }
        setProviders(result.data)
        setProviderLoadStatus('loaded')
      } catch {
        if (cancelled) return
        setProviders([])
        setProviderLoadStatus('unavailable')
      }
    }
    void fetchProviders()
    return () => {
      cancelled = true
    }
  }, [selectedService])

  // Fetch available time slots when provider and date are selected
  useEffect(() => {
    let cancelled = false

    async function fetchSlots() {
      if (providerLoadStatus !== 'loaded' || !providers.some((item) => item.id === selectedProvider) || !selectedProvider || !selectedDate || !selectedService) {
        setAvailableSlots(current => current.length ? [] : current)
        setLoadingSlots(false)
        return
      }

      setLoadingSlots(true)
      try {
        const service = services.find((s) => s.id === selectedService)
        const duration = service?.baseDuration || 60
        const dateStr = localDateKey(selectedDate)
        const slots = await getAvailableTimeSlots(selectedProvider, dateStr, duration, selectedService)
        if (cancelled) return
        setAvailableSlots(slots)
        setSelectedTime((current) => current && slots.some((slot) => slot.startTime === current) ? current : null)
      } catch (err) {
        if (cancelled) return
        console.error("Failed to fetch time slots:", err)
        setAvailableSlots([])
      } finally {
        if (!cancelled) setLoadingSlots(false)
      }
    }
    fetchSlots()
    return () => {
      cancelled = true
    }
  }, [providerLoadStatus, providers, selectedProvider, selectedDate, selectedService, services])

  const service = services.find((s) => s.id === selectedService)
  const provider = providers.find((s) => s.id === selectedProvider)
  const selectedTimeLabel = availableSlots.find((slot) => slot.startTime === selectedTime)?.label || null

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId)
    setProviderLoadStatus('loading')
    setSelectedProvider(null)
    setSelectedDate(undefined)
    setSelectedTime(null)
    setAvailableSlots([])
    setStep(2)
    setError(null)
  }

  const handleProviderSelect = (providerId: string) => {
    if (providerLoadStatus !== 'loaded' || !providers.some((item) => item.id === providerId)) return
    setSelectedProvider(providerId)
    setSelectedDate(undefined)
    setSelectedTime(null)
    setAvailableSlots([])
    setStep(3)
    setError(null)
  }

  function handleDateSelect(date: Date | undefined) {
    setSelectedDate(current => current?.getTime() === date?.getTime() ? current : date)
    setSelectedTime(null)
    setAvailableSlots(current => current.length ? [] : current)
    setError(null)
  }

  const handleDateTimeConfirm = () => {
    if (providerLoadStatus === 'loaded' && provider && selectedDate && selectedTime) {
      setStep(4)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (providerLoadStatus !== 'loaded' || !selectedProvider || !providers.some((item) => item.id === selectedProvider)) {
      setError('Public provider profile data could not be confirmed. No appointment request was submitted.')
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      // The server returns an exact ISO instant in the medspa's timezone.
      const request = {
        startTime: selectedTime!,
        providerId: selectedProvider!,
        serviceIds: [selectedService!],
        clientName: clientInfo.name,
        clientEmail: clientInfo.email,
        clientPhone: clientInfo.phone,
        clientNotes: clientInfo.notes || undefined,
      }
      const fingerprint = JSON.stringify(request)
      const attempt = bookingRequest.current?.fingerprint === fingerprint
        ? bookingRequest.current
        : { fingerprint, key: crypto.randomUUID() }
      bookingRequest.current = attempt
      const result = await createAppointment({ ...request, idempotencyKey: attempt.key })

      if (result.appointment) {
        setBookingSuccess(true)
      } else {
        setError(result.error || "The appointment request was not accepted. Please review the selections and try again.")
      }
    } catch (err) {
      console.error("Booking error:", err)
      setError("An error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // Success screen
  if (bookingSuccess) {
    return (
      <div className="sf-page-pad">
        <div className="sf-container-narrow">
            <div className="sf-card p-8 text-center md:p-12">
              <div className="w-16 h-16 border border-[var(--sf-rule)] bg-[var(--sf-paper-2)] flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-[var(--sf-accent)]" />
              </div>
              <h1 className="sf-display text-[var(--sf-text-display-s)] mb-4">Request received.</h1>
              <p className="text-[var(--sf-text-md)] leading-relaxed text-[var(--sf-ink-2)] mb-8">
                The request is pending. Receipt does not establish appointment availability, clinical candidacy, provider authorization, or confirmation. Submitted contact: <span className="font-medium text-[var(--sf-ink)]">{clientInfo.email}</span>.
              </p>

              <div className="bg-[var(--sf-paper-2)] border border-[var(--sf-rule)] p-6 mb-8 text-left">
                <h2 className="font-medium text-[var(--sf-text-md)] mb-4">Appointment details</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-5 h-5 mt-0.5 text-[var(--sf-accent)]">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">{service?.name}</div>
                      <div className="text-[var(--sf-text-sm)] text-[var(--sf-ink-3)]">{service?.baseDuration} minutes · {service?.basePrice === 0 ? "No payment collected" : `$${service?.basePrice}`}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-5 h-5 mt-0.5 text-[var(--sf-accent)]">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">{provider?.user?.name}</div>
                      <div className="text-[var(--sf-text-sm)] text-[var(--sf-ink-3)]">Requested provider preference</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-5 h-5 mt-0.5 text-[var(--sf-accent)]">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {selectedDate?.toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })}
                      </div>
                      <div className="text-[var(--sf-text-sm)] text-[var(--sf-ink-3)]">{selectedTimeLabel}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/" className="sf-btn sf-btn-primary">
                  Back home
                </Link>
                <button type="button" onClick={() => window.location.reload()} className="sf-btn sf-btn-secondary">
                  Start another request
                </button>
              </div>
            </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sf-page-pad">
      <div className="sf-container max-w-3xl">
          <div className="mb-[var(--sf-space-lg)]">
            <h1 className="sf-display text-[var(--sf-text-display-s)] mb-3">Request an appointment</h1>

          </div>

          {/* Step Indicator */}
          <BookingStepIndicator currentStep={step} steps={STEPS} />

          {/* Error Message */}
          {error && (
            <div className="mb-6 border border-[color-mix(in_oklch,var(--sf-accent)_30%,var(--sf-rule))] bg-[var(--sf-accent-soft)] p-4 text-[var(--sf-text-sm)] text-[var(--sf-ink)]">
              {error}
            </div>
          )}

          <div className="sf-card p-[var(--sf-space-md)] md:p-[var(--sf-space-lg)]">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="sf-display text-[var(--sf-text-2xl)] mb-2">Select a service</h2>

                </div>
                {services.length === 0 ? (
                  <div role="status" className="border border-[var(--sf-rule)] bg-[var(--sf-paper-2)] p-6 text-[var(--sf-text-sm)] text-[var(--sf-ink-2)]">
                    No active public service is listed, so an appointment request cannot be submitted.
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {services.map((svc) => (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => handleServiceSelect(svc.id)}
                        className="text-left"
                      >
                        <ServiceCard service={svc} variant="compact" linked={false} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="sf-display text-[var(--sf-text-2xl)] mb-2">Choose a provider preference</h2>
                    <p className="text-[var(--sf-text-sm)] text-[var(--sf-ink-2)]">Profiles linked to the published {service?.name} listing. A profile does not establish credentials or authorization.</p>
                  </div>
                  <button type="button" onClick={() => setStep(1)} className="sf-link text-[var(--sf-text-sm)]">
                    Change service
                  </button>
                </div>
                {providerLoadStatus === 'loading' && <p role="status" className="text-[var(--sf-text-sm)] text-[var(--sf-ink-2)]">Loading public provider profiles…</p>}
                {providerLoadStatus === 'unavailable' && <ProviderProfilesUnavailable retryHref={selectedService ? `/book?service=${encodeURIComponent(selectedService)}` : '/book'} />}
                {providerLoadStatus === 'loaded' && providers.length === 0 && (
                  <p role="status" className="border border-dashed border-[var(--sf-rule)] p-4 text-[var(--sf-text-sm)] text-[var(--sf-ink-2)]">No public provider profiles are listed for this service. No provider preference can be selected here; this does not determine clinical qualification or appointment availability.</p>
                )}
                {providerLoadStatus === 'loaded' && providers.length > 0 && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {providers.map((providerProfile) => (
                      <button
                        key={providerProfile.id}
                        type="button"
                        onClick={() => handleProviderSelect(providerProfile.id)}
                        className="text-left"
                      >
                        <ProviderCard provider={providerProfile} variant="compact" linked={false} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="sf-display text-[var(--sf-text-2xl)] mb-2">Select date and time</h2>
                    <p className="text-[var(--sf-text-sm)] text-[var(--sf-ink-2)]">
                      Pick your preferred time with {provider?.user?.name}
                    </p>
                  </div>
                  <button type="button" onClick={() => setStep(2)} className="sf-link text-[var(--sf-text-sm)]">
                    Change provider
                  </button>
                </div>
                <TimeSlotPicker
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  selectedTime={selectedTime}
                  onTimeSelect={setSelectedTime}
                  availableSlots={availableSlots}
                  loadingSlots={loadingSlots}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleDateTimeConfirm}
                    disabled={!selectedDate || !selectedTime}
                    className="sf-btn sf-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="sf-display text-[var(--sf-text-2xl)] mb-2">Your information</h2>
                    <p className="text-[var(--sf-text-sm)] text-[var(--sf-ink-2)]">Contact details for request follow-up. Submission does not confirm an appointment.</p>
                  </div>
                  <button type="button" onClick={() => setStep(3)} className="sf-link text-[var(--sf-text-sm)]">
                    Change time
                  </button>
                </div>

                <div className="bg-[var(--sf-paper-2)] border border-[var(--sf-rule)] p-4">
                  <h3 className="font-medium mb-3">Request summary</h3>
                  <div className="space-y-2 text-[var(--sf-text-sm)]">
                    <div className="flex justify-between gap-4">
                      <span className="text-[var(--sf-ink-3)]">Service</span>
                      <span className="font-medium">{service?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--sf-ink-3)]">Provider preference</span>
                      <span className="font-medium">{provider?.user?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--sf-ink-3)]">Date</span>
                      <span className="font-medium">{selectedDate?.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--sf-ink-3)]">Time</span>
                      <span className="font-medium">{selectedTimeLabel}</span>
                    </div>
                    <div className="flex justify-between gap-4 pt-2 border-t border-[var(--sf-rule)]">
                      <span className="text-[var(--sf-ink-3)]">Payment</span>
                      <span className="text-right font-medium">No payment collected with this request</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="booking-name" className="block text-sm font-medium mb-2">
                      <span className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-[var(--sf-ink-3)]" />
                        Full Name *
                      </span>
                    </label>
                    <input
                      id="booking-name"
                      type="text"
                      required
                      value={clientInfo.name}
                      onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                      className="sf-input"
                      placeholder="Jane Doe"
                    />
                  </div>

                  <div>
                    <label htmlFor="booking-email" className="block text-sm font-medium mb-2">
                      <span className="flex items-center gap-2 mb-1">
                        <Mail className="h-4 w-4 text-[var(--sf-ink-3)]" />
                        Email Address *
                      </span>
                    </label>
                    <input
                      id="booking-email"
                      type="email"
                      required
                      value={clientInfo.email}
                      onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                      className="sf-input"
                      placeholder="Email address"
                    />
                  </div>

                  <div>
                    <label htmlFor="booking-phone" className="block text-sm font-medium mb-2">
                      <span className="flex items-center gap-2 mb-1">
                        <Phone className="h-4 w-4 text-[var(--sf-ink-3)]" />
                        Phone Number *
                      </span>
                    </label>
                    <input
                      id="booking-phone"
                      type="tel"
                      required
                      value={clientInfo.phone}
                      onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                      className="sf-input"
                      placeholder="Phone number"
                    />
                  </div>

                  <div>
                    <label htmlFor="booking-notes" className="block text-sm font-medium mb-2">
                      <span className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-4 w-4 text-[var(--sf-ink-3)]" />
                        Special Requests (Optional)
                      </span>
                    </label>
                    <textarea
                      id="booking-notes"
                      value={clientInfo.notes}
                      onChange={(e) => setClientInfo({ ...clientInfo, notes: e.target.value })}
                      className="sf-input min-h-[100px]"
                      placeholder="Any special requests or notes for your provider..."
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="sf-btn sf-btn-secondary"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="sf-btn sf-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="h-5 w-5 animate-spin border-b-2 border-white"></div>
                        Submitting request...
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        Submit pending request
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
      </div>
    </div>
  )
}
