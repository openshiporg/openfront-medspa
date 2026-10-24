import Link from 'next/link';
import { ChevronRight, KeyRound, MailPlus, UsersRound } from 'lucide-react';
import {
  Avatar, Chip, EmptyState, ErrorState, MetricStrip, PageHeader, Panel, PillLink, PlatformPage, TitleStatus, Track,
} from '@/features/platform/components/medspa-ui';
import { PracticeSetupState } from '@/features/platform/components/PracticeSetupState';
import { hasPracticeSetup } from '@/features/platform/lib/practiceSetup';
import { getStaffDirectory } from '../actions/staff';
import { CreateProviderSheet, InviteStaffSheet, RoleSheet } from '../components/StaffForms';
import { credentialState, providerState, roleLabel, shortDate } from '../lib/format';
import { CAPABILITIES, type StaffProvider } from '../types';

export async function StaffListPage() {
  const directory = await getStaffDirectory();
  const breadcrumbs = [{ label: 'Staff' }];

  if (directory.status === 'unavailable') {
    const practiceReady = await hasPracticeSetup();
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Staff" icon={UsersRound} />
        {practiceReady === false ? <PracticeSetupState /> : <ErrorState id="staff-unavailable" title="Staff unavailable" action={<Track><PillLink href="/dashboard/platform/staff">Retry</PillLink></Track>} />}
      </PlatformPage>
    );
  }

  const { providers, roles, invitations, locations, unlinkedUsers } = directory;
  const active = providers.filter((provider) => provider.status === 'active' && provider.isActive);
  const onLeave = providers.filter((provider) => provider.status === 'on_leave').length;
  const online = active.filter((provider) => provider.isPublic).length;

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader
        title="Staff"
        icon={UsersRound}
        actions={
          <Track>
            <InviteStaffSheet roles={roles} locations={locations} />
            <RoleSheet />
            {unlinkedUsers.length ? <CreateProviderSheet users={unlinkedUsers} locations={locations} /> : null}
          </Track>
        }
      />

      <MetricStrip items={[
        { label: 'Active providers', value: active.length, tone: 'emerald' },
        { label: 'Bookable online', value: online, tone: online ? 'violet' : undefined },
        { label: 'On leave', value: onLeave, tone: onLeave ? 'amber' : undefined },
        { label: 'Pending invitations', value: invitations.length, tone: invitations.length ? 'blue' : undefined },
      ]} />

      {providers.length === 0 ? (
        <EmptyState icon={UsersRound} title="No providers" />
      ) : (
        <section aria-label="Providers" className="overflow-hidden rounded-2xl border bg-background">
          <ul className="divide-y">
            {providers.map((provider) => <ProviderRow key={provider.id} provider={provider} />)}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Pending invitations" icon={MailPlus} padded={false}>
          {invitations.length ? (
            <ul className="divide-y">
              {invitations.map((invitation) => (
                <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{invitation.email}</p>
                    <p className="text-xs text-muted-foreground">{invitation.role?.name || 'Role'} · expires {shortDate(invitation.expiresAt)}</p>
                  </div>
                  <TitleStatus tone={invitation.expiresAt && new Date(invitation.expiresAt) < new Date() ? 'rose' : 'blue'}>{invitation.expiresAt && new Date(invitation.expiresAt) < new Date() ? 'Expired' : 'Pending'}</TitleStatus>
                </li>
              ))}
            </ul>
          ) : <p className="px-4 py-6 text-sm text-muted-foreground md:px-5">No pending invitations</p>}
        </Panel>

        <Panel title="Roles" icon={KeyRound} padded={false}>
          {roles.length ? (
            <ul className="divide-y">
              {roles.map((role) => {
                const granted = CAPABILITIES.filter(([key]) => role.capabilities[key]).map(([, label]) => label);
                return (
                  <li key={role.id} className="flex items-start justify-between gap-3 px-4 py-3 md:px-5">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">{role.name}<span className="text-xs font-normal text-muted-foreground">{role.assignedToCount} {role.assignedToCount === 1 ? 'person' : 'people'}</span></p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{granted.length ? granted.join(' · ') : 'No access'}</p>
                    </div>
                    <Track><RoleSheet role={role} /></Track>
                  </li>
                );
              })}
            </ul>
          ) : <p className="px-4 py-6 text-sm text-muted-foreground md:px-5">No roles</p>}
        </Panel>
      </div>
    </PlatformPage>
  );
}

function ProviderRow({ provider }: { provider: StaffProvider }) {
  const state = providerState(provider);
  const credential = credentialState(provider.credentials);
  const name = provider.user?.name || 'Unnamed provider';
  return (
    <li>
      <Link href={`/dashboard/platform/staff/${provider.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 md:px-5">
        <Avatar name={name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="truncate text-sm font-semibold">{name}</h2>
            <TitleStatus tone={state.tone}>{state.label}</TitleStatus>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {[provider.title || roleLabel(provider.role), provider.locations.map((location) => location.name).join(', ')].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip>{provider.specializations.length} {provider.specializations.length === 1 ? 'treatment' : 'treatments'}</Chip>
            <Chip tone={credential.tone}>{credential.label}</Chip>
            {provider.isPublic ? <Chip tone="violet">Online</Chip> : null}
            {!provider.schedulesCount ? <Chip tone="amber">No hours</Chip> : null}
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}
