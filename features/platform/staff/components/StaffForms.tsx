'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound, Pencil, Plus, ShieldCheck, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pillClass, trackClass } from '@/features/platform/components/pill';
import { StatusDot } from '@/features/platform/components/medspa-ui';
import { WorkflowSheet, all, area, check, control, field, on, str } from './WorkflowSheet';
import {
  configureAuthorization, createProviderForUser, inviteStaffMember, registerCredential, saveAccessRole, saveProviderProfile, transitionAuthority,
} from '../actions/staff';
import {
  CAPABILITIES, PROVIDER_ROLES, PROVIDER_STATUSES, PROVIDER_TIERS,
  type StaffCredential, type StaffLocationOption, type StaffProvider, type StaffRole, type StaffServiceOption, type StaffUserOption,
} from '../types';

function LocationChecks({ locations, selected, name = 'locationIds' }: { locations: StaffLocationOption[]; selected?: string[]; name?: string }) {
  if (!locations.length) return <p className="text-sm text-muted-foreground">No locations</p>;
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Locations</legend>
      {locations.map((location) => (
        <label key={location.id} className={check}>
          <input type="checkbox" name={name} value={location.id} defaultChecked={selected?.includes(location.id)} disabled={!location.isActive && !selected?.includes(location.id)} className="size-4" />
          <span className="min-w-0 flex-1 truncate">{location.name}</span>
          {!location.isActive ? <span className="text-xs text-muted-foreground">Inactive</span> : null}
        </label>
      ))}
    </fieldset>
  );
}

/** Invite a staff email to a role. The invitation link is shown once after it is created. */
export function InviteStaffSheet({ roles, locations }: { roles: StaffRole[]; locations: StaffLocationOption[] }) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  return (
    <>
      <WorkflowSheet
        trigger={<><UserPlus />Invite staff</>}
        triggerVariant="primary"
        title="Invite staff"
        submitLabel="Create invitation"
        submit={(form, idempotencyKey) => {
          if (!str(form, 'roleId')) return Promise.resolve({ success: false, error: 'Choose a role' });
          return inviteStaffMember({ email: str(form, 'email'), roleId: str(form, 'roleId'), locationIds: all(form, 'locationIds'), expiresInHours: Number(str(form, 'expiresInHours')) || 72, idempotencyKey });
        }}
        onDone={(result) => { if (result.token) { setLink(`${window.location.origin}/join?token=${encodeURIComponent(result.token)}`); setCopied(false); } }}
      >
        <label className={field}>Email<input className={control} name="email" type="email" required maxLength={254} autoComplete="off" /></label>
        <label className={field}>Role
          <select className={control} name="roleId" required defaultValue="">
            <option value="" disabled>{roles.length ? 'Choose a role' : 'Create a role first'}</option>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </label>
        <LocationChecks locations={locations} />
        <label className={field}>Link expires
          <select className={control} name="expiresInHours" defaultValue="72">
            <option value="24">24 hours</option><option value="72">3 days</option><option value="168">7 days</option>
          </select>
        </label>
      </WorkflowSheet>
      {link ? (
        <div role="status" className="flex w-full min-w-0 flex-col gap-2 rounded-2xl border bg-background p-3 sm:w-auto">
          <p className="flex items-center gap-2 text-sm font-medium"><StatusDot tone="emerald" />Invitation link</p>
          <code className="block max-w-full truncate rounded-lg bg-muted px-2 py-1 text-xs">{link}</code>
          <div className={cn(trackClass, 'self-start')}>
            <button type="button" className={pillClass('raised', 'sm')} onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); } }}>{copied ? <Check /> : <Copy />}{copied ? 'Copied' : 'Copy link'}</button>
            <button type="button" className={pillClass('quiet', 'sm')} onClick={() => setLink(null)}>Done</button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function RoleSheet({ role }: { role?: StaffRole }) {
  return (
    <WorkflowSheet
      trigger={role ? <><Pencil />Edit</> : <><KeyRound />New role</>}
      triggerSize={role ? 'sm' : 'md'}
      title={role ? `Edit ${role.name}` : 'New role'}
      submitLabel="Save role"
      submit={(form, idempotencyKey) => saveAccessRole({
        roleId: role?.id || null, name: str(form, 'name'), idempotencyKey,
        capabilities: Object.fromEntries(CAPABILITIES.map(([key]) => [key, on(form, key)])),
      })}
    >
      <label className={field}>Name<input className={control} name="name" required maxLength={120} defaultValue={role?.name} /></label>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Access</legend>
        {CAPABILITIES.map(([key, label]) => (
          <label key={key} className={check}><input type="checkbox" name={key} defaultChecked={role?.capabilities[key]} className="size-4" />{label}</label>
        ))}
      </fieldset>
    </WorkflowSheet>
  );
}

