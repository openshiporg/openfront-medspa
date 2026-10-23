import Link from 'next/link';
import { ClipboardList, Search } from 'lucide-react';
import {
  EmptyState, ErrorState, PageHeader, PillLink, PlatformPage, StatusDot, Track, humanize, inputClass, pillClass, statusTone,
} from '@/features/platform/components/medspa-ui';
import { getConsultationQueue, getPlanJourney } from '../actions/planJourney';
import { PlanJourneyClient } from './PlanJourneyClient';

const queueCrumbs = [{ label: 'Appointments', href: '/dashboard/platform/appointments' }, { label: 'Consultations & plans' }];

export async function PlanJourneyPage({ consultationId, pages }: { consultationId: string; pages?: { planPage?: number; appointmentPage?: number; historyPage?: number } }) {
  const data = await getPlanJourney(consultationId, pages);
  return (
    <PlatformPage width="narrow" breadcrumbs={[
      { label: 'Appointments', href: '/dashboard/platform/appointments' },
      { label: 'Consultations & plans', href: '/dashboard/platform/appointments/plans' },
      { label: data ? data.consultation.serviceName : 'Consultation' },
    ]}>
      {data ? <PlanJourneyClient data={data} /> : (
        <ErrorState id="plan-unavailable" title="Consultation unavailable" message="This consultation could not be loaded for your role." action={<Track><PillLink href="/dashboard/platform/appointments/plans">Consultation queue</PillLink></Track>} />
      )}
    </PlatformPage>
  );
}

export async function ConsultationPlanQueuePage({ page, search }: { page: number; search: string }) {
  const data = await getConsultationQueue(page, search);
  const href = (next: number) => `/dashboard/platform/appointments/plans?page=${next}&search=${encodeURIComponent(search)}`;
  return (
    <PlatformPage width="narrow" breadcrumbs={queueCrumbs}>
      <PageHeader title="Consultations & plans" icon={ClipboardList} />
      <form className="flex flex-wrap items-end gap-2" role="search">
        <label className="grid min-w-0 flex-1 gap-1.5 text-xs font-medium text-muted-foreground">Search treatment
          <input className={inputClass} name="search" defaultValue={search} maxLength={100} />
        </label>
        <div className="inline-flex rounded-full bg-muted p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.08)]"><button className={pillClass('raised')}><Search /> Search</button></div>
      </form>
      {!data ? (
        <ErrorState id="consultations-unavailable" title="Consultation queue unavailable" message="The queue could not be loaded for your role." action={<Track><PillLink href={href(page)}>Retry</PillLink></Track>} />
      ) : (
        <>
          {!data.items.length ? <EmptyState icon={ClipboardList} title="No matching consultations" /> : (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-background">
              {data.items.map((item) => (
                <li key={item.id}>
                  <Link href={`/dashboard/platform/appointments/plans/${item.id}`} className="flex min-w-0 flex-col gap-1 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between md:px-5">
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="truncate font-semibold">{item.clientName}</span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone={statusTone(item.status)} />{humanize(item.status)}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">{item.serviceName}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone={statusTone(item.candidacyDecision)} />{humanize(item.candidacyDecision)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <nav aria-label="Consultation queue pagination" className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Page {page + 1}</span>
            {(page > 0 || data.hasMore) && <Track>
              {page > 0 && <PillLink href={href(page - 1)} size="sm">Previous</PillLink>}
              {data.hasMore && <PillLink href={href(page + 1)} size="sm">Next</PillLink>}
            </Track>}
          </nav>
        </>
      )}
    </PlatformPage>
  );
}
