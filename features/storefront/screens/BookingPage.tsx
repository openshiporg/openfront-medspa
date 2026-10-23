"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { Service } from "../lib/data/services"
import { getProvidersForService, type Provider } from "../lib/data/providers"
import { createAppointment } from "../lib/data/appointments"
import { getAvailableTimeSlots, type BookingSlot } from "../lib/data/availability"
import { ProviderProfilesUnavailable } from "../components/ProviderProfilesUnavailable"
import { TimeSlotPicker } from "../components/TimeSlotPicker"
import { BookingStepIndicator } from "../components/BookingStepIndicator"
import { Dot, Lens, Status, StateCard } from "../components/ui/primitives"
import { getStorefrontImageSrc } from "../lib/images"
import { formatDuration, formatPrice } from "../lib/format"

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
  { number: 1, title: "Treatment" },
  { number: 2, title: "Provider" },
  { number: 3, title: "Time" },
  { number: 4, title: "Details" },
]

interface BookingPageProps {
  initialServices?: Service[]
}

const EMPTY_SERVICES: Service[] = []

function groupByCategory(services: Service[]) {
  const groups = new Map<string, { name: string; services: Service[] }>()
  for (const service of services) {
    const key = service.category?.id || "other"
    const group = groups.get(key) || { name: service.category?.name || "Other", services: [] }
    group.services.push(service)
    groups.set(key, group)
  }
  return [...groups.entries()].map(([id, group]) => ({ id, ...group }))
}

