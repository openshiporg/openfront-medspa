import Link from 'next/link';
import { ChevronLeft, ChevronRight, ContactRound, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, Chip, EmptyState, ErrorState, PageHeader, PillLink, PlatformPage, SegmentTabs, StatusDot, Track, usd } from '@/features/platform/components/medspa-ui';
import { inputClass, pillClass, trackClass } from '@/features/platform/components/pill';
import { PracticeSetupState } from '@/features/platform/components/PracticeSetupState';
import { hasPracticeSetup } from '@/features/platform/lib/practiceSetup';
import { getClientDirectory } from '../actions/clients';
import { CLIENT_FILTERS, type ClientFilter } from '../types';

const filterLabels: Record<ClientFilter, string> = { all: 'All', upcoming: 'Upcoming', followup: 'Follow-up due', marketing: 'Marketing opt-in' };

function shortDate(value?: string | null, timeZone?: string | null) {
  return value ? new Date(value).toLocaleDateString('en-US', { timeZone: timeZone || undefined, month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function nextVisit(value: string, timeZone?: string | null) {
  return new Date(value).toLocaleString('en-US', { timeZone: timeZone || undefined, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export async function ClientListPage({ searchParams }: { searchParams?: Promise<{ q?: string; filter?: string; page?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const search = (params.q || '').slice(0, 100);
  const filter: ClientFilter = CLIENT_FILTERS.includes(params.filter as ClientFilter) ? params.filter as ClientFilter : 'all';
  const page = Math.max(0, Number.parseInt(params.page || '0', 10) || 0);
  const directory = await getClientDirectory(search, filter, page);
  const practiceReady = directory ? true : await hasPracticeSetup();

  const href = (next: { filter?: ClientFilter; page?: number }) => {
    const query = new URLSearchParams();
    if (search) query.set('q', search);
    const nextFilter = next.filter ?? filter;
    if (nextFilter !== 'all') query.set('filter', nextFilter);
    if (next.page) query.set('page', String(next.page));
    const value = query.toString();
    return `/dashboard/platform/clients${value ? `?${value}` : ''}`;
  };
  const lastPage = directory ? Math.max(0, Math.ceil(directory.total / directory.pageSize) - 1) : 0;

  return (
    <PlatformPage breadcrumbs={[{ label: 'Clients' }]}>
      <PageHeader
        title="Clients"
        icon={ContactRound}
        status={directory ? <span className="text-sm tabular-nums text-muted-foreground">{directory.total}</span> : null}
        actions={<Track><PillLink href="/dashboard/platform/appointments/new" variant="primary">Book</PillLink></Track>}
      />

      {practiceReady === false ? <PracticeSetupState /> : !directory ? (
        <ErrorState id="clients-unavailable" title="Clients unavailable" message="The client list could not be loaded." action={<Track><PillLink href={href({})}>Retry</PillLink></Track>} />
      ) : (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <SegmentTabs label="Client filters" active={filter} tabs={CLIENT_FILTERS.map((value) => ({ value, label: filterLabels[value], href: href({ filter: value }) }))} />
            <form action="/dashboard/platform/clients" className="flex min-w-0 gap-2 md:w-80" role="search">
              {filter !== 'all' ? <input type="hidden" name="filter" value={filter} /> : null}
              <label className="sr-only" htmlFor="client-search">Search clients</label>
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input id="client-search" name="q" defaultValue={search} placeholder="Name, email or phone" maxLength={100} className={cn(inputClass, 'pl-9')} />
              </div>
              <div className={trackClass}><button type="submit" className={pillClass()}>Search</button></div>
            </form>
          </div>

          {directory.items.length === 0 ? (
            <EmptyState icon={ContactRound} title={search || filter !== 'all' ? 'No matching clients' : 'No clients yet'} action={<Track><PillLink href="/dashboard/platform/appointments/new">Book an appointment</PillLink></Track>} />
          ) : (
            <section aria-label="Client list" className="overflow-hidden rounded-[6px] border bg-background">
              <ul className="divide-y">
                {directory.items.map((item) => (
                  <li key={item.id}>
                    <Link href={`/dashboard/platform/clients/${item.id}`} className="grid gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_7rem_7rem] md:items-center md:px-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={item.name} />
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-semibold">{item.name || 'Unnamed client'}</span>
                            {item.followUpDue ? <StatusDot tone="amber" /> : null}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{[item.email, item.phone].filter(Boolean).join(' · ') || 'No contact details'}</div>
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-wrap gap-1.5">
                        {item.nextAppointment ? <Chip tone="emerald">{nextVisit(item.nextAppointment.startTime, item.timezone)}</Chip> : null}
                        {item.followUpDue ? <Chip tone="amber">Follow-up due</Chip> : null}
                        {item.marketingConsent ? <Chip>Marketing</Chip> : null}
                      </div>
                      <dl className="grid grid-cols-3 gap-3 text-xs md:contents">
                        <div className="md:text-right"><dt className="text-muted-foreground md:sr-only">Last visit</dt><dd className="tabular-nums">{shortDate(item.lastVisit, item.timezone)}</dd></div>
                        <div className="md:text-right"><dt className="text-muted-foreground md:sr-only">Visits · value</dt><dd className="tabular-nums">{item.totalVisits} · {usd(item.lifetimeValue, { whole: true })}</dd></div>
                      </dl>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {lastPage > 0 ? (
            <nav aria-label="Client pages" className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span className="tabular-nums">Page {page + 1} of {lastPage + 1}</span>
              <div className={trackClass}>
                {page > 0 ? <Link href={href({ page: page - 1 })} className={pillClass('quiet', 'sm')}><ChevronLeft />Previous</Link> : null}
                {page < lastPage ? <Link href={href({ page: page + 1 })} className={pillClass('raised', 'sm')}>Next<ChevronRight /></Link> : null}
              </div>
            </nav>
          ) : null}
        </>
      )}
    </PlatformPage>
  );
}
