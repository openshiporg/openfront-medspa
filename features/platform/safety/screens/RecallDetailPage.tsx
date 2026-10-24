import { Siren } from 'lucide-react';
import { EmptyState, ErrorState, Fact, MetricStrip, PageHeader, Panel, PillLink, PlatformPage, StatusDot, TitleStatus, Track, humanize, type Tone } from '@/features/platform/components/medspa-ui';
import { getRecall } from '../actions/safety';
import { RecallStepSheet } from '../components/SafetyActions';
import { recallTone, when } from './SafetyPage';

const exposureTone: Record<string, Tone> = { identified: 'rose', reviewed: 'amber', notified: 'blue', assessed: 'emerald', closed: 'zinc' };

export async function RecallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getRecall(id);
  const breadcrumbs = [{ label: 'Safety', href: '/dashboard/platform/safety?tab=recalls' }, { label: 'Recall' }];
  if (!result) {
    return (
      <PlatformPage breadcrumbs={breadcrumbs} width="narrow">
        <ErrorState id="recall-unavailable" title="Recall unavailable" action={<Track><PillLink href="/dashboard/platform/safety?tab=recalls">Recalls</PillLink></Track>} />
      </PlatformPage>
    );
  }
  const { recall, canManageClinical } = result;
  const title = recall.lot ? `${recall.lot.product?.name || 'Product'} · lot ${recall.lot.lotNumber}` : recall.device?.name || 'Recall';
  const closable = recall.exposures.every((item) => item.status === 'assessed' || item.status === 'closed');
  const count = (status: string) => recall.exposures.filter((item) => item.status === status).length;

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader
        title={title}
        icon={Siren}
        status={<TitleStatus tone={recallTone(recall.status)}>{humanize(recall.status)}</TitleStatus>}
        meta={<><span>{recall.sourceReference}</span><span>Opened {when(recall.openedAt)}</span></>}
        actions={recall.status !== 'closed' ? <Track><RecallStepSheet recallId={recall.id} exposures={recall.exposures} canManageClinical={canManageClinical} closable={closable} /></Track> : null}
      />
      <MetricStrip items={[
        { label: 'Exposed', value: recall.exposures.length },
        { label: 'To notify', value: count('identified') + count('reviewed'), tone: count('identified') + count('reviewed') ? 'rose' : undefined },
        { label: 'Notified', value: count('notified'), tone: 'blue' },
        { label: 'Assessed', value: count('assessed') + count('closed'), tone: 'emerald' },
      ]} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title="Exposed clients" padded={false}>
          {recall.exposures.length ? (
            <ul className="divide-y">
              {recall.exposures.map((item) => (
                <li key={item.id} className="flex flex-col gap-1 px-4 py-3 md:px-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-sm font-semibold">{item.client?.user?.name || 'Client'}</h3>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone={exposureTone[item.status] || 'zinc'} />{humanize(item.status)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.administration?.service?.name || 'Treatment'} · {when(item.administration?.completedAt)} · notify by {when(item.notificationDueAt)}</p>
                </li>
              ))}
            </ul>
          ) : <div className="p-4"><EmptyState icon={Siren} title="No exposed clients" /></div>}
        </Panel>
        <div className="grid content-start gap-4">
          <Panel title="Scope">
            <dl className="grid gap-3">
              <Fact label="Location">{recall.location?.name || '—'}</Fact>
              <Fact label="Scope" wrap>{recall.scopeReason || '—'}</Fact>
              {recall.closedAt ? <Fact label="Closed">{when(recall.closedAt)}</Fact> : null}
            </dl>
          </Panel>
          <Panel title="Timeline" padded={false}>
            <ol className="divide-y">
              {recall.actions.map((step) => (
                <li key={step.id} className="flex gap-3 px-4 py-3">
                  <StatusDot tone={step.action === 'close' ? 'zinc' : 'blue'} className="mt-1.5" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{humanize(step.action)}</h3>
                    <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{step.reason}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">{when(step.occurredAt)} · {step.actor?.name || 'Staff'}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </PlatformPage>
  );
}
