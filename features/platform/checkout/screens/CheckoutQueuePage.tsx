import { CalendarCheck, PackageCheck, ReceiptText, ShoppingBag } from 'lucide-react';
import {
  Avatar, Chip, EmptyState, ErrorState, Fact, MetricStrip, PageHeader, PillLink, PlatformPage,
  StatusDot, TitleStatus, Track, appointmentLabel, appointmentTone, humanize, inputClass, pillClass, statusTone, trackClass,
} from '@/features/platform/components/medspa-ui';
import {
  calculateCheckoutTotals,
  CheckoutAppointment,
  completeAppointmentCheckout,
  getCheckoutQueue,
  getMembershipDiscountOptions,
  getPackageRedemptionOptions,
} from '../actions/checkout';

function formatTime(value?: string | null, timeZone = 'UTC') {
  if (!value) return 'Unscheduled';
  return new Date(value).toLocaleString('en-US', { timeZone, timeZoneName: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatCurrency(cents?: number | null) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100);
}

function formatEstimate(cents?: number | null) {
  return cents == null ? 'Not configured' : formatCurrency(cents);
}

const fieldLabel = 'grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground';

export async function CheckoutQueuePage() {
  const { appointments, products, counts, loadError } = await getCheckoutQueue();

  return (
    <PlatformPage breadcrumbs={[{ label: 'Checkout' }]}>
      <PageHeader title="Checkout" icon={ReceiptText} />

      {loadError ? (
        <ErrorState id="checkout-unavailable" title="Checkout queue unavailable" message="The queue could not be loaded." action={<Track><PillLink href="/dashboard/platform/checkout">Retry</PillLink></Track>} />
      ) : (
        <>
          <MetricStrip items={[
            { label: 'Ready', value: counts.ready, tone: 'emerald' },
            { label: 'Checked in', value: counts.inProgress, tone: 'blue' },
            { label: 'Settled today', value: counts.completedToday, tone: 'zinc' },
            { label: 'Open transactions', value: counts.openTransactions, tone: 'amber' },
          ]} />
          {appointments.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No appointments ready for checkout" />
          ) : (
            <section aria-label="Checkout tickets" className="grid gap-4">
              {appointments.map((appointment) => (
                <CheckoutCard key={appointment.id} appointment={appointment} products={products} />
              ))}
            </section>
          )}
        </>
      )}
    </PlatformPage>
  );
}

