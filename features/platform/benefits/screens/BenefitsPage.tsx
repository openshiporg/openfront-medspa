import Link from 'next/link';
import type { ReactNode } from 'react';
import { BadgePercent, CreditCard, Gift, Package, Ticket } from 'lucide-react';
import {
  Chip, EmptyState, ErrorState, Fact, MetricStrip, PageHeader, PillLink, PlatformPage, SegmentTabs, StatusDot, TitleStatus, Track, usd,
  type Tone,
} from '@/features/platform/components/medspa-ui';
import { PracticeSetupState } from '@/features/platform/components/PracticeSetupState';
import { hasPracticeSetup } from '@/features/platform/lib/practiceSetup';
import { getBenefitsData } from '../actions/benefits';
import { BENEFIT_TABS, type BenefitsTab, type ClientMembershipRow, type ClientPackageRow, type GiftCardRow, type MembershipPlan, type PackagePlan, type ServiceOption } from '../types';
import {
  AcceptTermsSheet, EnrollMembershipSheet, GiftCardBalanceSheet, IssueGiftCardSheet, MembershipPlanSheet, MembershipTransitionSheet,
  PackagePlanSheet, ReverseUsageSheet, SellPackageSheet,
} from '../components/BenefitForms';

const BASE = '/dashboard/platform/benefits';

