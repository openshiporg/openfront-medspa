import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import { CalendarClock, CheckCircle2, CreditCard, FileCheck2, LockKeyhole, ShieldAlert, Stethoscope, UserRound } from 'lucide-react';
import { PlatformBreadcrumbs } from '@/features/platform/components/PlatformBreadcrumbs';
import { WorkflowUnavailable } from '@/features/platform/components/WorkflowUnavailable';
import { getAppointmentWorkflowDetail, type AppointmentWorkflowDetail } from '../actions/appointmentWorkflow';
import { AppointmentSchedulingPanel } from './AppointmentSchedulingPanel';

function formatDateTime(value?: string | null, timeZone = 'UTC') {
  if (!value) return 'Not scheduled';
  return new Date(value).toLocaleString('en-US', { timeZone, timeZoneName: 'short', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatCurrency(cents?: number | null) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100);
}

function titleCase(value?: string | null) {
  return value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Not recorded';
}

function needsClinicalReview(appointment: AppointmentWorkflowDetail) {
  return appointment.services.some((service) => service.requiresConsultation || service.requiresIntakeReview || service.staffAuthorizationRequired || service.requiresLotTraceability);
}

export async function AppointmentWorkflowPage({ appointmentId }: { appointmentId: string }) {
  const { appointment, capabilities, clinical } = await getAppointmentWorkflowDetail(appointmentId);
  if (!appointment) return <WorkflowUnavailable flow="appointment" />;
  if (capabilities.canSchedule && !capabilities.canManageClinical) return <main className="mx-auto grid max-w-3xl gap-4 p-4 md:p-8"><PlatformBreadcrumbs items={[{ label: 'Appointments', href: '/dashboard/platform/appointments' }, { label: 'Scheduling only' }]} /><AppointmentSchedulingPanel appointmentId={appointment.id} />{capabilities.canManageFinance && <Link className="text-sm underline" href={`/dashboard/platform/checkout/${appointment.id}`}>Open separately authorized finance workflow</Link>}<p className="text-sm text-muted-foreground">Scheduling authority does not disclose patient clinical history or grant treatment authority.</p></main>;

  const timeZone = appointment.location?.timezone || 'UTC';
  const clientName = appointment.client?.user?.name || 'Client context restricted';
  const serviceNames = appointment.lineItems.map((item) => item.serviceTitle).filter(Boolean).join(', ') || appointment.services.map((service) => service.name).filter(Boolean).join(', ') || 'No service line items';
  const clinicalRequired = needsClinicalReview(appointment);
  const checkoutOpen = !appointment.transaction && !appointment.payment && ['confirmed', 'in_progress'].includes(appointment.status || '');

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-5 md:px-8 md:py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 md:gap-6">
        <PlatformBreadcrumbs items={[
          { label: 'Appointments', href: '/dashboard/platform/appointments' },
          { label: serviceNames },
        ]} />

        <header className="rounded-2xl border bg-background p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                Appointment workflow
              </div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">{serviceNames}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{formatDateTime(appointment.startTime, timeZone)} · {appointment.duration || 0} minutes · {appointment.location?.name || 'Location not recorded'}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <span className="inline-flex items-center justify-center rounded-lg border bg-muted/40 px-3 py-2 text-sm font-medium">Appointment {titleCase(appointment.status)}</span>
              {capabilities.canManageFinance && <Link href={`/dashboard/platform/checkout/${appointment.id}`} className="inline-flex items-center justify-center rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90">
                {checkoutOpen ? 'Open checkout workflow' : 'Review checkout status'}
              </Link>}
            </div>
          </div>
        </header>

        {capabilities.canSchedule && <AppointmentSchedulingPanel appointmentId={appointment.id} />}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
          <div className="grid gap-4">
            <Panel title="Appointment lifecycle" icon={CalendarClock}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Lifecycle label="Booked" value={appointment.bookedAt ? formatDateTime(appointment.bookedAt, timeZone) : 'Timestamp not recorded'} active />
                <Lifecycle label="Confirmed" value={appointment.confirmedAt ? formatDateTime(appointment.confirmedAt, timeZone) : 'Not confirmed'} active={Boolean(appointment.confirmedAt)} />
                <Lifecycle label="Current state" value={titleCase(appointment.status)} active />
              </div>
              {appointment.cancelledAt && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">Cancelled {formatDateTime(appointment.cancelledAt, timeZone)}{appointment.cancellationReason ? ` · ${appointment.cancellationReason}` : ''}</p>}
            </Panel>

            <Panel title="Treatment prerequisites" icon={ShieldAlert}>
              {capabilities.canManageClinical && <Link href="/dashboard/platform/appointments/plans" className="mb-3 inline-block text-sm underline">Open consultation, approved-plan, booking and correction history</Link>}
              <div className="grid gap-3">
                {appointment.services.map((service) => {
                  const requirements = [
                    service.requiresConsultation && 'consultation',
                    service.requiresIntakeReview && 'current intake review',
                    service.staffAuthorizationRequired && 'provider authorization',
                    service.requiresLotTraceability && 'lot traceability when administered',
                  ].filter(Boolean);
                  return (
                    <div key={service.id} className="rounded-xl border bg-muted/20 p-3">
                      <div className="font-medium">{service.name || 'Service'}</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {requirements.length ? `Controlled prerequisites: ${requirements.join(', ')}.` : 'No clinical prerequisite is represented by this appointment record.'}
                      </p>
                    </div>
                  );
                })}
              </div>
              {clinicalRequired && (
                <ClinicalBoundary clinical={clinical} canManageClinical={capabilities.canManageClinical} />
              )}
            </Panel>

            <Panel title="Checkout readiness" icon={CreditCard}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Lifecycle label="Appointment state" value={['confirmed', 'in_progress'].includes(appointment.status || '') ? 'Eligible to request' : 'Not eligible'} active={['confirmed', 'in_progress'].includes(appointment.status || '')} />
                <Lifecycle label="Deposit" value={appointment.depositAmount ? appointment.depositPaid ? `Paid ${formatCurrency(appointment.depositAmount)}` : `Due ${formatCurrency(appointment.depositAmount)}` : 'No deposit recorded'} active={appointment.depositPaid === true} />
                <Lifecycle label="Payment / transaction" value={capabilities.canManageFinance ? appointment.payment?.status || appointment.transaction?.paymentStatus || 'No settlement record' : 'Finance status restricted'} active={Boolean(appointment.payment || appointment.transaction)} />
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Checkout eligibility is re-checked by the controlled server workflow. This route does not treat a booking, provider assignment, consent, or displayed total as settlement or treatment completion.
              </p>
            </Panel>
          </div>

          <aside className="grid content-start gap-4">
            <Panel title="Client context" icon={UserRound}>
              {capabilities.canReadClients || capabilities.canSchedule || capabilities.canManageClinical ? (
                <div className="grid gap-2 text-sm">
                  <div className="font-medium">{clientName}</div>
                  {appointment.client?.user?.email && <div className="break-all text-muted-foreground">{appointment.client.user.email}</div>}
                  {appointment.client?.user?.phone && <div className="text-muted-foreground">{appointment.client.user.phone}</div>}
                  <div className="pt-2 text-xs leading-5 text-muted-foreground">{appointment.client?.totalVisits || 0} recorded visits · last visit {appointment.client?.lastVisit ? formatDateTime(appointment.client.lastVisit, timeZone) : 'not recorded'}</div>
                </div>
              ) : <RestrictedCopy label="Client context is restricted by your role." />}
            </Panel>

            <Panel title="Assigned provider" icon={Stethoscope}>
              <div className="font-medium text-sm">{appointment.provider?.user?.name || 'No provider assigned'}</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Assignment is operational only. This screen does not assert credential, licensure, scope, supervision, or authorization results.</p>
            </Panel>

            <Panel title="Protected boundaries" icon={LockKeyhole}>
              <ul className="grid gap-3 text-sm leading-6 text-muted-foreground">
                <li><strong className="text-foreground">Consent:</strong> signatures and narratives are never shown here; only authorized clinical users can view a limited status summary.</li>
                <li><strong className="text-foreground">Custody:</strong> photos, assets, lot identifiers, and administration records stay in controlled clinical/custody workflows.</li>
                <li><strong className="text-foreground">Payment:</strong> provider references and card data are not exposed. External terminal/provider completion is not inferred.</li>
              </ul>
            </Panel>
          </aside>
        </section>
      </div>
    </main>
  );
}

function ClinicalBoundary({ clinical, canManageClinical }: { clinical: Awaited<ReturnType<typeof getAppointmentWorkflowDetail>>['clinical']; canManageClinical: boolean }) {
  if (!canManageClinical || !clinical) {
    return <RestrictedCopy label="Consent and clinical prerequisite evidence are restricted and therefore not evaluated in this route. Use the controlled clinical workflow; do not infer readiness from appointment status." />;
  }
  return (
    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950">
      <div className="flex items-center gap-2 font-medium"><FileCheck2 className="h-4 w-4" /> Limited clinical status summary</div>
      <p className="mt-1 leading-6">{clinical.consents.length} consent record(s) and {clinical.sessions.length} treatment session record(s) are visible to your clinical role. Their presence is not a matching-consent, readiness, authorization, or completion result; the controlled clinical workflow makes that determination.</p>
    </div>
  );
}

function RestrictedCopy({ label }: { label: string }) {
  return <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">{label}</p>;
}

function Panel({ title, icon: Icon, children }: { title: string; icon: ComponentType<{ className?: string }>; children: ReactNode }) {
  return <section className="rounded-2xl border bg-background p-4 shadow-sm md:p-5"><h2 className="mb-4 flex items-center gap-2 text-base font-semibold"><Icon className="h-4 w-4 text-muted-foreground" />{title}</h2>{children}</section>;
}

function Lifecycle({ label, value, active = false }: { label: string; value: string; active?: boolean }) {
  return <div className="rounded-xl border bg-muted/20 p-3"><div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">{active && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}{label}</div><div className="mt-1 text-sm font-medium">{value}</div></div>;
}

export default AppointmentWorkflowPage;
