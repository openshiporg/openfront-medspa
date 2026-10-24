import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { ErrorState, Fact, PageHeader, Panel, PillLink, PlatformPage, StatusDot, TitleStatus, Track, humanize } from '@/features/platform/components/medspa-ui';
import { getIncident } from '../actions/safety';
import { IncidentStepSheet } from '../components/SafetyActions';
import { incidentStatusLabel, severityTone, when } from './SafetyPage';

function notes(value: unknown) {
  return value && typeof value === 'object' && typeof (value as any).notes === 'string' ? (value as any).notes as string : null;
}

export async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getIncident(id);
  const breadcrumbs = [{ label: 'Safety', href: '/dashboard/platform/safety' }, { label: 'Incident' }];
  if (!result) {
    return (
      <PlatformPage breadcrumbs={breadcrumbs} width="narrow">
        <ErrorState id="incident-unavailable" title="Incident unavailable" action={<Track><PillLink href="/dashboard/platform/safety">Safety</PillLink></Track>} />
      </PlatformPage>
    );
  }
  const { incident, canActAsClinician } = result;
  const interventions = incident.interventions || {};

  return (
    <PlatformPage breadcrumbs={breadcrumbs} width="narrow">
      <PageHeader
        title={incident.summary}
        icon={ShieldAlert}
        status={<TitleStatus tone={severityTone[incident.severity] || 'zinc'}>{humanize(incident.severity)} · {incidentStatusLabel[incident.status] || humanize(incident.status)}</TitleStatus>}
        meta={<><span>{when(incident.occurredAt)}</span><span>{incident.location?.name}</span></>}
        actions={incident.status !== 'closed' ? <Track><IncidentStepSheet incidentId={incident.id} status={incident.status} canActAsClinician={canActAsClinician} /></Track> : null}
      />

      <Panel title="Details">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Fact label="Client">{incident.client?.user?.name || '—'}</Fact>
          <Fact label="Reported by">{incident.reportedBy?.name || '—'}</Fact>
          <Fact label="Triage">{humanize(incident.triageDisposition)}</Fact>
          <Fact label="Visit">{incident.appointment ? <Link className="underline underline-offset-4" href={`/dashboard/platform/appointments/${incident.appointment.id}`}>{when(incident.appointment.startTime)}</Link> : '—'}</Fact>
          <Fact label="Suspect lot">{incident.suspectLot?.lotNumber || '—'}</Fact>
          <Fact label="Suspect device">{incident.suspectDevice?.name || '—'}</Fact>
          <div className="sm:col-span-2"><Fact label="Symptoms" wrap>{notes(interventions.symptoms) || '—'}</Fact></div>
          <div className="sm:col-span-2"><Fact label="Immediate actions" wrap>{notes(interventions.immediateActions) || '—'}</Fact></div>
          {incident.closedAt ? <Fact label="Closed">{when(incident.closedAt)}</Fact> : null}
        </dl>
      </Panel>

      <Panel title="Timeline" padded={false}>
        <ol className="divide-y">
          {incident.actions.map((step) => (
            <li key={step.id} className="flex gap-3 px-4 py-3 md:px-5">
              <StatusDot tone={step.toStatus === 'closed' ? 'zinc' : step.action === 'report' ? 'amber' : 'blue'} className="mt-1.5" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className="text-sm font-semibold">{humanize(step.action)}{step.toStatus && step.toStatus !== step.fromStatus ? ` · ${incidentStatusLabel[step.toStatus] || humanize(step.toStatus)}` : ''}</h3>
                  <span className="text-xs tabular-nums text-muted-foreground">{when(step.occurredAt)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-muted-foreground">{step.rationale}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.clinician?.user?.name || step.actor?.name || 'Staff'}{step.severity ? ` · ${humanize(step.severity)}` : ''}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </PlatformPage>
  );
}
