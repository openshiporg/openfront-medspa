import { PlugZap } from 'lucide-react';
import { Chip, EmptyState, ErrorState, MetricStrip, PageHeader, Panel, PillLink, PlatformPage, SegmentTabs, StatusDot, TitleStatus, Track, humanize } from '@/features/platform/components/medspa-ui';
import { PracticeSetupState } from '@/features/platform/components/PracticeSetupState';
import { hasPracticeSetup } from '@/features/platform/lib/practiceSetup';
import { getIntegrations } from '../actions/integrations';
import { ProviderToggle } from '../components/ProviderToggle';

const EVENT_TABS = [
  { value: 'pending', label: 'Recorded' },
  { value: 'dead_letter', label: 'Failed' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'all', label: 'All' },
] as const;

function age(value: string | null) {
  if (!value) return '—';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}

export async function IntegrationsPage({ searchParams }: { searchParams?: Promise<{ events?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const eventStatus = EVENT_TABS.some((tab) => tab.value === params.events) ? params.events! : 'pending';
  const result = await getIntegrations(eventStatus);
  const breadcrumbs = [{ label: 'Integrations' }];

  if (result.status === 'unavailable') {
    const practiceReady = await hasPracticeSetup();
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Integrations" icon={PlugZap} />
        {practiceReady === false ? <PracticeSetupState /> : <ErrorState id="integrations-unavailable" title="Integrations unavailable" message="Providers and events could not be loaded." action={<Track><PillLink href="/dashboard/platform/integrations">Retry</PillLink></Track>} />}
      </PlatformPage>
    );
  }

  const failedWebhooks = result.webhooks.filter((hook) => hook.status !== 'processed').length;
  const attention = result.eventCounts.deadLetter + failedWebhooks;
  const tabs = EVENT_TABS.map((tab) => ({
    value: tab.value, label: tab.label,
    href: tab.value === 'pending' ? '/dashboard/platform/integrations' : `/dashboard/platform/integrations?events=${tab.value}`,
    count: tab.value === 'pending' ? result.eventCounts.pending : tab.value === 'dead_letter' ? result.eventCounts.deadLetter : tab.value === 'delivered' ? result.eventCounts.delivered : null,
  }));

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader title="Integrations" icon={PlugZap} status={<TitleStatus tone={attention ? 'rose' : 'emerald'}>{attention ? `${attention} need attention` : 'No failures'}</TitleStatus>} />

      <MetricStrip items={[
        { label: 'Payment methods on', value: result.providers.filter((provider) => provider.isInstalled).length, tone: 'emerald' },
        { label: 'Email delivery', value: result.email.configured ? 'On' : 'Off', tone: result.email.configured ? 'emerald' : 'amber' },
        { label: 'Events recorded', value: result.eventCounts.pending, tone: 'zinc' },
        { label: 'Failed events', value: result.eventCounts.deadLetter, tone: result.eventCounts.deadLetter ? 'rose' : 'zinc' },
      ]} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Payment methods">
          {result.providers.length ? (
            <ul className="grid gap-3">
              {result.providers.map((provider) => (
                <li key={provider.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{provider.name}</h3>
                      <TitleStatus tone={provider.isInstalled ? 'emerald' : 'zinc'}>{provider.isInstalled ? (provider.isDefault ? 'On · default' : 'On') : 'Off'}</TitleStatus>
                    </div>
                    <p className="text-xs text-muted-foreground">{humanize(provider.adapter)}</p>
                  </div>
                  <Track>
                    <ProviderToggle id={provider.id} field="isInstalled" value={provider.isInstalled} label={provider.isInstalled ? 'Turn off' : 'Turn on'} />
                    {provider.isInstalled && !provider.isDefault ? <ProviderToggle id={provider.id} field="isDefault" value={false} label="Make default" /> : null}
                  </Track>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No payment methods</p>}
        </Panel>

        <Panel title="Email">
          <div className="flex items-center gap-2 text-sm"><StatusDot tone={result.email.configured ? 'emerald' : 'amber'} />{result.email.configured ? 'Booking receipts and reminders are sent' : 'Email is off: booking receipts and reminders are not sent'}</div>
          {!result.email.configured ? <p className="mt-2 text-xs text-muted-foreground">Needs SMTP_HOST and SMTP_FROM on the server.</p> : null}
        </Panel>
      </div>

      <section className="grid gap-3" aria-labelledby="events-heading">
        <h2 id="events-heading" className="text-sm font-semibold">Event log</h2>
        <SegmentTabs label="Event status" tabs={tabs} active={eventStatus} />
        {result.events.length ? (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-background">
            {result.events.map((event) => (
              <li key={event.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{humanize(event.eventType.replaceAll('.', ' '))}</span>
                    <TitleStatus tone={event.status === 'dead_letter' ? 'rose' : event.status === 'delivered' ? 'emerald' : 'zinc'}>{event.status === 'pending' ? 'Recorded' : humanize(event.status)}</TitleStatus>
                  </div>
                  {event.lastError ? <p className="truncate text-xs text-rose-700 dark:text-rose-300">{event.lastError}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {event.aggregateType ? <Chip>{event.aggregateType}</Chip> : null}
                  <span className="tabular-nums">{age(event.occurredAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={PlugZap} title="No events in this view" />}
      </section>

      {result.webhooks.length ? (
        <Panel title="Payment webhooks">
          <ul className="grid gap-2 text-sm">
            {result.webhooks.map((hook) => (
              <li key={hook.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2"><StatusDot tone={hook.status === 'processed' ? 'emerald' : 'amber'} />{hook.type || 'Webhook'} · {hook.provider?.name || 'Provider'}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{age(hook.processedAt)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </PlatformPage>
  );
}
