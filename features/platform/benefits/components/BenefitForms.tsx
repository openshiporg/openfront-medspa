'use client';

import { Gift, PackagePlus, Pencil, Plus, UserPlus } from 'lucide-react';
import { fieldLabelClass, inputClass, textareaClass } from '@/features/platform/components/pill';
import {
  acceptMembershipTerms, adjustGiftCardBalance, enrollMembership, issueGiftCardAction, reversePackageUsage,
  saveMembershipPlan, saveServicePackage, sellPackage, transitionClientMembership,
} from '../actions/benefits';
import type { ClientMembershipRow, ClientOption, MembershipPlan, PackagePlan, ServiceOption } from '../types';
import { FormSheet, formCents, formNumber, ServicePicker } from './FormSheet';

const dollars = (cents?: number | null) => (cents == null ? '' : (cents / 100).toFixed(2));
const today = () => new Date().toISOString().slice(0, 10);

function ActiveToggle({ defaultChecked }: { defaultChecked: boolean }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm font-medium">
      <input type="checkbox" name="isActive" defaultChecked={defaultChecked} className="size-4 accent-violet-600" />Available to sell
    </label>
  );
}

function ClientSelect({ clients }: { clients: ClientOption[] }) {
  return (
    <label className={fieldLabelClass}>Client
      <select name="clientId" required className={inputClass} defaultValue="">
        <option value="" disabled>{clients.length ? 'Choose a client' : 'No clients yet'}</option>
        {clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.email}</option>)}
      </select>
    </label>
  );
}

function Reason({ label = 'Reason' }: { label?: string }) {
  return <label className={fieldLabelClass}>{label}<input name="reason" required maxLength={1000} className={inputClass} /></label>;
}

export function MembershipPlanSheet({ plan, services }: { plan?: MembershipPlan; services: ServiceOption[] }) {
  return (
    <FormSheet
      trigger={plan ? <><Pencil />Edit</> : <><Plus />New plan</>}
      triggerVariant={plan ? 'raised' : 'primary'}
      size={plan ? 'sm' : 'md'}
      title={plan ? `Edit ${plan.name}` : 'New membership plan'}
      submitLabel="Save plan"
      onSubmit={(form, idempotencyKey) => saveMembershipPlan({
        membershipId: plan?.id || null,
        name: String(form.get('name') || ''),
        description: String(form.get('description') || ''),
        monthlyPrice: formCents(form, 'monthlyPrice'),
        discountPercent: formNumber(form, 'discountPercent'),
        includedServiceIds: form.getAll('serviceIds').map(String),
        isActive: form.get('isActive') === 'on',
        idempotencyKey,
      })}
    >
      <label className={fieldLabelClass}>Name<input name="name" required maxLength={120} defaultValue={plan?.name} className={inputClass} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldLabelClass}>Monthly price ($)<input name="monthlyPrice" type="number" min="0" step="0.01" required defaultValue={dollars(plan?.monthlyPrice)} className={inputClass} /></label>
        <label className={fieldLabelClass}>Treatment discount (%)<input name="discountPercent" type="number" min="0" max="100" step="1" required defaultValue={plan?.discountPercent ?? 10} className={inputClass} /></label>
      </div>
      <label className={fieldLabelClass}>Description<textarea name="description" maxLength={2000} defaultValue={plan?.description || ''} className={textareaClass} /></label>
      <ServicePicker name="serviceIds" services={services} selected={plan?.includedServices.map((service) => service.id)} />
      <ActiveToggle defaultChecked={plan?.isActive ?? true} />
    </FormSheet>
  );
}

