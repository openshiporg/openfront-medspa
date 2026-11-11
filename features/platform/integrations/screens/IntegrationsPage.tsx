import { RelativeAge } from './RelativeAge';
import { PlugZap } from 'lucide-react';
import { ErrorState, MetricStrip, PageHeader, Panel, PillLink, PlatformPage, StatusDot, TitleStatus, Track, humanize } from '@/features/platform/components/medspa-ui';
import { PracticeSetupState } from '@/features/platform/components/PracticeSetupState';
import { hasPracticeSetup } from '@/features/platform/lib/practiceSetup';
import { getIntegrations } from '../actions/integrations';
import { ProviderToggle } from '../components/ProviderToggle';

export async function IntegrationsPage() {
  const result = await getIntegrations();
  const breadcrumbs = [{ label: 'Integrations' }];

  if (result.status === 'unavailable') {
    const practiceReady = await hasPracticeSetup();
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Integrations" icon={PlugZap} />
        {practiceReady === false ? <PracticeSetupState /> : <ErrorState id="integrations-unavailable" title="Integrations unavailable" message="Providers and webhooks could not be loaded." action={<Track><PillLink href="/dashboard/platform/integrations">Retry</PillLink></Track>} />}
      </PlatformPage>
    );
  }

  const failedWebhooks = result.webhooks.filter((hook) => hook.status !== 'processed').length;
  const attention = failedWebhooks;

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader title="Integrations" icon={PlugZap} status={<TitleStatus tone={attention ? 'rose' : 'emerald'}>{attention ? `${attention} need attention` : 'No failures'}</TitleStatus>} />

      <MetricStrip items={[
        { label: 'Payment methods on', value: result.providers.filter((provider) => provider.isInstalled).length, tone: 'emerald' },
        { label: 'Email delivery', value: result.email.configured ? 'On' : 'Off', tone: result.email.configured ? 'emerald' : 'amber' },
        { label: 'Payment webhooks needing attention', value: failedWebhooks, tone: failedWebhooks ? 'rose' : 'zinc' },
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

      {result.webhooks.length ? (
        <Panel title="Payment webhooks">
          <ul className="grid gap-2 text-sm">
            {result.webhooks.map((hook) => (
              <li key={hook.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2"><StatusDot tone={hook.status === 'processed' ? 'emerald' : 'amber'} />{hook.type || 'Webhook'} · {hook.provider?.name || 'Provider'}</span>
                <span className="text-xs tabular-nums text-muted-foreground"><RelativeAge value={hook.processedAt} /></span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </PlatformPage>
  );
}
