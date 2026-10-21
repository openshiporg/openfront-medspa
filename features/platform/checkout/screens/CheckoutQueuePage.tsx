import type { ComponentType } from 'react';
import Link from 'next/link';
import { PlatformBreadcrumbs } from '@/features/platform/components/PlatformBreadcrumbs';
import { CalendarCheck, CreditCard, PackageCheck, ReceiptText, Scissors, ShoppingBag, Sparkles } from 'lucide-react';
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
  return new Date(value).toLocaleString('en-US', { timeZone, timeZoneName: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatCurrency(cents?: number | null) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100);
}

function formatEstimate(cents?: number | null) {
  return cents == null ? 'Not configured' : formatCurrency(cents);
}

export async function CheckoutQueuePage() {
  const { appointments, products, counts, loadError } = await getCheckoutQueue();

  return (
    <><PlatformBreadcrumbs items={[{ label: 'Checkout' }]} /><main className="min-h-screen bg-muted/20 px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border bg-background p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <ReceiptText className="h-3.5 w-3.5" />
                POS / checkout
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Checkout queue</h1>

            </div>

          </div>
        </header>

        {loadError ? (
          <section role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm leading-6 text-amber-950">
            <h2 className="font-semibold">Checkout queue unavailable</h2>
            <p className="mt-1">The queue could not be verified. No appointments or settlement totals are inferred; retry after access or service connectivity is restored.</p>
          </section>
        ) : appointments.length === 0 ? (
          <section className="rounded-2xl border bg-background p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <CalendarCheck className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">No appointments ready for checkout</h2>

          </section>
        ) : (
          <section className="grid gap-4">
            {appointments.map((appointment) => (
              <CheckoutCard key={appointment.id} appointment={appointment} products={products} />
            ))}
          </section>
        )}
      </div>
    </main></>
  );
}