export function PackagePlanSheet({ plan, services }: { plan?: PackagePlan; services: ServiceOption[] }) {
  return (
    <FormSheet
      trigger={plan ? <><Pencil />Edit</> : <><Plus />New package</>}
      triggerVariant={plan ? 'raised' : 'primary'}
      size={plan ? 'sm' : 'md'}
      title={plan ? `Edit ${plan.name}` : 'New package'}
      submitLabel="Save package"
      onSubmit={(form, idempotencyKey) => saveServicePackage({
        packageId: plan?.id || null,
        name: String(form.get('name') || ''),
        description: String(form.get('description') || ''),
        totalPrice: formCents(form, 'totalPrice'),
        savingsAmount: formCents(form, 'savingsAmount'),
        validDays: formNumber(form, 'validDays'),
        serviceIds: form.getAll('serviceIds').map(String),
        isActive: form.get('isActive') === 'on',
        idempotencyKey,
      })}
    >
      <label className={fieldLabelClass}>Name<input name="name" required maxLength={120} defaultValue={plan?.name} className={inputClass} /></label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={fieldLabelClass}>Price ($)<input name="totalPrice" type="number" min="0.01" step="0.01" required defaultValue={dollars(plan?.totalPrice)} className={inputClass} /></label>
        <label className={fieldLabelClass}>Bonus value ($)<input name="savingsAmount" type="number" min="0" step="0.01" defaultValue={dollars(plan?.savingsAmount ?? 0)} className={inputClass} /></label>
        <label className={fieldLabelClass}>Valid (days)<input name="validDays" type="number" min="1" max="1825" step="1" required defaultValue={plan?.validDays ?? 365} className={inputClass} /></label>
      </div>
      <label className={fieldLabelClass}>Description<textarea name="description" maxLength={2000} defaultValue={plan?.description || ''} className={textareaClass} /></label>
      <ServicePicker name="serviceIds" services={services} selected={plan?.services.map((service) => service.id)} />
      <ActiveToggle defaultChecked={plan?.isActive ?? true} />
    </FormSheet>
  );
}

export function EnrollMembershipSheet({ clients, plans }: { clients: ClientOption[]; plans: MembershipPlan[] }) {
  return (
    <FormSheet
      trigger={<><UserPlus />Enroll client</>}
      triggerVariant="primary"
      title="Enroll in a membership"
      submitLabel="Enroll"
      onSubmit={(form, idempotencyKey) => enrollMembership({
        clientId: String(form.get('clientId') || ''),
        membershipId: String(form.get('membershipId') || ''),
        startDate: new Date(`${form.get('startDate')}T12:00:00`).toISOString(),
        idempotencyKey,
      })}
    >
      <ClientSelect clients={clients} />
      <label className={fieldLabelClass}>Plan
        <select name="membershipId" required className={inputClass} defaultValue="">
          <option value="" disabled>{plans.length ? 'Choose a plan' : 'No active plans'}</option>
          {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · ${dollars(plan.monthlyPrice)}/mo · {plan.discountPercent}% off</option>)}
        </select>
      </label>
      <label className={fieldLabelClass}>Start date<input name="startDate" type="date" required defaultValue={today()} className={inputClass} /></label>
    </FormSheet>
  );
}

export function AcceptTermsSheet({ row }: { row: ClientMembershipRow }) {
  const plan = row.membership;
  return (
    <FormSheet
      trigger="Record terms"
      triggerVariant="primary"
      size="sm"
      title={`Membership terms · ${row.client?.name || 'Client'}`}
      submitLabel="Record acceptance"
      onSubmit={(form, idempotencyKey) => acceptMembershipTerms({
        clientMembershipId: row.id,
        termsVersion: String(form.get('termsVersion') || ''),
        terms: String(form.get('terms') || ''),
        renewalDisclosure: String(form.get('renewal') || ''),
        cancellationDisclosure: String(form.get('cancellation') || ''),
        signature: String(form.get('signature') || ''),
        discountPercent: Number(plan?.discountPercent || 0),
        includedServiceIds: (plan?.includedServices || []).map((service) => service.id),
        idempotencyKey,
      })}
    >
      <p className="text-sm text-muted-foreground">{plan?.name} · ${dollars(plan?.monthlyPrice)}/mo · {plan?.discountPercent || 0}% off · {plan?.includedServices.length || 0} treatments</p>
      <label className={fieldLabelClass}>Terms version<input name="termsVersion" required maxLength={40} defaultValue="v1" className={inputClass} /></label>
      <label className={fieldLabelClass}>Terms<textarea name="terms" required maxLength={10000} className={textareaClass} /></label>
      <label className={fieldLabelClass}>Renewal<textarea name="renewal" required maxLength={2000} defaultValue={`Renews monthly at $${dollars(plan?.monthlyPrice)} until cancelled.`} className={textareaClass} /></label>
      <label className={fieldLabelClass}>Cancellation<textarea name="cancellation" required maxLength={2000} className={textareaClass} /></label>
      <label className={fieldLabelClass}>Client signature (typed full name)<input name="signature" required maxLength={120} defaultValue={row.client?.name || ''} className={inputClass} /></label>
    </FormSheet>
  );
}

