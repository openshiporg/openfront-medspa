import Link from 'next/link';
import { ChevronLeft, ChevronRight, Hourglass, Megaphone, MessageSquareText, Send } from 'lucide-react';
import {
  Chip, EmptyState, ErrorState, humanize, MetricStrip, PageHeader, PillLink, PlatformPage, SegmentTabs, StatusDot,
  statusTone, TitleStatus, Track,
} from '@/features/platform/components/medspa-ui';
import { pillClass, trackClass } from '@/features/platform/components/pill';
import { PracticeSetupState } from '@/features/platform/components/PracticeSetupState';
import { hasPracticeSetup } from '@/features/platform/lib/practiceSetup';
import { getMessageLog, getMessageTemplates, getWaitlistBoard, getWaitlistOptions } from '../actions/engagement';
import { TemplateDrawer } from '../components/TemplateDrawer';
import { WaitlistAddDrawer } from '../components/WaitlistAddDrawer';
import { WaitlistEntryActions } from '../components/WaitlistEntryActions';
import { ENGAGEMENT_TABS, MESSAGE_STATUSES, WAITLIST_STATUSES, type EngagementTab, type MessageStatus, type WaitlistStatus } from '../types';

const BASE = '/dashboard/platform/engagement';
const tabLabels: Record<EngagementTab, string> = { waitlist: 'Waitlist', templates: 'Templates', log: 'Message log' };
const waitlistLabels: Record<WaitlistStatus, string> = { active: 'Waiting', notified: 'Notified', converted: 'Booked', removed: 'Removed' };
const messageLabels: Record<MessageStatus, string> = { all: 'All', sent: 'Sent', delivered: 'Delivered', failed: 'Failed' };

function day(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
}

