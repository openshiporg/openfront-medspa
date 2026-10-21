import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
import { PlatformBreadcrumbs } from './PlatformBreadcrumbs';

export function WorkflowUnavailable({ flow }: { flow: 'appointment' | 'checkout' }) {
  const isCheckout = flow === 'checkout';
  const label = isCheckout ? 'Checkout' : 'Appointment';

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-5 md:px-8 md:py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 md:gap-6">
        <PlatformBreadcrumbs items={[
          { label: 'Appointments', href: '/dashboard/platform/appointments' },
          { label },
        ]} />
        <section className="rounded-2xl border bg-background p-5 shadow-sm md:p-6">
          <LockKeyhole className="h-5 w-5 text-muted-foreground" />
          <h1 className="mt-3 text-xl font-semibold">{label} workflow unavailable</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            This record is unavailable or not visible to your current role. No appointment, clinical, provider, payment, consent, or custody status is inferred.
          </p>
          <Link href="/dashboard/platform/appointments" className="mt-5 inline-flex rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">
            Return to appointments
          </Link>
        </section>
      </div>
    </main>
  );
}
