import { ReceiptText } from 'lucide-react';
import { WorkflowUnavailable } from '@/features/platform/components/WorkflowUnavailable';
import { ErrorState, Notice, PageHeader, PillLink, PlatformPage, Track } from '@/features/platform/components/medspa-ui';
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
  const settled = checkout.status === 'loaded' && checkout.appointment.payment?.status === 'completed';

  return (
    <PlatformPage breadcrumbs={[
      { label: 'Appointments', href: '/dashboard/platform/appointments' },
      { label: title, href: `/dashboard/platform/appointments/${appointmentId}` },
      { label: 'Checkout' },
    ]}>
      <PageHeader
        eyebrow="Checkout"
        title={title}
        icon={ReceiptText}
        actions={<Track><PillLink href="/dashboard/platform/checkout" variant="quiet">Queue</PillLink><PillLink href={`/dashboard/platform/appointments/${appointmentId}`}>Appointment</PillLink></Track>}
      />

      {checkoutNotice === 'failed' && <Notice role="alert" tone="amber" title="Checkout was not completed">Review the appointment and payment state before retrying.</Notice>}
      {checkoutNotice !== 'failed' && settled && <Notice tone="emerald" title="Payment recorded" />}

      {checkout.status === 'loaded' ? (
        <CheckoutCard appointment={checkout.appointment} products={checkout.products} />
      ) : checkout.status === 'request-failed' ? (
        <ErrorState id="checkout-load-failed" title="Checkout could not be loaded" action={<Track><PillLink href={`/dashboard/platform/checkout/${encodeURIComponent(appointmentId)}`}>Retry</PillLink><PillLink href="/dashboard/platform/checkout" variant="quiet">Checkout queue</PillLink></Track>} />
      ) : (
        <section role="status" className="rounded-[6px] border bg-background p-5 md:p-6">
          <h2 className="text-base font-semibold">Checkout unavailable</h2>
          <div className="mt-4"><Track><PillLink href="/dashboard/platform/checkout">Checkout queue</PillLink></Track></div>
        </section>
      )}
    </PlatformPage>
  );
}

export default AppointmentCheckoutWorkflowPage;