const transitionLabels = { freeze: 'Pause', resume: 'Resume', cancel: 'Cancel membership' } as const;

export function MembershipTransitionSheet({ row, action }: { row: ClientMembershipRow; action: keyof typeof transitionLabels }) {
  return (
    <FormSheet
      trigger={action === 'cancel' ? 'Cancel' : transitionLabels[action]}
      triggerVariant={action === 'cancel' ? 'danger' : 'raised'}
      size="sm"
      title={`${transitionLabels[action]} · ${row.client?.name || 'Client'}`}
      submitLabel={transitionLabels[action]}
      onSubmit={(form, idempotencyKey) => transitionClientMembership({ clientMembershipId: row.id, action, reason: String(form.get('reason') || ''), idempotencyKey })}
    >
      <Reason />
    </FormSheet>
  );
}

export function SellPackageSheet({ clients, packages }: { clients: ClientOption[]; packages: PackagePlan[] }) {
  return (
    <FormSheet
      trigger={<><PackagePlus />Sell package</>}
      triggerVariant="primary"
      title="Sell a package"
      submitLabel="Record sale"
      onSubmit={(form, idempotencyKey) => sellPackage({
        clientId: String(form.get('clientId') || ''),
        packageId: String(form.get('packageId') || ''),
        paidAmount: formCents(form, 'paidAmount'),
        idempotencyKey,
      })}
    >
      <ClientSelect clients={clients} />
      <label className={fieldLabelClass}>Package
        <select name="packageId" required className={inputClass} defaultValue="">
          <option value="" disabled>{packages.length ? 'Choose a package' : 'No active packages'}</option>
          {packages.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · ${dollars(plan.totalPrice)} · {plan.validDays} days</option>)}
        </select>
      </label>
      <label className={fieldLabelClass}>Cash received ($)<input name="paidAmount" type="number" min="0" step="0.01" required className={inputClass} /></label>
    </FormSheet>
  );
}

export function ReverseUsageSheet({ usageId, label }: { usageId: string; label: string }) {
  return (
    <FormSheet
      trigger="Reverse"
      size="sm"
      title={`Reverse ${label}`}
      submitLabel="Reverse usage"
      onSubmit={(form, idempotencyKey) => reversePackageUsage({ usageId, reason: String(form.get('reason') || ''), idempotencyKey })}
    >
      <Reason />
    </FormSheet>
  );
}

export function IssueGiftCardSheet() {
  return (
    <FormSheet
      trigger={<><Gift />Issue gift card</>}
      triggerVariant="primary"
      title="Issue a gift card"
      submitLabel="Record cash and issue"
      onSubmit={(form, idempotencyKey) => issueGiftCardAction({
        amount: formCents(form, 'amount'),
        recipientName: String(form.get('recipientName') || ''),
        recipientEmail: String(form.get('recipientEmail') || ''),
        message: String(form.get('message') || ''),
        idempotencyKey,
      })}
    >
      <label className={fieldLabelClass}>Amount ($)<input name="amount" type="number" min="5" max="2000" step="0.01" required className={inputClass} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldLabelClass}>Recipient<input name="recipientName" maxLength={120} className={inputClass} /></label>
        <label className={fieldLabelClass}>Recipient email<input name="recipientEmail" type="email" maxLength={254} className={inputClass} /></label>
      </div>
      <label className={fieldLabelClass}>Message<textarea name="message" maxLength={1000} className={textareaClass} /></label>
    </FormSheet>
  );
}

export function GiftCardBalanceSheet({ giftCardId, code, action }: { giftCardId: string; code: string; action: 'redemption' | 'refund' }) {
  const label = action === 'redemption' ? 'Redeem' : 'Restore';
  return (
    <FormSheet
      trigger={label}
      size="sm"
      title={`${label} · ${code}`}
      submitLabel={label}
      onSubmit={(form, idempotencyKey) => adjustGiftCardBalance({
        giftCardId, action,
        amount: formCents(form, 'amount'),
        reason: String(form.get('reason') || ''),
        appointmentId: String(form.get('appointmentId') || '') || null,
        idempotencyKey,
      })}
    >
      <label className={fieldLabelClass}>Amount ($)<input name="amount" type="number" min="0.01" step="0.01" required className={inputClass} /></label>
      <label className={fieldLabelClass}>Appointment ID<input name="appointmentId" maxLength={100} className={inputClass} /></label>
      <Reason label="Note" />
    </FormSheet>
  );
}
