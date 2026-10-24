import { ClipboardList, FileSignature, FileText, Inbox } from 'lucide-react';
import { statusFilter } from '@/features/platform/lib/queryParams';
import { Chip, EmptyState, ErrorState, MetricStrip, PageHeader, PillLink, PlatformPage, SegmentTabs, StatusDot, Track, humanize, type Tone } from '@/features/platform/components/medspa-ui';
import { getFormsOverview } from '../actions/forms';
import { FormEditorSheet } from '../components/FormEditorSheet';
import { ConsentPublishSheet, SubmissionReviewSheet } from '../components/FormActions';
import type { ConsentTemplateRow } from '../types';

const tabs = ['intake', 'templates', 'consent', 'submissions'] as const;

function date(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

const submissionTone: Record<string, Tone> = { submitted: 'amber', in_review: 'blue', reviewed: 'emerald', superseded: 'zinc' };

function consentState(row: ConsentTemplateRow): { label: string; tone: Tone } {
  const now = Date.now();
  if (row.supersededBy) return { label: 'Superseded', tone: 'zinc' };
  if (row.effectiveUntil && new Date(row.effectiveUntil).getTime() <= now) return { label: 'Ended', tone: 'zinc' };
  if (row.effectiveFrom && new Date(row.effectiveFrom).getTime() > now) return { label: 'Scheduled', tone: 'blue' };
  return { label: 'Effective', tone: 'emerald' };
}

export async function FormsPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const tab = statusFilter(params.tab, tabs, 'intake');
  const overview = await getFormsOverview();
  const breadcrumbs = [{ label: 'Forms & consent' }];

  if (overview.status !== 'loaded') {
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Forms & consent" icon={ClipboardList} />
        {overview.status === 'restricted'
          ? <EmptyState icon={ClipboardList} title="Clinical access required" />
          : <ErrorState id="forms-unavailable" title="Forms unavailable" message="Forms could not be loaded." action={<Track><PillLink href="/dashboard/platform/forms">Retry</PillLink></Track>} />}
      </PlatformPage>
    );
  }

  const awaiting = overview.submissions.filter((row) => row.status === 'submitted' || row.status === 'in_review');
  const effectiveConsents = overview.consentTemplates.filter((row) => consentState(row).label === 'Effective');
  const href = (value: string) => value === 'intake' ? '/dashboard/platform/forms' : `/dashboard/platform/forms?tab=${value}`;

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader
        title="Forms & consent"
        icon={ClipboardList}
        status={awaiting.length ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone="amber" />{awaiting.length} to review</span> : null}
        actions={tab === 'intake' ? <Track><FormEditorSheet kind="intake" links={overview.services} triggerLabel="New intake form" triggerVariant="primary" /></Track>
          : tab === 'templates' ? <Track><FormEditorSheet kind="template" links={overview.categories} triggerLabel="New template" triggerVariant="primary" /></Track>
          : tab === 'consent' && overview.canPublishConsent ? <Track><ConsentPublishSheet services={overview.services} /></Track> : null}
      />
      <MetricStrip items={[
        { label: 'Active intake forms', value: overview.intakeForms.filter((row) => row.isActive).length, href: href('intake') },
        { label: 'Active templates', value: overview.templates.filter((row) => row.isActive).length, href: href('templates') },
        { label: 'Effective consents', value: effectiveConsents.length, href: href('consent') },
        { label: 'Awaiting review', value: awaiting.length, tone: awaiting.length ? 'amber' : undefined, href: href('submissions') },
      ]} />
      <SegmentTabs label="Forms sections" active={tab} tabs={[
        { value: 'intake', label: 'Intake forms', href: href('intake'), count: overview.intakeForms.length },
        { value: 'templates', label: 'Templates', href: href('templates'), count: overview.templates.length },
        { value: 'consent', label: 'Consent', href: href('consent'), count: overview.consentTemplates.length },
        { value: 'submissions', label: 'Submissions', href: href('submissions'), count: awaiting.length },
      ]} />

      {tab === 'intake' ? (
        overview.intakeForms.length ? (
          <ul className="grid gap-3">
            {overview.intakeForms.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 rounded-2xl border bg-background p-4 md:flex-row md:items-center md:justify-between md:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="min-w-0 break-words text-base font-semibold">{row.name}</h2>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone={row.isActive ? 'emerald' : 'zinc'} />{row.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{row.fields.length} fields · {row.submissionsCount} submissions · updated {date(row.updatedAt)}</p>
                  {row.requiredForServices.length ? <div className="mt-2 flex flex-wrap gap-1.5">{row.requiredForServices.map((service) => <Chip key={service.id}>{service.name}</Chip>)}</div> : null}
                </div>
                <Track><FormEditorSheet kind="intake" row={row} links={overview.services} triggerLabel="Edit" /></Track>
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={FileText} title="No intake forms" />
      ) : null}

      {tab === 'templates' ? (
        overview.templates.length ? (
          <ul className="grid gap-3">
            {overview.templates.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 rounded-2xl border bg-background p-4 md:flex-row md:items-center md:justify-between md:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="min-w-0 break-words text-base font-semibold">{row.name}</h2>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone={row.isActive ? 'emerald' : 'zinc'} />{row.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{humanize(row.type)} · v{row.version} · {row.fields.length} fields · {row.submissionsCount} submissions</p>
                  {row.requiredForCategories.length ? <div className="mt-2 flex flex-wrap gap-1.5">{row.requiredForCategories.map((category) => <Chip key={category.id}>{category.name}</Chip>)}</div> : null}
                </div>
                {row.isActive ? <Track><FormEditorSheet kind="template" row={row} links={overview.categories} triggerLabel="Edit" /></Track> : null}
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={FileText} title="No form templates" />
      ) : null}

      {tab === 'consent' ? (
        overview.consentTemplates.length ? (
          <ul className="grid gap-3">
            {overview.consentTemplates.map((row) => {
              const state = consentState(row);
              return (
                <li key={row.id} className="flex flex-col gap-3 rounded-2xl border bg-background p-4 md:flex-row md:items-center md:justify-between md:p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="min-w-0 break-words text-base font-semibold">{row.service?.name || 'Treatment'} · v{row.version}</h2>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone={state.tone} />{state.label}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{row.jurisdiction} · {row.language} · from {date(row.effectiveFrom)}{row.effectiveUntil ? ` to ${date(row.effectiveUntil)}` : ''} · {row.recordsCount} signed</p>
                  </div>
                  {overview.canPublishConsent && !row.supersededBy && state.label !== 'Ended' ? <Track><ConsentPublishSheet services={overview.services} supersede={row} /></Track> : null}
                </li>
              );
            })}
          </ul>
        ) : <EmptyState icon={FileSignature} title="No consent templates" action={overview.canPublishConsent ? <Track><ConsentPublishSheet services={overview.services} /></Track> : undefined} />
      ) : null}

      {tab === 'submissions' ? (
        overview.submissions.length ? (
          <ul className="grid gap-3">
            {overview.submissions.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 rounded-2xl border bg-background p-4 md:flex-row md:items-center md:justify-between md:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="min-w-0 break-words text-base font-semibold">{row.client?.name || 'Client'}</h2>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone={submissionTone[row.status] || 'zinc'} />{humanize(row.status)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {row.template?.name || 'Form'}{row.templateVersion ? ` v${row.templateVersion}` : ''} · submitted {date(row.submittedAt)}
                    {row.appointment?.startTime ? ` · visit ${date(row.appointment.startTime)}` : ''}
                    {row.reviewActions[0] ? ` · ${humanize(row.reviewActions[0].disposition)} by ${row.reviewActions[0].reviewer?.name || 'staff'}` : ''}
                  </p>
                </div>
                {row.status === 'submitted' || row.status === 'in_review' ? <Track><SubmissionReviewSheet submission={row} /></Track> : null}
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={Inbox} title="No submissions" />
      ) : null}
    </PlatformPage>
  );
}