export function BookingPage({ initialServices = EMPTY_SERVICES }: BookingPageProps) {
  const searchParams = useSearchParams()
  const preselectedService = searchParams?.get("service") ?? null
  const preselectedProvider = searchParams?.get("provider") ?? null

  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<string | null>(preselectedService)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(preselectedProvider)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [clientInfo, setClientInfo] = useState<ClientInfo>({ name: "", email: "", phone: "", notes: "" })

  const services = initialServices
  const [providers, setProviders] = useState<Provider[]>([])
  const [providerLoadStatus, setProviderLoadStatus] = useState<'idle' | 'loading' | 'loaded' | 'unavailable'>('idle')
  const [availableSlots, setAvailableSlots] = useState<BookingSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const bookingRequest = useRef<{ fingerprint: string; key: string } | null>(null)

  // Skip to provider choice when a known treatment is preselected.
  useEffect(() => {
    if (preselectedService && services.some((service) => service.id === preselectedService)) {
      setStep(2)
    }
  }, [preselectedService, services])

  useEffect(() => {
    if (preselectedProvider && !preselectedService) {
      setStep(1)
    }
  }, [preselectedProvider, preselectedService])

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
  const orderedProviders = preselectedProvider
    ? [...providers].sort((a, b) => Number(b.id === preselectedProvider) - Number(a.id === preselectedProvider))
    : providers
  const dateLabel = selectedDate?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

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
      setError('This provider is no longer available. Choose another provider.')
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      // The server returns an exact ISO instant in the practice's timezone.
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
        setError(result.error || "The request wasn't accepted. Review your selections and try again.")
      }
    } catch (err) {
      console.error("Booking error:", err)
      setError("Something went wrong. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const ticket = (
    <aside className="sf-ticket" aria-label="Your visit">
      <div className="sf-card grid gap-4 p-[var(--sf-space-md)]">
        <p className="sf-eyebrow">Your visit</p>
        <dl>
          <div className="sf-ticket-row"><dt>Treatment</dt><dd>{service?.name || "—"}</dd></div>
          <div className="sf-ticket-row"><dt>Provider</dt><dd>{provider?.user?.name || "—"}</dd></div>
          <div className="sf-ticket-row"><dt>Date</dt><dd>{dateLabel || "—"}</dd></div>
          <div className="sf-ticket-row"><dt>Time</dt><dd className="sf-num">{selectedTimeLabel || "—"}</dd></div>
          <div className="sf-ticket-row"><dt>Duration</dt><dd className="sf-num">{service ? formatDuration(service.baseDuration) : "—"}</dd></div>
          <div className="sf-ticket-row"><dt>Price</dt><dd className="sf-num">{service ? formatPrice(service.basePrice) : "—"}</dd></div>
        </dl>
        <p className="flex items-center gap-2 text-[length:var(--sf-text-xs)] text-[var(--sf-ink-3)]"><Dot tone="off" />No payment taken now</p>
      </div>
    </aside>
  )

  if (bookingSuccess) {
    return (
      <div className="sf-container-narrow sf-page-pad">
        <section className="grid justify-items-start gap-[var(--sf-space-md)]" aria-labelledby="booking-done">
          <span className="sf-lens sf-dew grid w-20 place-items-center text-[var(--sf-accent)]" aria-hidden="true"><Check className="size-8" /></span>
          <div className="sf-title-line">
            <h1 id="booking-done" className="sf-display text-[length:var(--sf-text-display-s)]">Request sent</h1>
            <Status tone="wait">Awaiting confirmation</Status>
          </div>
          <p className="text-[length:var(--sf-text-md)] text-[var(--sf-ink-2)]">Updates go to <span className="font-medium text-[var(--sf-ink)]">{clientInfo.email}</span></p>
          <div className="w-full">{ticket}</div>
          <div className="sf-track">
            <Link href="/account" className="sf-pill sf-pill-primary">My appointments</Link>
            <button type="button" onClick={() => window.location.reload()} className="sf-pill">Book another</button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="sf-container sf-page-pad">
      <header className="mb-[var(--sf-space-lg)] grid gap-4">
        <p className="sf-eyebrow">Book</p>
        <h1 className="sf-display text-[length:var(--sf-text-display-s)]">Book an appointment</h1>
      </header>

      <BookingStepIndicator currentStep={step} steps={STEPS} onStepSelect={setStep} />

      <div className="sf-book-grid">
        <div className="grid min-w-0 gap-[var(--sf-space-md)]">
          {error ? <div role="alert" className="sf-alert"><Dot tone="stop" /><span>{error}</span></div> : null}

          {step === 1 && (
            <section aria-labelledby="step-treatment" className="grid gap-[var(--sf-space-md)]">
              <h2 id="step-treatment" className="sf-display text-[length:var(--sf-text-2xl)]">Choose a treatment</h2>
              {services.length === 0 ? (
                <StateCard title="No treatments open for booking" action={<div className="sf-track"><Link href="/contact" className="sf-pill">Contact the practice</Link></div>} />
              ) : groupByCategory(services).map((group) => (
                <div key={group.id} className="grid gap-2.5">
                  <p className="sf-eyebrow">{group.name}</p>
                  {group.services.map((svc) => (
                    <button key={svc.id} type="button" className="sf-option" aria-pressed={svc.id === selectedService} onClick={() => handleServiceSelect(svc.id)}>
                      <Lens src={getStorefrontImageSrc(svc.image)} alt="" name={svc.name} />
                      <span className="min-w-0">
                        <span className="sf-display block text-[length:var(--sf-text-lg)] leading-tight">{svc.name}</span>
                        <span className="sf-num mt-1 block text-[length:var(--sf-text-xs)] text-[var(--sf-ink-3)]">{formatDuration(svc.baseDuration)}</span>
                      </span>
                      <span className="sf-num text-[length:var(--sf-text-sm)]">{formatPrice(svc.basePrice)}</span>
                    </button>
                  ))}
                </div>
              ))}
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="step-provider" className="grid gap-[var(--sf-space-md)]">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="step-provider" className="sf-display text-[length:var(--sf-text-2xl)]">Choose a provider</h2>
                <div className="sf-track"><button type="button" onClick={() => setStep(1)} className="sf-pill sf-pill-sm"><ArrowLeft />Treatment</button></div>
              </div>
              {providerLoadStatus === 'loading' && <p role="status" className="flex items-center gap-3 text-[length:var(--sf-text-sm)] text-[var(--sf-ink-2)]"><span className="sf-spinner" aria-hidden="true" />Loading providers</p>}
              {providerLoadStatus === 'unavailable' && <ProviderProfilesUnavailable retryHref={selectedService ? `/book?service=${encodeURIComponent(selectedService)}` : '/book'} />}
              {providerLoadStatus === 'loaded' && providers.length === 0 && (
                <StateCard title="No providers offer this online" action={<div className="sf-track"><button type="button" onClick={() => setStep(1)} className="sf-pill">Choose another treatment</button><Link href="/contact" className="sf-pill">Contact</Link></div>} />
              )}
              {providerLoadStatus === 'loaded' && providers.length > 0 && (
                <div className="grid gap-2.5">
                  {orderedProviders.map((item) => {
                    const name = item.user?.name || "Provider"
                    return (
                      <button key={item.id} type="button" className="sf-option" aria-pressed={item.id === selectedProvider} onClick={() => handleProviderSelect(item.id)}>
                        <Lens src={getStorefrontImageSrc(item.photo)} alt="" name={name} />
                        <span className="min-w-0">
                          <span className="sf-display block truncate text-[length:var(--sf-text-lg)] leading-tight">{name}</span>
                          {item.specializations.length ? <span className="mt-1 block truncate text-[length:var(--sf-text-xs)] text-[var(--sf-ink-3)]">{item.specializations.slice(0, 3).map((value) => value.name).join(" · ")}</span> : null}
                        </span>
                        {item.id === preselectedProvider ? <Status tone="accent">Requested</Status> : <ArrowRight className="size-4 text-[var(--sf-ink-3)]" aria-hidden="true" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="step-time" className="grid gap-[var(--sf-space-md)]">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="step-time" className="sf-display text-[length:var(--sf-text-2xl)]">Pick a time</h2>
                <div className="sf-track"><button type="button" onClick={() => setStep(2)} className="sf-pill sf-pill-sm"><ArrowLeft />Provider</button></div>
              </div>
              <TimeSlotPicker
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                selectedTime={selectedTime}
                onTimeSelect={setSelectedTime}
                availableSlots={availableSlots}
                loadingSlots={loadingSlots}
              />
              <div className="sf-track self-start">
                <button type="button" onClick={handleDateTimeConfirm} disabled={!selectedDate || !selectedTime} className="sf-pill sf-pill-primary">
                  Continue<ArrowRight />
                </button>
              </div>
            </section>
          )}

          {step === 4 && (
            <form onSubmit={handleSubmit} aria-labelledby="step-details" className="grid gap-[var(--sf-space-md)]">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="step-details" className="sf-display text-[length:var(--sf-text-2xl)]">Your details</h2>
                <div className="sf-track"><button type="button" onClick={() => setStep(3)} className="sf-pill sf-pill-sm"><ArrowLeft />Time</button></div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label htmlFor="booking-name" className="sf-field sm:col-span-2">Full name
                  <input id="booking-name" type="text" required autoComplete="name" value={clientInfo.name} onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })} className="sf-input" />
                </label>
                <label htmlFor="booking-email" className="sf-field">Email
                  <input id="booking-email" type="email" required autoComplete="email" value={clientInfo.email} onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })} className="sf-input" />
                </label>
                <label htmlFor="booking-phone" className="sf-field">Phone
                  <input id="booking-phone" type="tel" required autoComplete="tel" value={clientInfo.phone} onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })} className="sf-input" />
                </label>
                <label htmlFor="booking-notes" className="sf-field sm:col-span-2">Notes for your provider <span className="font-normal text-[var(--sf-ink-3)]">Optional</span>
                  <textarea id="booking-notes" value={clientInfo.notes} onChange={(e) => setClientInfo({ ...clientInfo, notes: e.target.value })} className="sf-input" />
                </label>
              </div>

              <div className="sf-track self-start">
                <button type="submit" disabled={submitting} className="sf-pill sf-pill-primary">
                  {submitting ? <><span className="sf-spinner" aria-hidden="true" />Sending request</> : <><Check />Request appointment</>}
                </button>
              </div>
            </form>
          )}
        </div>

        {ticket}
      </div>
    </div>
  )
}
