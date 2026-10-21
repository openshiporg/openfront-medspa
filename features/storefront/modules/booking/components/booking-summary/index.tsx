import { Service, Provider } from "@/features/storefront/lib/data"

interface BookingSummaryProps {
  service: Service | null
  provider: Provider | null
  date: string
  time: string | null
}

export default function BookingSummary({
  service,
  provider,
  date,
  time,
}: BookingSummaryProps) {
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins ? `${hours} hr ${mins} min` : `${hours} hr`
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="bg-muted/50 p-4 rounded-lg">
      <h3 className="font-medium mb-3">Request summary</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Service</span>
          <span>{service?.name || "Not selected"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Provider</span>
          <span>{provider?.user?.name || "Not selected"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date</span>
          <span>{date ? formatDate(date) : "Not selected"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Time</span>
          <span>{time || "Not selected"}</span>
        </div>
        {service && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span>{formatDuration(service.baseDuration)}</span>
            </div>
            <div className="flex justify-between gap-4 font-medium pt-2 border-t">
              <span>Payment</span>
              <span>{service.basePrice === 0 ? "Not required" : `$${service.basePrice}`}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