export function CheckoutCard({ appointment, products }: { appointment: CheckoutAppointment; products: { id: string; name?: string | null; price?: number | null; quantity?: number | null; category?: string | null }[] }) {
  if (appointment.payment || appointment.transaction) return <RecordedCheckout appointment={appointment} />;
  const totals = calculateCheckoutTotals(appointment);
  const clientName = appointment.client?.user?.name || 'Client unavailable';
  const providerName = appointment.provider?.user?.name || 'Unassigned';
  const status = appointment.status || '';
  const checkoutEligible = ['confirmed', 'in_progress'].includes(status) && !appointment.payment && !appointment.depositPaid && !appointment.benefitsUnavailable && totals.tax !== null;
  const blockedReasons = [
    !['confirmed', 'in_progress'].includes(status) && 'Confirm or check in the appointment first.',
    appointment.depositPaid && 'A recorded deposit needs reconciliation first.',
    appointment.benefitsUnavailable && 'Client benefits could not be verified. Reload the appointment.',
    totals.tax === null && 'Set a tax rate in Storefront settings.',
  ].filter((reason): reason is string => Boolean(reason));
  const packageOptions = getPackageRedemptionOptions(appointment);
  const membershipOptions = getMembershipDiscountOptions(appointment);

  return (
    <article className="grid min-w-0 overflow-hidden rounded-2xl border bg-background xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <Avatar name={clientName} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h2 className="min-w-0 truncate text-lg font-semibold">{clientName}</h2>
              <TitleStatus tone={appointmentTone[status] || 'zinc'}>{appointmentLabel[status] || humanize(status)}</TitleStatus>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{formatTime(appointment.startTime, appointment.location?.timezone || 'UTC')} · {appointment.duration || 60} min · {providerName}</p>
          </div>
        </div>

        {appointment.depositPaid ? <div className="mt-3"><Chip tone="amber">Deposit recorded</Chip></div> : null}

        <div className="mt-5 overflow-hidden rounded-xl border">
          <ul className="divide-y">
            {totals.lineItems.map((item) => (
              <li key={`${item.id}-${item.serviceId}`} className="flex items-start justify-between gap-3 px-3 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.serviceName}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.staffName}{item.quantity > 1 ? ` · ×${item.quantity}` : ''}</span>
                </span>
                <span className="shrink-0 tabular-nums">{formatCurrency(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="grid gap-1.5 border-t bg-muted/30 px-3 py-3 text-sm">
            <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
            {membershipOptions.length > 0 && <SummaryRow label={`${membershipOptions[0].membership?.name || 'Membership'} discount`} value={`-${membershipOptions[0].membership?.discountPercent || 0}%`} />}
            {packageOptions.length > 0 && <SummaryRow label={`${packageOptions[0].package?.name || 'Package'} credit`} value={formatCurrency(packageOptions[0].remainingValue)} />}
            <SummaryRow label="Tax" value={formatEstimate(totals.tax)} />
            <SummaryRow label="Treatment total" value={formatEstimate(totals.totalDue)} strong />
            <SummaryRow label="Commission estimate" value={formatEstimate(totals.commissionEstimate)} />
          </dl>
        </div>
      </div>

      <aside className="min-w-0 border-t bg-muted/20 p-4 md:p-5 xl:border-l xl:border-t-0">
        <form action={completeAppointmentCheckout} className="grid min-w-0 gap-3">
          <input type="hidden" name="appointmentId" value={appointment.id} />
          <input type="hidden" name="paymentMethod" value="cash" />
          <h3 className="text-sm font-semibold">Record cash payment</h3>

          {(membershipOptions.length > 0 || packageOptions.length > 0) && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"><PackageCheck className="size-3.5" /> Benefits available</p>
          )}
          {membershipOptions.length > 0 && (
            <label className={fieldLabel}>
              Membership discount
              <select name="clientMembershipId" defaultValue="" className={inputClass}>
                <option value="">Do not apply</option>
                {membershipOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.membership?.name || 'Membership'} · {option.membership?.discountPercent || 0}% off</option>
                ))}
              </select>
            </label>
          )}
          {packageOptions.length > 0 && (
            <label className={fieldLabel}>
              Package credit
              <select name="clientPackageId" defaultValue="" className={inputClass}>
                <option value="">Do not redeem</option>
                {packageOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.package?.name || 'Package'} · {formatCurrency(option.remainingValue)} left</option>
                ))}
              </select>
            </label>
          )}
          {products.length > 0 && (
            <fieldset className="grid min-w-0 gap-2 rounded-xl border bg-background p-3">
              <legend className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground"><ShoppingBag className="size-3.5" /> Retail add-ons</legend>
              {products.slice(0, 6).map((product) => (
                <div key={product.id} className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-2 text-sm">
                  <input type="hidden" name="retailProductId" value={product.id} />
                  <div className="min-w-0">
                    <span className="block truncate font-medium">{product.name}</span>
                    <span className="block text-xs text-muted-foreground">{formatCurrency(product.price || 0)} · {product.quantity || 0} in stock</span>
                  </div>
                  <input aria-label={`${product.name || 'Product'} quantity`} name="retailQuantity" type="number" min="0" max={product.quantity || 0} defaultValue="0" className="h-9 w-full min-w-0 rounded-lg border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
              ))}
            </fieldset>
          )}
          <div className="grid grid-cols-2 gap-2">
            <MoneyInput name="tip" label="Tip" />
            <MoneyInput name="discount" label="Discount" />
          </div>
          <label className={fieldLabel}>
            Discount reason
            <input name="discountReason" maxLength={1000} className={inputClass} />
          </label>

          {!checkoutEligible && blockedReasons.length > 0 && (
            <ul role="status" className="grid gap-1.5 text-xs text-amber-800 dark:text-amber-300">
              {blockedReasons.map((reason) => <li key={reason} className="flex items-start gap-1.5"><StatusDot tone="amber" className="mt-1" />{reason}</li>)}
            </ul>
          )}

          <div className={`${trackClass} w-fit flex-wrap`}>
            <button type="submit" disabled={!checkoutEligible} className={pillClass('primary')}>
              {checkoutEligible ? 'Record cash payment' : 'Checkout unavailable'}
            </button>
            <PillLink href={`/dashboard/platform/appointments/${appointment.id}`} variant="quiet">Appointment</PillLink>
          </div>
        </form>
      </aside>
    </article>
  );
}

