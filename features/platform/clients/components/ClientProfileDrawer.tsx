'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { Pencil } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { fieldLabelClass, inputClass, pillClass, textareaClass, trackClass } from '@/features/platform/components/pill';
import { StatusDot } from '@/features/platform/components/medspa-ui';
import { saveClientProfile } from '../actions/clients';
import type { ClientFormOptions, ClientRecord } from '../types';

export function ClientProfileDrawer({ client, options }: { client: ClientRecord['client']; options: ClientFormOptions }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const initial = {
    name: client.name || '',
    phone: client.phone || '',
    dateOfBirth: client.dateOfBirth ? client.dateOfBirth.slice(0, 10) : '',
    contactPreferences: client.contactPreferences,
    operationalNotes: client.operationalNotes,
    preferredProviderId: client.preferredProvider?.id || '',
    homeLocationId: client.homeLocation?.id || '',
    marketingConsent: client.marketingConsent,
  };
  const [form, setForm] = useState(initial);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    const fingerprint = JSON.stringify(form);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    try {
      const result = await saveClientProfile({ clientId: client.id, ...form, idempotencyKey: attempt.current.key });
      if (result.success) { setOpen(false); attempt.current = null; router.refresh(); }
      else setError(result.error || 'Profile not saved.');
    } catch {
      setError('Profile not saved. Try again.');
    } finally { setBusy(false); }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { setOpen(next); if (next) { setForm(initial); setError(null); } }}>
      <div className={trackClass}><button type="button" className={pillClass()} onClick={() => setOpen(true)}><Pencil />Edit profile</button></div>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription className="sr-only">Client contact details, preferences and consent.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="grid gap-4 px-5 py-5">
          <label className={fieldLabelClass}>Name<input className={inputClass} required maxLength={120} value={form.name} onChange={(event) => set('name', event.target.value)} /></label>
          <label className={fieldLabelClass}>Email<input className={cn(inputClass, 'text-muted-foreground')} value={client.email || ''} readOnly disabled /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={fieldLabelClass}>Phone<input className={inputClass} type="tel" maxLength={40} value={form.phone} onChange={(event) => set('phone', event.target.value)} /></label>
            <label className={fieldLabelClass}>Date of birth<input className={inputClass} type="date" max={new Date().toISOString().slice(0, 10)} value={form.dateOfBirth} onChange={(event) => set('dateOfBirth', event.target.value)} /></label>
          </div>
          <label className={fieldLabelClass}>Preferred provider
            <select className={inputClass} value={form.preferredProviderId} onChange={(event) => set('preferredProviderId', event.target.value)}>
              <option value="">None</option>
              {options.providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
            </select>
          </label>
          <label className={fieldLabelClass}>Home location
            <select className={inputClass} value={form.homeLocationId} onChange={(event) => set('homeLocationId', event.target.value)}>
              <option value="">None</option>
              {options.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </label>
          <label className={fieldLabelClass}>Contact preferences<input className={inputClass} maxLength={500} value={form.contactPreferences} onChange={(event) => set('contactPreferences', event.target.value)} /></label>
          <label className={fieldLabelClass}>Front-desk notes<textarea className={textareaClass} maxLength={2000} value={form.operationalNotes} onChange={(event) => set('operationalNotes', event.target.value)} /></label>
          <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-medium">
            <input type="checkbox" className="size-4" checked={form.marketingConsent} onChange={(event) => set('marketingConsent', event.target.checked)} />Marketing messages
          </label>
          {error ? <p role="alert" className="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-300"><StatusDot tone="rose" />{error}</p> : null}
          <div className={cn(trackClass, 'self-start')}>
            <button type="button" className={pillClass('quiet')} onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className={pillClass('primary')} disabled={busy || !form.name.trim()}>{busy ? 'Saving' : 'Save'}</button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
