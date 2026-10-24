import { HeartPulse } from 'lucide-react';
import { statusFilter } from '@/features/platform/lib/queryParams';
import { Chip, EmptyState, ErrorState, humanize, PageHeader, PillLink, PlatformPage, SegmentTabs, StatusDot, TitleStatus, Track } from '@/features/platform/components/medspa-ui';
import { getFollowUps } from '../actions/followUps';
import type { FollowUpStatus, FollowUpTaskRow } from '../types';
import { FollowUpActionForm } from './FollowUpActionForm';

const TABS: Array<{ value: FollowUpStatus; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function due(task: FollowUpTaskRow) {
  if (!task.dueAt) return 'No due date';
  return new Date(task.dueAt).toLocaleString('en-US', { timeZone: task.timezone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export async function FollowUpsPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const active = statusFilter(params.status, ['open', 'in_progress', 'completed', 'cancelled'] as const, 'open');
  const result = await getFollowUps(active);
  const breadcrumbs = [{ label: 'Follow-ups' }];

  if (result.status === 'unavailable') {
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Follow-ups" icon={HeartPulse} />
        <ErrorState id="follow-ups-unavailable" title="Follow-ups unavailable" message="Aftercare tasks could not be loaded." action={<Track><PillLink href="/dashboard/platform/follow-ups">Retry</PillLink></Track>} />
      </PlatformPage>
    );
  }

  const now = Date.now();
  const overdue = result.tasks.filter((task) => ['open', 'in_progress'].includes(task.status) && task.dueAt && new Date(task.dueAt).getTime() < now).length;

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader title="Follow-ups" icon={HeartPulse} status={overdue ? <TitleStatus tone="rose">{overdue} overdue</TitleStatus> : null} />
      <SegmentTabs label="Follow-up status" active={active} tabs={TABS.map((tab) => ({ value: tab.value, label: tab.label, count: result.counts[tab.value], href: tab.value === 'open' ? '/dashboard/platform/follow-ups' : `/dashboard/platform/follow-ups?status=${tab.value}` }))} />
      {result.tasks.length === 0 ? <EmptyState icon={HeartPulse} title="No follow-ups in this view" /> : (
        <ul className="grid gap-3">
          {result.tasks.map((task) => {
            const isOverdue = ['open', 'in_progress'].includes(task.status) && Boolean(task.dueAt) && new Date(task.dueAt!).getTime() < now;
            const flag = task.lastAction?.redFlag;
            return (
              <li key={task.id} className="grid min-w-0 gap-4 rounded-2xl border bg-background p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold">
                      <StatusDot tone={isOverdue ? 'rose' : task.status === 'completed' ? 'emerald' : task.status === 'cancelled' ? 'zinc' : 'amber'} />
                      <span className="min-w-0 break-words">{task.title}</span>
                      {isOverdue ? <span className="text-xs font-medium text-rose-700 dark:text-rose-300">Overdue</span> : null}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {task.clientName}{task.sessionTitle ? ` · ${task.sessionTitle}` : ''} · Due {due(task)}{task.assignedTo ? ` · ${task.assignedTo}` : ''}
                    </p>
                    {task.instructions ? <p className="mt-2 whitespace-pre-wrap text-sm">{task.instructions}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {flag && flag !== 'none' ? <Chip tone={flag === 'urgent' ? 'rose' : 'amber'}>{humanize(flag)}</Chip> : null}
                    {task.lastAction ? <Chip>{humanize(task.lastAction.action)}</Chip> : null}
                    {task.appointmentId ? <Track><PillLink href={`/dashboard/platform/appointments/${task.appointmentId}/treatment`} size="sm">Treatment</PillLink></Track> : null}
                  </div>
                </div>
                {['open', 'in_progress'].includes(task.status) ? <FollowUpActionForm taskId={task.id} /> : null}
              </li>
            );
          })}
        </ul>
      )}
    </PlatformPage>
  );
}