function MoneyInput({ name, label }: { name: string; label: string }) {
  return (
    <label className={fieldLabel}>
      {label} (cents)
      <input name={name} type="number" min="0" step="1" defaultValue="0" className={inputClass} />
    </label>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? 'border-t pt-1.5 font-semibold text-foreground' : 'text-muted-foreground'}`}>
      <dt className="min-w-0 truncate">{label}</dt>
      <dd className="shrink-0 tabular-nums">{value}</dd>
    </div>
  );
}

function RecordedCheckout({ appointment }: { appointment: CheckoutAppointment }) {
  const payment = appointment.payment;
  const lines = appointment.transaction?.lineItems || [];
  function amount(value: number | null | undefined) {
    if (!Number.isSafeInteger(value) || !payment?.currencyCode || !/^[A-Z]{3}$/.test(payment.currencyCode)) return 'Unavailable';
    if (payment.currencyCode !== 'USD') return `${value} ${payment.currencyCode} minor units`;
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: payment.currencyCode }).format(Number(value) / 100); }
    catch { return 'Unavailable'; }
  }
  const clientName = appointment.client?.user?.name || 'Client unavailable';
  return (
    <article className="grid min-w-0 gap-4 rounded-2xl border bg-background p-4 md:p-5">
      <div className="flex items-start gap-3">
        <Avatar name={clientName} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="min-w-0 truncate text-lg font-semibold">{clientName}</h2>
            <TitleStatus tone={payment ? statusTone(payment.status) : 'amber'}>{payment ? humanize(payment.status) : 'Receipt unavailable'}</TitleStatus>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{formatTime(appointment.startTime, appointment.location?.timezone || 'UTC')}</p>
        </div>
        {payment ? <Track><PillLink href={`/dashboard/payments/${payment.id}`} size="sm">Payment record</PillLink></Track> : null}
      </div>
      {payment ? (
        <dl className="grid grid-cols-2 gap-3 rounded-xl border p-3 sm:grid-cols-3">
          <Fact label="Tender">{payment.paymentMethod || 'Unavailable'}</Fact>
          {([['Subtotal', payment.subtotal], ['Discount', payment.discount], ['Tax', payment.tax], ['Tip', payment.tip], ['Total', payment.totalAmount], ['Refunded', payment.refundedAmount]] as const).map(([label, value]) => <Fact key={label} label={label}><span className="tabular-nums">{amount(value)}</span></Fact>)}
        </dl>
      ) : <p role="status" className="text-sm text-muted-foreground">Transaction recorded; payment receipt unavailable.</p>}
      {lines.length ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[22rem] text-sm">
            <caption className="sr-only">Sale lines</caption>
            <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-3 py-2 text-left font-medium">Item</th><th className="px-3 py-2 text-center font-medium">Qty</th><th className="px-3 py-2 text-right font-medium">Net</th></tr></thead>
            <tbody>{lines.slice(0, 100).map(line => <tr className="border-t" key={line.id}><td className="px-3 py-2">{typeof line.metadata?.title === 'string' ? line.metadata.title : 'Title unavailable'}</td><td className="px-3 py-2 text-center tabular-nums">{line.quantity ?? '—'}</td><td className="px-3 py-2 text-right tabular-nums">{line.quantity != null && line.unitPrice != null ? amount(line.quantity * line.unitPrice - (line.discount || 0)) : 'Unavailable'}</td></tr>)}</tbody>
          </table>
          {lines.length > 100 ? <p className="border-t px-3 py-2 text-xs text-muted-foreground">First 100 lines shown</p> : null}
        </div>
      ) : <p className="text-sm text-muted-foreground">Sale lines unavailable.</p>}
      {appointment.transaction && <p className="break-all text-xs text-muted-foreground">Transaction {appointment.transaction.id}</p>}
    </article>
  );
}

export default CheckoutQueuePage;
