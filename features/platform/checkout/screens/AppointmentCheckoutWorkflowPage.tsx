import Link from 'next/link';
import { AlertTriangle, CreditCard, ReceiptText } from 'lucide-react';
import { PlatformBreadcrumbs } from '@/features/platform/components/PlatformBreadcrumbs';
import { WorkflowUnavailable } from '@/features/platform/components/WorkflowUnavailable';
import { getAppointmentWorkflowDetail } from '@/features/platform/appointments/actions/appointmentWorkflow';
import { getCheckoutAppointment } from '../actions/checkout';
import { CheckoutCard } from './CheckoutQueuePage';

export async function AppointmentCheckoutWorkflowPage({ appointmentId, checkoutNotice }: { appointmentId: string; checkoutNotice?: 'completed' | 'failed' | null }) {
  const workflow = await getAppointmentWorkflowDetail(appointmentId);
  if (!workflow.appointment) return <WorkflowUnavailable flow="checkout" />;
  const checkout = await getCheckoutAppointment(appointmentId);

  const title = workflow.appointment.lineItems.map((item) => item.serviceTitle).filter(Boolean).join(', ')
    || workflow.appointment.services.map((service) => service.name).filter(Boolean).join(', ')
    || 'Appointment';

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-5 md:px-8 md:py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 md:gap-6">
        <PlatformBreadcrumbs items={[
          { label: 'Appointments', href: '/dashboard/platform/appointments' },
          { label: title, href: `/dashboard/platform/appointments/${appointmentId}` },
          { label: 'Checkout' },
        ]} />

        <header className="rounded-2xl border bg-background p-5 shadow-sm md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted"><ReceiptText className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Appointment checkout workflow</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-4xl">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Review operational totals, then use the controlled cash workflow. It revalidates appointment, treatment, benefits, inventory, and settlement conditions before any record is written.</p>
            </div>
          </div>
        </header>

        {(checkoutNotice === 'failed' || (checkout.status === 'loaded' && checkout.appointment.payment?.status === 'completed')) && (
          <section role={checkoutNotice === 'failed' ? 'alert' : 'status'} className={`rounded-xl border p-4 text-sm leading-6 ${checkoutNotice === 'failed' ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-emerald-300 bg-emerald-50 text-emerald-950'}`}>
            {checkoutNotice === 'failed'
              ? 'Review the appointment and its recorded payment state before retrying checkout. A navigation message does not establish the outcome of an earlier attempt.'
              : 'A completed settlement is recorded for this appointment.'}
          </section>
        )}

        {checkout.status === 'loaded' ? (
          <CheckoutCard appointment={checkout.appointment} products={checkout.products} />
        ) : (
          <section role={checkout.status === 'request-failed' ? 'alert' : 'status'} className="rounded-2xl border bg-background p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-3">
              {checkout.status === 'request-failed' && <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />}
              <div>
                <h2 className="font-semibold">{checkout.status === 'request-failed' ? 'Checkout details could not be loaded' : 'Checkout details are unavailable'}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {checkout.status === 'request-failed'
                    ? 'The checkout request failed before a result was confirmed. That does not establish whether the cause is access or service availability. No payment or settlement status is inferred.'
                    : 'No readable appointment detail was returned. This view does not determine why the record is unavailable. No payment or settlement status is inferred.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
                  {checkout.status === 'request-failed' && <a className="underline underline-offset-4" href={`/dashboard/platform/checkout/${encodeURIComponent(appointmentId)}`}>Retry loading details</a>}
                  <Link className="underline underline-offset-4" href="/dashboard/platform/checkout">Return to checkout queue</Link>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border bg-background p-4 shadow-sm md:p-5">
          <h2 className="flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4 text-muted-foreground" /> Manual and external boundary</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">This interface does not operate an external card terminal or expose provider payloads, references, or card data. The only available completion path is an operator-recorded cash payment through the server-controlled workflow; a displayed estimate is not a payment result.</p>
        </section>
      </div>
    </main>
  );
}

export default AppointmentCheckoutWorkflowPage;