function moment(value?: string | null) {
  return value ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

type Params = { tab?: string; status?: string; page?: string };

export async function EngagementPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const params = searchParams ? await searchParams : {};
  const tab: EngagementTab = ENGAGEMENT_TABS.includes(params.tab as EngagementTab) ? params.tab as EngagementTab : 'waitlist';
  const breadcrumbs = [{ label: 'Waitlist & messages' }];
  const tabs = <SegmentTabs label="Sections" active={tab} tabs={ENGAGEMENT_TABS.map((value) => ({ value, label: tabLabels[value], href: value === 'waitlist' ? BASE : `${BASE}?tab=${value}` }))} />;

  if (tab === 'templates') {
    const templates = await getMessageTemplates();
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Waitlist & messages" icon={Megaphone} actions={templates ? <TemplateDrawer /> : null} />
        {tabs}
        {!templates ? (
          await hasPracticeSetup() === false ? <PracticeSetupState /> : <ErrorState id="templates-unavailable" title="Templates unavailable" message="Templates could not be loaded for your role." action={<Track><PillLink href={`${BASE}?tab=templates`}>Retry</PillLink></Track>} />
        ) : templates.length === 0 ? (
          <EmptyState icon={MessageSquareText} title="No templates yet" action={<TemplateDrawer />} />
        ) : (
          <section aria-label="Message templates" className="grid gap-3 md:grid-cols-2">
            {templates.map((template) => (
              <article key={template.id} className="flex min-w-0 flex-col gap-3 rounded-[6px] border bg-background p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <h2 className="truncate text-sm font-semibold">{template.name}</h2>
                      <TitleStatus tone={template.isActive ? 'emerald' : 'zinc'}>{template.isActive ? 'Active' : 'Off'}</TitleStatus>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{humanize(template.type)}</p>
                  </div>
                  <TemplateDrawer template={template} />
                </div>
                <p className="line-clamp-4 whitespace-pre-wrap rounded-[6px] bg-muted/50 px-3 py-2 text-sm">{template.content}</p>
                {template.variables.length ? <div className="flex flex-wrap gap-1.5">{template.variables.map((variable) => <Chip key={variable}>{variable}</Chip>)}</div> : null}
              </article>
            ))}
          </section>
        )}
      </PlatformPage>
    );
  }

  if (tab === 'log') {
    const status: MessageStatus = MESSAGE_STATUSES.includes(params.status as MessageStatus) ? params.status as MessageStatus : 'all';
    const page = Math.max(0, Number.parseInt(params.page || '0', 10) || 0);
    const log = await getMessageLog(status, page);
    const href = (next: { status?: MessageStatus; page?: number }) => {
      const query = new URLSearchParams({ tab: 'log' });
      const nextStatus = next.status ?? status;
      if (nextStatus !== 'all') query.set('status', nextStatus);
      if (next.page) query.set('page', String(next.page));
      return `${BASE}?${query.toString()}`;
    };
    const lastPage = log ? Math.max(0, Math.ceil(log.total / log.pageSize) - 1) : 0;
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Waitlist & messages" icon={Megaphone} />
        {tabs}
        {!log ? (
          await hasPracticeSetup() === false ? <PracticeSetupState /> : <ErrorState id="log-unavailable" title="Message log unavailable" message="The log could not be loaded for your role." action={<Track><PillLink href={href({})}>Retry</PillLink></Track>} />
        ) : (
          <>
            <SegmentTabs label="Delivery status" active={status} tabs={MESSAGE_STATUSES.map((value) => ({ value, label: messageLabels[value], href: href({ status: value, page: 0 }), count: value === 'failed' ? log.failed : undefined }))} />
            {log.items.length === 0 ? <EmptyState icon={Send} title="No messages" /> : (
              <section aria-label="Message log" className="overflow-hidden rounded-[6px] border bg-background">
                <ul className="divide-y">
                  {log.items.map((item) => (
                    <li key={item.id} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:px-5">
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                          {item.clientRecordId
                            ? <Link href={`/dashboard/platform/clients/${item.clientRecordId}`} className="truncate text-sm font-semibold hover:underline">{item.recipient || 'Client'}</Link>
                            : <span className="truncate text-sm font-semibold">{item.recipient || 'Unknown recipient'}</span>}
                          <TitleStatus tone={statusTone(item.status === 'sent' || item.status === 'delivered' ? 'active' : 'failed')}>{humanize(item.status)}</TitleStatus>
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{[item.template?.name, humanize(item.channel)].filter(Boolean).join(' · ')}</div>
                        {item.error ? <div className="mt-1 break-words text-xs text-rose-700 dark:text-rose-300">{item.error}</div> : null}
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{moment(item.sentAt)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {lastPage > 0 ? (
              <nav aria-label="Log pages" className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
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

  const status: WaitlistStatus = WAITLIST_STATUSES.includes(params.status as WaitlistStatus) ? params.status as WaitlistStatus : 'active';
  const [board, options] = await Promise.all([getWaitlistBoard(status), getWaitlistOptions()]);
  const practiceReady = board ? true : await hasPracticeSetup();

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader
        title="Waitlist & messages"
        icon={Megaphone}
        status={board?.counts.active ? <TitleStatus tone="amber">{board.counts.active} waiting</TitleStatus> : null}
        actions={board ? <WaitlistAddDrawer options={options} /> : null}
      />
      {tabs}
      {practiceReady === false ? <PracticeSetupState /> : !board ? (
        <ErrorState id="waitlist-unavailable" title="Waitlist unavailable" message="The waitlist could not be loaded for your role." action={<Track><PillLink href={BASE}>Retry</PillLink></Track>} />
      ) : (
        <>
          <MetricStrip items={WAITLIST_STATUSES.map((value) => ({ label: waitlistLabels[value], value: board.counts[value] ?? 0, tone: statusTone(value === 'converted' ? 'active' : value === 'removed' ? 'cancelled' : value === 'notified' ? 'in_progress' : 'pending'), href: value === 'active' ? BASE : `${BASE}?status=${value}` }))} />
          <SegmentTabs label="Waitlist status" active={status} tabs={WAITLIST_STATUSES.map((value) => ({ value, label: waitlistLabels[value], href: value === 'active' ? BASE : `${BASE}?status=${value}`, count: board.counts[value] ?? 0 }))} />
          {board.entries.length === 0 ? (
            <EmptyState icon={Hourglass} title={status === 'active' ? 'No one is waiting' : `No ${waitlistLabels[status].toLowerCase()} entries`} action={status === 'active' ? <WaitlistAddDrawer options={options} /> : undefined} />
          ) : (
            <section aria-label="Waitlist entries" className="grid gap-3">
              {board.entries.map((entry) => {
                const name = entry.name || 'Client';
                const range = [day(entry.dateRangeStart), day(entry.dateRangeEnd)].filter(Boolean).join(' – ');
                return (
                  <article key={entry.id} className="flex min-w-0 flex-col gap-3 rounded-[6px] border bg-background p-4 md:flex-row md:items-start md:justify-between md:p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                        {entry.clientRecordId
                          ? <Link href={`/dashboard/platform/clients/${entry.clientRecordId}`} className="truncate text-base font-semibold hover:underline">{name}</Link>
                          : <h2 className="truncate text-base font-semibold">{name}</h2>}
                        <TitleStatus tone={statusTone(entry.status === 'converted' ? 'active' : entry.status === 'removed' ? 'cancelled' : entry.status === 'notified' ? 'in_progress' : 'pending')}>{waitlistLabels[entry.status]}</TitleStatus>
                        {entry.isGuest ? <Chip>Walk-in</Chip> : null}
                      </div>
                      <p className="mt-1 text-sm">{entry.service?.name || 'Treatment'}{entry.providers.length ? <span className="text-muted-foreground"> · {entry.providers.join(', ')}</span> : null}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {entry.preferredDays.length ? <Chip>{entry.preferredDays.map((value) => value.slice(0, 3)).join(' ')}</Chip> : null}
                        {entry.preferredTimeRange ? <Chip>{entry.preferredTimeRange}</Chip> : null}
                        {range ? <Chip>{range}</Chip> : null}
                        {entry.phone ? <Chip>{entry.phone}</Chip> : null}
                      </div>
                      {entry.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{entry.notes}</p> : null}
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><StatusDot tone="zinc" />Added {moment(entry.createdAt)}{entry.notifiedAt ? ` · notified ${moment(entry.notifiedAt)}` : ''}</p>
                      {entry.convertedAppointment ? <Link href={`/dashboard/platform/appointments/${entry.convertedAppointment.id}`} className="mt-1 inline-block text-xs font-medium hover:underline">Booked {moment(entry.convertedAppointment.startTime)}</Link> : null}
                    </div>
                    <div className="shrink-0"><WaitlistEntryActions entryId={entry.id} status={entry.status} name={name} /></div>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}
    </PlatformPage>
  );
}