export function CreateProviderSheet({ users, locations }: { users: StaffUserOption[]; locations: StaffLocationOption[] }) {
  return (
    <WorkflowSheet
      trigger={<><Plus />Provider profile</>}
      title="Add provider profile"
      submitLabel="Create profile"
      submit={(form, idempotencyKey) => {
        const locationIds = all(form, 'locationIds');
        if (!locationIds.length) return Promise.resolve({ success: false, error: 'Choose at least one location' });
        return createProviderForUser({ userId: str(form, 'userId'), role: str(form, 'role'), title: str(form, 'title'), locationIds, idempotencyKey });
      }}
    >
      <label className={field}>Staff member
        <select className={control} name="userId" required defaultValue="">
          <option value="" disabled>Choose a person</option>
          {users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>Role<select className={control} name="role" defaultValue="provider">{PROVIDER_ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className={field}>Title<input className={control} name="title" maxLength={120} /></label>
      </div>
      <LocationChecks locations={locations} />
    </WorkflowSheet>
  );
}

export function ProviderProfileSheet({ provider, locations, services, size = 'md' }: { provider: StaffProvider; locations: StaffLocationOption[]; services: StaffServiceOption[]; size?: 'sm' | 'md' }) {
  const selected = new Set(provider.specializations.map((item) => item.id));
  return (
    <WorkflowSheet
      trigger={<><Pencil />Edit profile</>}
      triggerSize={size}
      title={`Edit ${provider.user?.name || 'provider'}`}
      submitLabel="Save profile"
      wide
      submit={(form, idempotencyKey) => {
        const locationIds = all(form, 'locationIds');
        if (!locationIds.length) return Promise.resolve({ success: false, error: 'Choose at least one location' });
        const status = str(form, 'status');
        return saveProviderProfile({
          providerId: provider.id, title: str(form, 'title'), bio: str(form, 'bio'), role: str(form, 'role'), tier: str(form, 'tier'), status,
          isActive: status === 'active', isPublic: on(form, 'isPublic'), specializationIds: all(form, 'specializationIds'), locationIds, idempotencyKey,
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>Title<input className={control} name="title" maxLength={120} defaultValue={provider.title || ''} /></label>
        <label className={field}>Role<select className={control} name="role" defaultValue={provider.role || 'provider'}>{PROVIDER_ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className={field}>Tier<select className={control} name="tier" defaultValue={provider.tier || 'junior'}>{PROVIDER_TIERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className={field}>Status<select className={control} name="status" defaultValue={provider.status === 'active' && provider.isActive ? 'active' : provider.status || 'inactive'}>{PROVIDER_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <label className={check}><input type="checkbox" name="isPublic" defaultChecked={provider.isPublic === true} className="size-4" />Bookable online</label>
      <label className={field}>Bio<textarea className={area} name="bio" maxLength={4000} defaultValue={provider.bio || ''} /></label>
      <LocationChecks locations={locations} selected={provider.locations.map((item) => item.id)} />
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Treatments</legend>
        {services.length ? services.map((service) => (
          <label key={service.id} className={check}>
            <input type="checkbox" name="specializationIds" value={service.id} defaultChecked={selected.has(service.id)} className="size-4" />
            <span className="min-w-0 flex-1 truncate">{service.name}</span>
            {service.restricted ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" />Authority</span> : null}
            {service.status !== 'active' ? <span className="text-xs text-muted-foreground">Inactive</span> : null}
          </label>
        )) : <p className="text-sm text-muted-foreground">No treatments</p>}
      </fieldset>
    </WorkflowSheet>
  );
}

const today = () => new Date().toISOString().slice(0, 10);
const isoDate = (value: string) => (value ? new Date(`${value}T00:00:00`).toISOString() : '');

export function CredentialSheet({ providerId, locations, supervisors }: { providerId: string; locations: StaffLocationOption[]; supervisors: Array<{ id: string; name: string }> }) {
  return (
    <WorkflowSheet
      trigger={<><Plus />Credential</>}
      title="Register credential"
      submitLabel="Register"
      wide
      submit={(form, idempotencyKey) => {
        const supervisionRequired = on(form, 'supervisionRequired');
        const scope = str(form, 'scope');
        return registerCredential({
          providerId, locationId: str(form, 'locationId') || null, licenseType: str(form, 'licenseType'), licenseNumber: str(form, 'licenseNumber'),
          jurisdiction: str(form, 'jurisdiction'), effectiveFrom: isoDate(str(form, 'effectiveFrom')), expiresAt: isoDate(str(form, 'expiresAt')),
          verificationSource: str(form, 'verificationSource'), evidenceReference: str(form, 'evidenceReference'),
          scopeEvidence: { scope, recordedFrom: 'platform-staff' }, supervisionRequired,
          supervisorId: supervisionRequired ? str(form, 'supervisorId') || null : null, protocolVersion: str(form, 'protocolVersion'), idempotencyKey,
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>License type<input className={control} name="licenseType" required maxLength={120} /></label>
        <label className={field}>License number<input className={control} name="licenseNumber" required maxLength={120} /></label>
        <label className={field}>Jurisdiction<input className={control} name="jurisdiction" required maxLength={120} /></label>
        <label className={field}>Location
          <select className={control} name="locationId" defaultValue=""><option value="">All locations</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select>
        </label>
        <label className={field}>Effective from<input className={control} name="effectiveFrom" type="date" required defaultValue={today()} /></label>
        <label className={field}>Expires<input className={control} name="expiresAt" type="date" required /></label>
        <label className={field}>Verified with<input className={control} name="verificationSource" required maxLength={200} /></label>
        <label className={field}>Verification reference<input className={control} name="evidenceReference" required maxLength={200} /></label>
        <label className={field}>Protocol version<input className={control} name="protocolVersion" required maxLength={60} defaultValue="v1" /></label>
      </div>
      <label className={field}>Scope<textarea className={area} name="scope" required maxLength={2000} /></label>
      <label className={check}><input type="checkbox" name="supervisionRequired" className="size-4" />Supervision required</label>
      <label className={field}>Supervisor
        <select className={control} name="supervisorId" defaultValue=""><option value="">None</option>{supervisors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </label>
    </WorkflowSheet>
  );
}

export function AuthorizationSheet({ providerId, credentials, locations, services, supervisors }: { providerId: string; credentials: StaffCredential[]; locations: StaffLocationOption[]; services: StaffServiceOption[]; supervisors: Array<{ id: string; name: string }> }) {
  const verified = credentials.filter((item) => item.status === 'verified');
  return (
    <WorkflowSheet
      trigger={<><ShieldCheck />Authorize treatment</>}
      title="Authorize treatment"
      submitLabel="Authorize"
      wide
      submit={(form, idempotencyKey) => {
        const supervisionRequired = on(form, 'supervisionRequired');
        const effectiveTo = str(form, 'effectiveTo');
        return configureAuthorization({
          providerId, credentialId: str(form, 'credentialId'), locationId: str(form, 'locationId'), serviceId: str(form, 'serviceId'),
          requiredSupervisorId: supervisionRequired ? str(form, 'requiredSupervisorId') || null : null, supervisionRequired,
          supervisionMode: supervisionRequired ? str(form, 'supervisionMode') : '', effectiveFrom: isoDate(str(form, 'effectiveFrom')),
          effectiveTo: effectiveTo ? isoDate(effectiveTo) : null, policyVersion: str(form, 'policyVersion'), evidenceLabel: str(form, 'evidenceLabel'),
          evidenceReference: str(form, 'evidenceReference'), authorityEvidence: { basis: str(form, 'basis'), recordedFrom: 'platform-staff' }, idempotencyKey,
        });
      }}
    >
      {!verified.length ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><StatusDot tone="amber" />Register a verified credential first</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>Treatment
          <select className={control} name="serviceId" required defaultValue=""><option value="" disabled>Choose a treatment</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select>
        </label>
        <label className={field}>Credential
          <select className={control} name="credentialId" required defaultValue=""><option value="" disabled>Choose a credential</option>{verified.map((item) => <option key={item.id} value={item.id}>{item.licenseType} · {item.jurisdiction}</option>)}</select>
        </label>
        <label className={field}>Location
          <select className={control} name="locationId" required defaultValue={locations.length === 1 ? locations[0].id : ''}><option value="" disabled>Choose a location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select>
        </label>
        <label className={field}>Policy version<input className={control} name="policyVersion" required maxLength={60} defaultValue="v1" /></label>
        <label className={field}>Effective from<input className={control} name="effectiveFrom" type="date" required defaultValue={today()} /></label>
        <label className={field}>Effective to<input className={control} name="effectiveTo" type="date" /></label>
        <label className={field}>Evidence<input className={control} name="evidenceLabel" required maxLength={200} /></label>
        <label className={field}>Evidence reference<input className={control} name="evidenceReference" required maxLength={200} /></label>
      </div>
      <label className={field}>Basis<textarea className={area} name="basis" required maxLength={2000} /></label>
      <label className={check}><input type="checkbox" name="supervisionRequired" className="size-4" />Supervision required</label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>Supervisor
          <select className={control} name="requiredSupervisorId" defaultValue=""><option value="">None</option>{supervisors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </label>
        <label className={field}>Supervision mode<select className={control} name="supervisionMode" defaultValue="on_site"><option value="on_site">On site</option><option value="available">Available</option><option value="direct">Direct</option></select></label>
      </div>
    </WorkflowSheet>
  );
}

export function AuthorityTransitionSheet({ providerId, targetType, targetId, action, label }: { providerId: string; targetType: 'credential' | 'authorization'; targetId: string; action: 'suspend' | 'revoke'; label: string }) {
  return (
    <WorkflowSheet
      trigger={label}
      triggerVariant={action === 'revoke' ? 'danger' : 'raised'}
      triggerSize="sm"
      title={label}
      submitLabel={label}
      submit={(form, idempotencyKey) => transitionAuthority({ providerId, targetType, targetId, action, reason: str(form, 'reason'), idempotencyKey })}
    >
      <label className={field}>Reason<textarea className={area} name="reason" required maxLength={1000} /></label>
    </WorkflowSheet>
  );
}
