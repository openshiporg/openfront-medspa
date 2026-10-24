import { UserRoundSearch } from 'lucide-react';
import { ErrorState, Fact, PageHeader, Panel, PillLink, PlatformPage, StatusDot, TitleStatus, Track, humanize } from '@/features/platform/components/medspa-ui';
import { getRightsRequest } from '../actions/privacy';
import { RightsStepSheet } from '../components/PrivacyActions';
import { day, dueTone, requestTypeLabel } from './PrivacyPage';

const FINISHED = new Set(['fulfilled', 'partially_fulfilled', 'denied_with_basis', 'closed']);

export async function RightsRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await getRightsRequest(id);
  const breadcrumbs = [{ label: 'Privacy & records', href: '/dashboard/platform/privacy' }, { label: 'Request' }];
  if (!request) {
    return (
      <PlatformPage breadcrumbs={breadcrumbs} width="narrow">
        <ErrorState id="request-unavailable" title="Request unavailable" action={<Track><PillLink href="/dashboard/platform/privacy">Privacy & records</PillLink></Track>} />
      </PlatformPage>
    );
  }
  const due = dueTone(request);
  const details = request.scope && typeof request.scope === 'object' && typeof (request.scope as any).details === 'string' ? (request.scope as any).details as string : null;

  return (
    <PlatformPage breadcrumbs={breadcrumbs} width="narrow">
      <PageHeader
        title={`${request.client?.user?.name || 'Client'} · ${requestTypeLabel[request.type] || humanize(request.type)}`}
        icon={UserRoundSearch}
        status={<TitleStatus tone={due.tone}>{due.label}</TitleStatus>}
        actions={request.status !== 'closed' ? <Track><RightsStepSheet requestId={request.id} /></Track> : null}
      />
      <Panel title="Request">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Fact label="Status">{humanize(request.status)}</Fact>
          <Fact label="Due">{day(request.dueAt)}</Fact>
          <Fact label="Received">{day(request.requestedAt)}</Fact>
          <Fact label="Recorded by">{request.requestedBy?.name || '—'}</Fact>
          {FINISHED.has(request.status) ? <Fact label="Completed">{day(request.completedAt)}</Fact> : null}
          {request.legalBasis ? <Fact label="Legal basis" wrap>{request.legalBasis}</Fact> : null}
          <div className="sm:col-span-2"><Fact label="Details" wrap>{details || '—'}</Fact></div>
        </dl>
      </Panel>
      <Panel title="Timeline" padded={false}>
        <ol className="divide-y">
          {request.actionEntries.map((step) => (
            <li key={step.id} className="flex gap-3 px-4 py-3 md:px-5">
              <StatusDot tone={step.action === 'close' ? 'zinc' : step.action === 'deny_with_basis' ? 'rose' : 'blue'} className="mt-1.5" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className="text-sm font-semibold">{humanize(step.action)}</h3>
                  <span className="text-xs tabular-nums text-muted-foreground">{day(step.occurredAt)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-muted-foreground">{step.reason}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.actor?.name || 'Staff'}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </PlatformPage>
  );
}