export function CheckoutCard({ appointment, products }: { appointment: CheckoutAppointment; products: { id: string; name?: string | null; price?: number | null; quantity?: number | null; category?: string | null }[] }) {
  if (appointment.payment || appointment.transaction) return <RecordedCheckout appointment={appointment} />;
  const totals = calculateCheckoutTotals(appointment);
  const clientName = appointment.client?.user?.name || 'Client unavailable';
  const providerName = appointment.provider?.user?.name || 'Unassigned';
  const checkoutEligible = ['confirmed', 'in_progress'].includes(appointment.status || '') && !appointment.payment && !appointment.depositPaid && !appointment.benefitsUnavailable && totals.tax !== null;
  const blockedReasons = [
    !['confirmed', 'in_progress'].includes(appointment.status || '') && 'The appointment must be confirmed or checked in before checkout.',
    appointment.depositPaid && 'Recorded deposits need reconciliation before checkout.',
    appointment.benefitsUnavailable && 'Client benefits could not be verified. Reload the appointment.',
    totals.tax === null && 'Tax configuration is unavailable. Ask a practice manager to review it.',
  ].filter(Boolean);
  const packageOptions = getPackageRedemptionOptions(appointment);
  const membershipOptions = getMembershipDiscountOptions(appointment);

  return (
    <article className="rounded-2xl border bg-background p-5 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">
              {appointment.status?.replaceAll('_', ' ') || 'appointment'}
            </span>
            {appointment.depositPaid && (
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
                Deposit recorded · allocation blocked
              </span>
            )}
          </div>

          <h2 className="text-xl font-semibold tracking-tight">{clientName}</h2>
          <div className="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-4">
            <Info icon={CalendarCheck} label="When" value={formatTime(appointment.startTime, appointment.location?.timezone || 'UTC')} subvalue={`${appointment.duration || 60} min`} />
            <Info icon={Scissors} label="Provider" value={providerName} />
            <Info icon={CreditCard} label="Base service estimate" value={formatEstimate(totals.totalDue)} subvalue={`Tax ${formatEstimate(totals.tax)}`} />
            <Info icon={Sparkles} label="Commission est." value={formatEstimate(totals.commissionEstimate)} />
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border">
            <div className="grid grid-cols-[1fr_auto_auto] bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>Line item</span>
              <span>Staff</span>
              <span className="text-right">Amount</span>
            </div>
            {totals.lineItems.map((item) => (
              <div key={`${item.id}-${item.serviceId}`} className="grid grid-cols-[1fr_auto_auto] gap-3 border-t px-3 py-3 text-sm">
                <span className="font-medium">{item.serviceName}</span>
                <span className="text-muted-foreground">{item.staffName}</span>
                <span className="text-right tabular-nums">{formatCurrency(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
            <div className="grid gap-1 border-t bg-muted/20 px-3 py-3 text-sm">
              <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
              {membershipOptions.length > 0 && (
                <SummaryRow
                  label={`${membershipOptions[0].membership?.name || 'Membership'} discount available`}
                  value={`-${membershipOptions[0].membership?.discountPercent || 0}%`}
                />
              )}
              {packageOptions.length > 0 && (
                <SummaryRow
                  label={`${packageOptions[0].package?.name || 'Package'} credit available`}
                  value={formatCurrency(packageOptions[0].remainingValue)}
                />
              )}
              <SummaryRow label="Tax at configured rate" value={formatEstimate(totals.tax)} />
              <SummaryRow label="Base estimate before retail, discount, and tip" value={formatEstimate(totals.totalDue)} strong />
            </div>
          </div>
        </div>

        <aside className="xl:w-80">
          <form action={completeAppointmentCheckout} className="rounded-2xl border bg-muted/20 p-4">
            <input type="hidden" name="appointmentId" value={appointment.id} />
            <div className="text-sm font-semibold">Controlled cash checkout</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              This workflow records an operator-confirmed cash payment only. Card terminals and provider processing are external; no card or provider result is inferred here.
            </p>
            <div className="mt-3 grid gap-3">
              <input type="hidden" name="paymentMethod" value="cash" />
              {membershipOptions.length > 0 && (
                <label className="grid gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Membership discount
                  <select name="clientMembershipId" defaultValue="" className="h-10 rounded-lg border bg-background px-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Do not apply</option>
                    {membershipOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.membership?.name || 'Membership'} · {option.membership?.discountPercent || 0}% off
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {packageOptions.length > 0 && (
                <label className="grid gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Package credit
                  <select name="clientPackageId" defaultValue="" className="h-10 rounded-lg border bg-background px-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Do not redeem</option>
                    {packageOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.package?.name || 'Package'} · {formatCurrency(option.remainingValue)} left
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {products.length > 0 && (
                <div className="rounded-xl border bg-background p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Retail add-ons
                  </div>
                  <div className="grid gap-2">
                    {products.slice(0, 6).map((product) => (
                      <div key={product.id} className="grid grid-cols-[1fr_72px] items-center gap-2 text-sm">
                        <input type="hidden" name="retailProductId" value={product.id} />
                        <div className="min-w-0">
                          <span className="block truncate font-medium">{product.name}</span>
                          <span className="block text-xs text-muted-foreground">{formatCurrency(product.price || 0)} · {product.quantity || 0} in stock</span>
                        </div>
                        <input aria-label={`${product.name || 'Product'} quantity`} name="retailQuantity" type="number" min="0" max={product.quantity || 0} defaultValue="0" className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {appointment.benefitsUnavailable && (
                <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-950">Membership and package eligibility could not be verified. Checkout is disabled rather than hiding possible client benefits.</div>
              )}
              {appointment.depositPaid && (
                <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-950">A deposit is recorded, but deposit allocation and cancellation reconciliation are not available. Checkout is disabled.</div>
              )}
              {totals.tax === null && (
                <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-950">The configured tax rate is unavailable. A tax or total estimate cannot be shown and checkout is disabled.</div>
              )}
              {(membershipOptions.length > 0 || packageOptions.length > 0) && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                  <div className="mb-1 flex items-center gap-1.5 font-semibold">
                    <PackageCheck className="h-3.5 w-3.5" />
                    Benefits found
                  </div>
                  Apply an active membership or package before taking payment.
                </div>
              )}
              <MoneyInput name="tip" label="Tip" />
              <MoneyInput name="discount" label="Discount" />
              <label className="grid gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Discount reason (required if discount is used)
                <input name="discountReason" maxLength={1000} className="h-10 rounded-lg border bg-background px-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <p className="text-xs leading-5 text-muted-foreground">
                This base service estimate excludes selected retail, discounts, and tip. The controlled service revalidates current tax, benefit evidence, inventory, and payment eligibility before it writes anything.
              </p>
              {!checkoutEligible && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  {blockedReasons.join(' ')}
                </p>
              )}
              <button
                type="submit"
                disabled={!checkoutEligible}
                className="inline-flex items-center justify-center rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkoutEligible ? 'Record cash payment' : 'Checkout unavailable'}
              </button>
              <Link href={`/dashboard/platform/appointments/${appointment.id}`} className="inline-flex items-center justify-center rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
                Open appointment workflow
              </Link>
            </div>
          </form>
        </aside>
      </div>
    </article>
  );
}

function MoneyInput({ name, label }: { name: string; label: string }) {
  return (
    <label className="grid gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label} cents
      <input name={name} type="number" min="0" step="1" defaultValue="0" className="h-10 rounded-lg border bg-background px-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring" />
    </label>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function Info({ icon: Icon, label, value, subvalue }: { icon: ComponentType<{ className?: string }>; label: string; value: string; subvalue?: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-muted-foreground/80">{label}</div>
        <div className="truncate font-medium text-foreground">{value}</div>
        {subvalue && <div className="truncate text-xs text-muted-foreground">{subvalue}</div>}
      </div>
    </div>
  );
}

function RecordedCheckout({ appointment }: { appointment: CheckoutAppointment }) {
  const payment = appointment.payment;
  const lines = appointment.transaction?.lineItems || [];
  function amount(value: number | null | undefined) {
    if (!Number.isSafeInteger(value) || !payment?.currencyCode || !/^[A-Z]{3}$/.test(payment.currencyCode)) return 'Unavailable';
    if (payment.currencyCode !== 'USD') return `${value} ${payment.currencyCode} minor units (display scale unavailable)`;
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: payment.currencyCode }).format(Number(value) / 100); }
    catch { return 'Unavailable'; }
  }
  return <article className="grid gap-4 rounded-lg border bg-background p-5">
    <h2 className="text-lg font-semibold">Recorded checkout</h2>
    <p>{formatTime(appointment.startTime, appointment.location?.timezone || 'UTC')} · Appointment {appointment.id}</p>
    {payment ? <>
      <p>Payment {payment.id} · {payment.status?.replaceAll('_', ' ') || 'Status unavailable'} · {payment.paymentMethod || 'Tender unavailable'}</p>
      <dl className="grid grid-cols-2 gap-2 text-sm">{([['Subtotal', payment.subtotal], ['Discount', payment.discount], ['Tax', payment.tax], ['Tip', payment.tip], ['Original total', payment.totalAmount], ['Refunded', payment.refundedAmount]] as const).map(([label, value]) => <div className="contents" key={label}><dt>{label}</dt><dd className="text-right tabular-nums">{amount(value)}</dd></div>)}</dl>
      <Link className="inline-flex min-h-11 items-center underline" href={`/dashboard/payments/${payment.id}`}>Open payment record</Link>
    </> : <p role="status">A transaction exists, but its payment receipt is unavailable. No settlement amount is inferred.</p>}
    {appointment.transaction && <p className="break-all text-sm">Transaction {appointment.transaction.id}</p>}
    {lines.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="py-2 text-left">Accepted sale lines{lines.length > 100 ? ' — first 100; additional lines require review' : ''}</caption><thead><tr><th className="text-left">Item</th><th>Quantity</th><th className="text-right">Recorded net</th></tr></thead><tbody>{lines.slice(0, 100).map(line => <tr className="border-t" key={line.id}><td className="py-2">{typeof line.metadata?.title === 'string' ? line.metadata.title : 'Legacy title unavailable'}</td><td className="text-center">{line.quantity ?? 'Unavailable'}</td><td className="text-right">{line.quantity != null && line.unitPrice != null ? amount(line.quantity * line.unitPrice - (line.discount || 0)) : 'Unavailable'}</td></tr>)}</tbody></table></div> : <p>Accepted line snapshots are unavailable. Current catalog prices are not substituted.</p>}
  </article>;
}

export default CheckoutQueuePage;
