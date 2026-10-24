'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fieldLabelClass, inputClass, pillClass, textareaClass, trackClass } from '@/features/platform/components/pill';
import { Panel, StatusDot, usd } from '@/features/platform/components/medspa-ui';
import { getPlanSlots } from '../actions/planJourney';
import { bookFromFrontDesk, searchFrontDeskClients, type FrontDeskClient, type FrontDeskLocation, type FrontDeskService } from '../actions/frontDesk';
import type { PlanSlot } from '../types/planJourney';

const NEW_CLIENT = 'new';

function todayIn(timeZone?: string | null) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || undefined, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Front-desk booking for phone, walk-in and rebooking clients. */
export function FrontDeskBookingForm({ services, locations, clients }: { services: FrontDeskService[]; locations: FrontDeskLocation[]; clients: FrontDeskClient[] }) {
  const router = useRouter();
  const [clientId, setClientId] = useState('');
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [serviceId, setServiceId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [locationId, setLocationId] = useState(locations[0]?.id || '');
  const location = locations.find((item) => item.id === locationId);
  const [date, setDate] = useState(() => todayIn(locations[0]?.timezone));
  const [slots, setSlots] = useState<PlanSlot[] | null>(null);
  const [startTime, setStartTime] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string; appointmentId?: string | null } | null>(null);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  const service = services.find((item) => item.id === serviceId);
  const providers = service?.specialists || [];
  const [pickedClient, setPickedClient] = useState<FrontDeskClient | null>(null);
  const client = pickedClient?.id === clientId ? pickedClient : clients.find((item) => item.id === clientId);
  const person = clientId === NEW_CLIENT ? contact : { name: client?.user?.name || '', email: client?.user?.email || '', phone: client?.user?.phone || '' };
  const openSlots = useMemo(() => (slots || []).filter((slot) => slot.available), [slots]);

  function resetTimes() { setSlots(null); setStartTime(''); setMessage(null); }

  async function findTimes() {
    if (!service || !providerId || !locationId || !date) return;
    setBusy(true); resetTimes();
    try {
      const result = await getPlanSlots({ providerId, serviceId: service.id, locationId, serviceDuration: service.baseDuration || 60, date });
      setSlots(result.slots || []);
      if (!result.slots) setMessage({ tone: 'error', text: result.error || 'Times could not be loaded.' });
    } catch {
      setMessage({ tone: 'error', text: 'Times could not be loaded.' });
    } finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !service || !providerId || !startTime) return;
    setBusy(true); setMessage(null);
    const input = { serviceIds: [service.id], providerId, locationId, startTime, clientName: person.name.trim(), clientEmail: person.email.trim(), clientPhone: person.phone.trim() || null, clientNotes: notes.trim() || null };
    const fingerprint = JSON.stringify(input);
    // Retrying the same details reuses the key so a lost response can't double-book.
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    try {
      const result = await bookFromFrontDesk({ ...input, idempotencyKey: attempt.current.key });
      if (result.success) {
        setMessage({ tone: 'ok', text: 'Appointment booked', appointmentId: result.appointmentId });
        router.refresh();
      } else {
        setMessage({ tone: 'error', text: result.error || 'Booking failed.' });
      }
    } catch {
      setMessage({ tone: 'error', text: 'Booking not confirmed. Check the appointments list before retrying.' });
    } finally { setBusy(false); }
  }

  if (message?.tone === 'ok') {
    return (
      <Panel>
        <div className="flex flex-col items-start gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><StatusDot tone="emerald" />{message.text}</h2>
          <p className="text-sm text-muted-foreground">{person.name} · {service?.name} · {openSlots.find((slot) => slot.startTime === startTime)?.time}</p>
          <div className={trackClass}>
            {message.appointmentId ? <Link href={`/dashboard/platform/appointments/${message.appointmentId}`} className={pillClass('primary')}>Open appointment</Link> : null}
            <button type="button" className={pillClass()} onClick={() => { setMessage(null); resetTimes(); setNotes(''); attempt.current = null; }}>Book another</button>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-2">
      <Panel title="Client">
        <div className="grid gap-4">
          <ClientPicker clients={clients} value={clientId} onChange={(id, picked) => { setClientId(id); setPickedClient(picked || null); }} />
          {clientId === NEW_CLIENT ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={cn(fieldLabelClass, 'sm:col-span-2')}>Name<input className={inputClass} required maxLength={120} autoComplete="off" value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} /></label>
              <label className={fieldLabelClass}>Email<input className={inputClass} type="email" required maxLength={254} autoComplete="off" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} /></label>
              <label className={fieldLabelClass}>Phone<input className={inputClass} type="tel" maxLength={40} autoComplete="off" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} /></label>
            </div>
          ) : null}
          <label className={fieldLabelClass}>Notes<textarea className={textareaClass} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        </div>
      </Panel>

      <Panel title="Treatment & time">
        <div className="grid gap-4">
          <label className={fieldLabelClass}>Treatment
            <select className={inputClass} value={serviceId} required onChange={(event) => { setServiceId(event.target.value); setProviderId(''); resetTimes(); }}>
              <option value="" disabled>Choose a treatment</option>
              {services.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.baseDuration || 60} min · {usd(item.price)}</option>)}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={fieldLabelClass}>Provider
              <select className={inputClass} value={providerId} required disabled={!service} onChange={(event) => { setProviderId(event.target.value); resetTimes(); }}>
                <option value="" disabled>{service && !providers.length ? 'No provider offers this' : 'Choose a provider'}</option>
                {providers.map((item) => <option key={item.id} value={item.id}>{item.user?.name || 'Provider'}</option>)}
              </select>
            </label>
            {locations.length > 1 ? (
              <label className={fieldLabelClass}>Location
                <select className={inputClass} value={locationId} onChange={(event) => { setLocationId(event.target.value); resetTimes(); }}>
                  {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            ) : null}
            <label className={fieldLabelClass}>Date{location?.timezone ? ` · ${location.timezone.replaceAll('_', ' ')}` : ''}
              <input className={inputClass} type="date" required value={date} min={todayIn(location?.timezone)} onChange={(event) => { setDate(event.target.value); resetTimes(); }} />
            </label>
          </div>
          <div className={cn(trackClass, 'self-start')}>
            <button type="button" className={pillClass()} disabled={busy || !service || !providerId || !date} onClick={findTimes}>{busy && !slots ? 'Loading times' : 'Find times'}</button>
          </div>

          {slots ? (
            openSlots.length ? (
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-xs font-medium text-muted-foreground">Time</legend>
                <div className="flex flex-wrap gap-2">
                  {openSlots.map((slot) => (
                    <button key={slot.startTime} type="button" aria-pressed={slot.startTime === startTime} onClick={() => setStartTime(slot.startTime)}
                      className={cn('h-9 rounded-full border px-3 text-sm tabular-nums transition-colors', slot.startTime === startTime ? 'border-violet-600 bg-violet-600 text-white' : 'bg-background hover:border-foreground/40')}>
                      {slot.time}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><StatusDot tone="zinc" />No open times on this date</p>
          ) : null}
        </div>
      </Panel>

      <div className="flex flex-col gap-3 lg:col-span-2">
        {message?.tone === 'error' ? <p role="alert" className="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-300"><StatusDot tone="rose" />{message.text}</p> : null}
        <div className={cn(trackClass, 'self-start')}>
          <Link href="/dashboard/platform/appointments" className={pillClass('quiet')}>Cancel</Link>
          <button type="submit" className={pillClass('primary')} disabled={busy || !startTime || !person.name.trim() || !person.email.trim()}>
            <CalendarCheck />{busy && slots ? 'Booking' : 'Book appointment'}
          </button>
        </div>
      </div>
    </form>
  );
}

/** Search existing clients by name, email or phone (server-side), or start a new client. */
function ClientPicker({ clients, value, onChange }: { clients: FrontDeskClient[]; value: string; onChange: (id: string, client?: FrontDeskClient) => void }) {
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<FrontDeskClient[]>([]);
  const [picked, setPicked] = useState<FrontDeskClient | null>(null);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setFound([]); return; }
    let live = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchFrontDeskClients(term).catch(() => []);
      if (live) { setFound(results); setSearching(false); }
    }, 250);
    return () => { live = false; clearTimeout(timer); };
  }, [query]);
  const selected = picked || clients.find((client) => client.id === value) || null;
  if (value && (selected || value === NEW_CLIENT)) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2">
        <span className="min-w-0 text-sm"><span className="font-medium">{value === NEW_CLIENT ? 'New client' : selected?.user?.name}</span>{value !== NEW_CLIENT && selected?.user?.email ? <span className="ml-2 text-muted-foreground">{selected.user.email}</span> : null}</span>
        <div className={trackClass}><button type="button" className={pillClass('quiet', 'sm')} onClick={() => { onChange(''); setPicked(null); setQuery(''); }}>Change</button></div>
      </div>
    );
  }
  const term = query.trim();
  return (
    <div className="grid gap-2">
      <label className={fieldLabelClass}>Client
        <input className={inputClass} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email or phone" autoComplete="off" aria-controls="client-matches" />
      </label>
      <ul id="client-matches" role="listbox" aria-label="Matching clients" className="grid gap-1">
        {found.map((client) => (
          <li key={client.id}>
            <button type="button" role="option" aria-selected={false} onClick={() => { setPicked(client); onChange(client.id, client); }} className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2 text-left text-sm hover:bg-muted/50">
              <span className="truncate font-medium">{client.user?.name}</span>
              <span className="truncate text-xs text-muted-foreground">{client.user?.email}{client.user?.phone ? ` · ${client.user.phone}` : ''}</span>
            </button>
          </li>
        ))}
        {term.length >= 2 && !searching && !found.length ? <li className="px-1 text-xs text-muted-foreground">No matching client</li> : null}
      </ul>
      <div className={`${trackClass} self-start`}><button type="button" className={pillClass('raised', 'sm')} onClick={() => onChange(NEW_CLIENT)}>New client</button></div>
    </div>
  );
}