function date(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

const statusTone: Record<string, Tone> = { active: 'emerald', paused: 'amber', cancelled: 'zinc', expired: 'zinc', 'fully-used': 'blue' };
const statusLabel: Record<string, string> = { active: 'Active', paused: 'Paused', cancelled: 'Cancelled', expired: 'Expired', 'fully-used': 'Fully used' };

function Row({ title, status, meta, actions, children }: { title: ReactNode; status?: ReactNode; meta?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <article className="min-w-0 rounded-[6px] border bg-background p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="min-w-0 break-words text-base font-semibold">{title}</h3>
            {status}
          </div>
          {meta ? <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </article>
  );
}

function StatusFilter({ active, counts, tab }: { active: string; counts: Record<string, number>; tab: BenefitsTab }) {
  const options = tab === 'memberships' ? ['all', 'active', 'paused', 'cancelled'] : ['all', 'active', 'fully-used', 'expired', 'cancelled'];
  return (
    <SegmentTabs
      label="Status"
      active={active}
      tabs={options.map((value) => ({ value, label: value === 'all' ? 'All' : statusLabel[value], href: `${BASE}?tab=${tab}${value === 'all' ? '' : `&status=${value}`}`, count: value === 'all' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[value] || 0 }))}
    />
  );
}

function countBy<T>(rows: T[], key: (row: T) => string | null | undefined) {
  const out: Record<string, number> = {};
  for (const row of rows) { const value = key(row) || 'unknown'; out[value] = (out[value] || 0) + 1; }
  return out;
}

export async function BenefitsPage({ searchParams }: { searchParams?: Promise<{ tab?: string; status?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const tab = (BENEFIT_TABS.find((item) => item.value === params.tab)?.value || 'plans') as BenefitsTab;
  const status = params.status || 'all';
  const data = await getBenefitsData(tab);
  const breadcrumbs = [{ label: 'Memberships & packages' }];

  if (data.status === 'unavailable') {
    const practiceReady = await hasPracticeSetup();
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Memberships & packages" icon={Ticket} />
        {practiceReady === false ? <PracticeSetupState /> : <ErrorState id="benefits-unavailable" title="Memberships & packages unavailable" message="These records could not be loaded." action={<Track><PillLink href={`${BASE}?tab=${tab}`}>Retry</PillLink></Track>} />}
      </PlatformPage>
    );
  }

  const tabs = BENEFIT_TABS.map((item) => ({ value: item.value, label: item.label, href: `${BASE}?tab=${item.value}` }));
  const action = tab === 'plans' ? <Track><MembershipPlanSheet services={data.services} /></Track>
    : tab === 'packages' ? <Track><PackagePlanSheet services={data.services} /></Track>
    : tab === 'memberships' ? <Track><EnrollMembershipSheet clients={data.clients} plans={data.memberships.filter((plan) => plan.isActive)} /></Track>
    : tab === 'client-packages' ? <Track><SellPackageSheet clients={data.clients} packages={data.packages.filter((plan) => plan.isActive)} /></Track>
    : <Track><IssueGiftCardSheet /></Track>;

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader title="Memberships & packages" icon={Ticket} actions={action} />
      <SegmentTabs label="Benefits" active={tab} tabs={tabs} />
      {tab === 'plans' ? <PlansTab plans={data.memberships} services={data.services} /> : null}
      {tab === 'packages' ? <PackagesTab packages={data.packages} services={data.services} /> : null}
      {tab === 'memberships' ? <ClientMembershipsTab rows={data.clientMemberships} status={status} /> : null}
      {tab === 'client-packages' ? <ClientPackagesTab rows={data.clientPackages} status={status} /> : null}
      {tab === 'gift-cards' ? <GiftCardsTab rows={data.giftCards} /> : null}
    </PlatformPage>
  );
}

function PlansTab({ plans, services }: { plans: MembershipPlan[]; services: ServiceOption[] }) {
  if (!plans.length) return <EmptyState icon={BadgePercent} title="No membership plans" action={<Track><MembershipPlanSheet services={services} /></Track>} />;
  return (
    <>
      <MetricStrip items={[
        { label: 'Plans', value: plans.length },
        { label: 'Available', value: plans.filter((plan) => plan.isActive).length, tone: 'emerald' },
        { label: 'Members', value: plans.reduce((sum, plan) => sum + plan.activeCount, 0) },
        { label: 'Monthly recurring', value: usd(plans.reduce((sum, plan) => sum + plan.activeCount * Number(plan.monthlyPrice || 0), 0), { whole: true }) },
      ]} />
      <section className="grid gap-3 lg:grid-cols-2">
        {plans.map((plan) => (
          <Row key={plan.id}
            title={plan.name}
            status={<TitleStatus tone={plan.isActive ? 'emerald' : 'zinc'}>{plan.isActive ? 'Available' : 'Hidden'}</TitleStatus>}
            meta={<><span className="tabular-nums">{usd(plan.monthlyPrice)}/mo</span><span>{plan.discountPercent || 0}% off treatments</span><span>{plan.activeCount} members</span></>}
            actions={<Track><MembershipPlanSheet plan={plan} services={services} /></Track>}
          >
            {plan.includedServices.length ? <div className="flex flex-wrap gap-1.5">{plan.includedServices.map((service) => <Chip key={service.id}>{service.name}</Chip>)}</div> : <p className="text-sm text-muted-foreground">No treatments included</p>}
          </Row>
        ))}
      </section>
    </>
  );
}

function PackagesTab({ packages, services }: { packages: PackagePlan[]; services: ServiceOption[] }) {
  if (!packages.length) return <EmptyState icon={Package} title="No packages" action={<Track><PackagePlanSheet services={services} /></Track>} />;
  return (
    <section className="grid gap-3 lg:grid-cols-2">
      {packages.map((plan) => (
        <Row key={plan.id}
          title={plan.name}
          status={<TitleStatus tone={plan.isActive ? 'emerald' : 'zinc'}>{plan.isActive ? 'Available' : 'Hidden'}</TitleStatus>}
          meta={<><span className="tabular-nums">{usd(plan.totalPrice)}</span>{plan.savingsAmount ? <span className="tabular-nums">+{usd(plan.savingsAmount)} value</span> : null}<span>{plan.validDays} days</span></>}
          actions={<Track><PackagePlanSheet plan={plan} services={services} /></Track>}
        >
          {plan.services.length ? <div className="flex flex-wrap gap-1.5">{plan.services.map((service) => <Chip key={service.id}>{service.name}</Chip>)}</div> : <p className="text-sm text-amber-700 dark:text-amber-300">No treatments: can't be redeemed</p>}
        </Row>
      ))}
    </section>
  );
}

function ClientMembershipsTab({ rows, status }: { rows: ClientMembershipRow[]; status: string }) {
  const counts = countBy(rows, (row) => row.status);
  const visible = status === 'all' ? rows : rows.filter((row) => row.status === status);
  const active = rows.filter((row) => row.status === 'active');
  return (
    <>
      <MetricStrip items={[
        { label: 'Active', value: counts.active || 0, tone: 'emerald' },
        { label: 'Paused', value: counts.paused || 0, tone: 'amber' },
        { label: 'Terms missing', value: rows.filter((row) => row.status !== 'cancelled' && !row.agreements.length).length, tone: 'rose' },
        { label: 'Monthly recurring', value: usd(active.reduce((sum, row) => sum + Number(row.membership?.monthlyPrice || 0), 0), { whole: true }) },
      ]} />
      <StatusFilter active={status} counts={counts} tab="memberships" />
      {!visible.length ? <EmptyState icon={BadgePercent} title="No memberships in this view" /> : (
        <section className="grid gap-3">
          {visible.map((row) => {
            const agreement = row.agreements[0];
            const open = row.status !== 'cancelled';
            return (
              <Row key={row.id}
                title={row.client?.name || row.client?.email || 'Client'}
                status={<TitleStatus tone={statusTone[row.status || ''] || 'zinc'}>{statusLabel[row.status || ''] || row.status}</TitleStatus>}
                meta={<><span>{row.membership?.name}</span><span className="tabular-nums">{usd(row.membership?.monthlyPrice)}/mo</span><span>Since {date(row.startDate)}</span>{open ? <span>Next bill {date(row.nextBillingDate)}</span> : null}</>}
                actions={open ? (
                  <Track>
                    {!agreement ? <AcceptTermsSheet row={row} /> : null}
                    {agreement && row.status === 'active' ? <MembershipTransitionSheet row={row} action="freeze" /> : null}
                    {agreement && row.status === 'paused' ? <MembershipTransitionSheet row={row} action="resume" /> : null}
                    {agreement ? <MembershipTransitionSheet row={row} action="cancel" /> : null}
                  </Track>
                ) : null}
              >
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Fact label="Terms">{agreement ? <span className="inline-flex items-center gap-1.5"><StatusDot tone="emerald" />{agreement.termsVersion} · {date(agreement.acceptedAt)}</span> : <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-300"><StatusDot tone="rose" />Not accepted</span>}</Fact>
                  <Fact label="Discount">{row.membership?.discountPercent || 0}%</Fact>
                  <Fact label="Treatments">{row.membership?.includedServices.length || 0}</Fact>
                  <Fact label="Last entry">{row.ledgerEntries[0] ? `${row.ledgerEntries[0].type} · ${date(row.ledgerEntries[0].occurredAt)}` : '—'}</Fact>
                </dl>
              </Row>
            );
          })}
        </section>
      )}
    </>
  );
}

function ClientPackagesTab({ rows, status }: { rows: ClientPackageRow[]; status: string }) {
  const counts = countBy(rows, (row) => row.status);
  const visible = status === 'all' ? rows : rows.filter((row) => row.status === status);
  const liability = rows.filter((row) => row.status === 'active').reduce((sum, row) => sum + Math.max(0, Number(row.totalValue || 0) - Number(row.usedValue || 0)), 0);
  return (
    <>
      <MetricStrip items={[
        { label: 'Active', value: counts.active || 0, tone: 'emerald' },
        { label: 'Unused value', value: usd(liability, { whole: true }) },
        { label: 'Sold', value: usd(rows.reduce((sum, row) => sum + Number(row.paidAmount || 0), 0), { whole: true }) },
        { label: 'Fully used', value: counts['fully-used'] || 0 },
      ]} />
      <StatusFilter active={status} counts={counts} tab="client-packages" />
      {!visible.length ? <EmptyState icon={Package} title="No packages in this view" /> : (
        <section className="grid gap-3">
          {visible.map((row) => {
            const total = Number(row.totalValue || 0);
            const used = Number(row.usedValue || 0);
            const percent = total ? Math.min(100, Math.round((used / total) * 100)) : 0;
            const reversed = new Set(row.adjustments.filter((item) => item.type === 'reverse').map((item) => item.usage?.id));
            return (
              <Row key={row.id}
                title={row.client?.name || row.client?.email || 'Client'}
                status={<TitleStatus tone={statusTone[row.status || ''] || 'zinc'}>{statusLabel[row.status || ''] || row.status}</TitleStatus>}
                meta={<><span>{row.package?.name}</span><span>Bought {date(row.purchasedAt)}</span><span>Expires {date(row.expiresAt)}</span></>}
              >
                <div className="grid gap-3">
                  <div>
                    <div className="flex justify-between text-sm"><span className="tabular-nums">{usd(Math.max(0, total - used))} left</span><span className="tabular-nums text-muted-foreground">{usd(used)} of {usd(total)} used</span></div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-violet-500" style={{ width: `${percent}%` }} /></div>
                  </div>
                  {row.usageHistory.length ? (
                    <details className="group rounded-[6px] border">
                      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium">Usage · {row.usageHistory.length}</summary>
                      <ul className="divide-y border-t">
                        {row.usageHistory.map((usage) => (
                          <li key={usage.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                            <span className="min-w-0">
                              {usage.service?.name || 'Treatment'} · <span className="tabular-nums">{usd(usage.valueUsed)}</span> · {date(usage.usedAt)}
                              {usage.appointment ? <> · <Link className="underline underline-offset-4" href={`/dashboard/platform/appointments/${usage.appointment.id}`}>Appointment</Link></> : null}
                            </span>
                            {reversed.has(usage.id) ? <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><StatusDot tone="zinc" />Reversed</span> : <Track><ReverseUsageSheet usageId={usage.id} label={usage.service?.name || 'usage'} /></Track>}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              </Row>
            );
          })}
        </section>
      )}
    </>
  );
}

function GiftCardsTab({ rows }: { rows: GiftCardRow[] }) {
  if (!rows.length) return <EmptyState icon={Gift} title="No gift cards" action={<Track><IssueGiftCardSheet /></Track>} />;
  const outstanding = rows.filter((row) => row.isActive).reduce((sum, row) => sum + Number(row.currentBalance || 0), 0);
  return (
    <>
      <MetricStrip items={[
        { label: 'Active cards', value: rows.filter((row) => row.isActive).length, tone: 'emerald' },
        { label: 'Outstanding balance', value: usd(outstanding, { whole: true }) },
        { label: 'Issued value', value: usd(rows.reduce((sum, row) => sum + Number(row.initialValue || 0), 0), { whole: true }) },
      ]} />
      <section className="grid gap-3">
        {rows.map((row) => (
          <Row key={row.id}
            title={<span className="font-mono tracking-wide">{row.code}</span>}
            status={<TitleStatus tone={row.isActive ? 'emerald' : 'zinc'}>{row.isActive ? 'Active' : Number(row.currentBalance || 0) === 0 ? 'Spent' : 'Inactive'}</TitleStatus>}
            meta={<><span className="tabular-nums">{usd(row.currentBalance)} of {usd(row.initialValue)}</span>{row.recipientName ? <span>{row.recipientName}</span> : null}{row.recipientEmail ? <span className="break-all">{row.recipientEmail}</span> : null}<span>Issued {date(row.createdAt)}</span>{row.expiresAt ? <span>Expires {date(row.expiresAt)}</span> : null}</>}
            actions={<Track>
              {row.isActive && Number(row.currentBalance || 0) > 0 ? <GiftCardBalanceSheet giftCardId={row.id} code={row.code} action="redemption" /> : null}
              {Number(row.currentBalance || 0) < Number(row.initialValue || 0) ? <GiftCardBalanceSheet giftCardId={row.id} code={row.code} action="refund" /> : null}
            </Track>}
          >
            {row.transactions.length ? (
              <details className="rounded-[6px] border">
                <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium"><CreditCard className="mr-1.5 inline size-3.5 text-muted-foreground" />Transactions · {row.transactions.length}</summary>
                <ul className="divide-y border-t">
                  {row.transactions.map((tx) => (
                    <li key={tx.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="capitalize">{tx.type}{tx.notes ? <span className="normal-case text-muted-foreground"> · {tx.notes}</span> : null}</span>
                      <span className="tabular-nums">{Number(tx.amount || 0) < 0 ? '−' : '+'}{usd(Math.abs(Number(tx.amount || 0)))} · {date(tx.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </Row>
        ))}
      </section>
    </>
  );
}
