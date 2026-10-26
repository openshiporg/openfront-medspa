'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { fieldLabelClass, inputClass, pillClass, textareaClass, trackClass } from '@/features/platform/components/pill';
import { StatusDot } from '@/features/platform/components/medspa-ui';
import { addToWaitlist, searchWaitlistClients } from '../actions/engagement';
import { WEEKDAYS, type ClientMatch, type WaitlistOptions } from '../types';

const blank = { guestName: '', guestPhone: '', serviceId: '', providerIds: [] as string[], days: [] as string[], timeRange: '', start: '', end: '', notes: '' };

export function WaitlistAddDrawer({ options }: { options: WaitlistOptions }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'client' | 'guest'>('client');
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<ClientMatch[]>([]);
  const [client, setClient] = useState<ClientMatch | null>(null);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const set = <K extends keyof typeof blank>(key: K, value: (typeof blank)[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggle = (key: 'providerIds' | 'days', value: string) => setForm((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value] }));
  const providers = form.serviceId ? options.providers.filter((provider) => provider.serviceIds.includes(form.serviceId)) : options.providers;

  useEffect(() => {
    if (mode !== 'client' || client || query.trim().length < 2) { setMatches([]); return; }
    let alive = true;
    const timer = setTimeout(() => { searchWaitlistClients(query).then((items) => { if (alive) setMatches(items); }).catch(() => { if (alive) setMatches([]); }); }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [query, mode, client]);

  function reset() { setMode('client'); setQuery(''); setMatches([]); setClient(null); setForm(blank); setError(null); attempt.current = null; }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (mode === 'client' && !client) { setError('Choose a client or switch to walk-in.'); return; }
    setBusy(true); setError(null);
    const input = {
      clientUserId: mode === 'client' ? client!.userId : null, guestName: form.guestName, guestPhone: form.guestPhone,
      serviceId: form.serviceId, preferredProviderIds: form.providerIds.filter((id) => providers.some((provider) => provider.id === id)),
      preferredDays: form.days, preferredTimeRange: form.timeRange, dateRangeStart: form.start, dateRangeEnd: form.end, notes: form.notes,
    };
    const fingerprint = JSON.stringify(input);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    try {
      const result = await addToWaitlist({ ...input, idempotencyKey: attempt.current.key });
      if (result.success) { setOpen(false); reset(); router.refresh(); }
      else setError(result.error || 'Not added.');
    } catch {
      setError('Not added. Check the waitlist before retrying.');
    } finally { setBusy(false); }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { setOpen(next); if (next) reset(); }}>
      <div className={trackClass}><button type="button" className={pillClass('primary')} onClick={() => setOpen(true)}><Plus />Add to waitlist</button></div>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>Add to waitlist</SheetTitle>
          <SheetDescription className="sr-only">Client, treatment and preferred times.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="grid gap-4 px-5 py-5">
          <div className={cn(trackClass, 'self-start')} role="group" aria-label="Who">
            <button type="button" aria-pressed={mode === 'client'} className={pillClass(mode === 'client' ? 'raised' : 'quiet', 'sm')} onClick={() => setMode('client')}>Client</button>
            <button type="button" aria-pressed={mode === 'guest'} className={pillClass(mode === 'guest' ? 'raised' : 'quiet', 'sm')} onClick={() => { setMode('guest'); setClient(null); }}>Walk-in</button>
          </div>

          {mode === 'client' ? (
            client ? (
              <div className="flex items-center justify-between gap-3 rounded-[6px] border px-3 py-2 text-sm">
                <div className="min-w-0"><div className="truncate font-medium">{client.name || 'Client'}</div><div className="truncate text-xs text-muted-foreground">{[client.email, client.phone].filter(Boolean).join(' · ')}</div></div>
                <button type="button" aria-label="Clear client" className={pillClass('quiet', 'sm')} onClick={() => { setClient(null); setQuery(''); }}><X /></button>
              </div>
            ) : (
              <div className="grid gap-2">
                <label className={fieldLabelClass}>Client<input className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email or phone" autoComplete="off" /></label>
                {matches.length ? (
                  <ul className="overflow-hidden rounded-[6px] border">
                    {matches.map((match) => (
                      <li key={match.userId}>
                        <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-muted/60" onClick={() => { setClient(match); setMatches([]); }}>
                          <span className="block truncate font-medium">{match.name || 'Client'}</span>
                          <span className="block truncate text-xs text-muted-foreground">{[match.email, match.phone].filter(Boolean).join(' · ')}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : query.trim().length >= 2 ? <p className="text-xs text-muted-foreground">No matching clients</p> : null}
              </div>
            )
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={fieldLabelClass}>Name<input className={inputClass} required maxLength={120} value={form.guestName} onChange={(event) => set('guestName', event.target.value)} /></label>
              <label className={fieldLabelClass}>Phone<input className={inputClass} type="tel" maxLength={40} value={form.guestPhone} onChange={(event) => set('guestPhone', event.target.value)} /></label>
            </div>
          )}

          <label className={fieldLabelClass}>Treatment
            <select className={inputClass} required value={form.serviceId} onChange={(event) => set('serviceId', event.target.value)}>
              <option value="" disabled>Choose a treatment</option>
              {options.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
            </select>
          </label>

          {providers.length ? (
            <fieldset className="grid gap-2">
              <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Preferred providers</legend>
              <div className="flex flex-wrap gap-2">
                {providers.map((provider) => (
                  <button key={provider.id} type="button" aria-pressed={form.providerIds.includes(provider.id)} onClick={() => toggle('providerIds', provider.id)}
                    className={cn('h-8 rounded-[5px] border px-3 text-xs', form.providerIds.includes(provider.id) ? 'border-violet-600 bg-violet-600 text-white' : 'bg-background hover:border-foreground/40')}>{provider.name}</button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Preferred days</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => (
                <button key={day} type="button" aria-pressed={form.days.includes(day)} onClick={() => toggle('days', day)}
                  className={cn('h-8 min-w-11 rounded-[5px] border px-2.5 text-xs capitalize', form.days.includes(day) ? 'border-violet-600 bg-violet-600 text-white' : 'bg-background hover:border-foreground/40')}>{day.slice(0, 3)}</button>
              ))}
            </div>
          </fieldset>

          <label className={fieldLabelClass}>Preferred time<input className={inputClass} maxLength={120} placeholder="Mornings, after 4pm" value={form.timeRange} onChange={(event) => set('timeRange', event.target.value)} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={fieldLabelClass}>From<input className={inputClass} type="date" value={form.start} onChange={(event) => set('start', event.target.value)} /></label>
            <label className={fieldLabelClass}>Until<input className={inputClass} type="date" min={form.start || undefined} value={form.end} onChange={(event) => set('end', event.target.value)} /></label>
          </div>
          <label className={fieldLabelClass}>Notes<textarea className={textareaClass} maxLength={2000} value={form.notes} onChange={(event) => set('notes', event.target.value)} /></label>

          {error ? <p role="alert" className="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-300"><StatusDot tone="rose" />{error}</p> : null}
          <div className={cn(trackClass, 'self-start')}>
            <button type="button" className={pillClass('quiet')} onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className={pillClass('primary')} disabled={busy || !form.serviceId || (mode === 'client' ? !client : !form.guestName.trim())}>{busy ? 'Adding' : 'Add'}</button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
