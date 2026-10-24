'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { WorkflowSheet, check, control, field, on, str } from '@/features/platform/staff/components/WorkflowSheet';
import { saveLocation } from '../actions/locations';
import { WEEK_DAYS, type LocationHours, type PracticeLocation } from '../types';

const FALLBACK_ZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto', 'Europe/London', 'UTC'];

function timezones(current?: string | null) {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') || FALLBACK_ZONES;
  return current && !supported.includes(current) ? [current, ...supported] : supported;
}

function HoursEditor({ hours }: { hours: LocationHours | null }) {
  const [closed, setClosed] = useState<Record<string, boolean>>(() => Object.fromEntries(WEEK_DAYS.map(([day]) => [day, hours ? hours[day]?.closed !== false || !hours[day]?.open : day === 'sunday'])));
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Opening hours</legend>
      {WEEK_DAYS.map(([day, label]) => (
        <div key={day} className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[3rem_6.5rem_minmax(0,1fr)]">
          <span className="text-sm font-medium">{label}</span>
          <label className="flex min-h-10 items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" name={`${day}.closed`} checked={closed[day]} onChange={(event) => setClosed({ ...closed, [day]: event.target.checked })} className="size-4" />Closed
          </label>
          <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1">
            <input aria-label={`${label} opens`} className={control} type="time" name={`${day}.open`} defaultValue={hours?.[day]?.open || '10:00'} disabled={closed[day]} required={!closed[day]} />
            <input aria-label={`${label} closes`} className={control} type="time" name={`${day}.close`} defaultValue={hours?.[day]?.close || '18:00'} disabled={closed[day]} required={!closed[day]} />
          </div>
        </div>
      ))}
    </fieldset>
  );
}

export function LocationSheet({ location }: { location?: PracticeLocation }) {
  const zones = useMemo(() => timezones(location?.timezone), [location?.timezone]);
  const defaultZone = location?.timezone || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC');
  return (
    <WorkflowSheet
      trigger={location ? <><Pencil />Edit</> : <><Plus />Add location</>}
      triggerVariant={location ? 'raised' : 'primary'}
      triggerSize={location ? 'sm' : 'md'}
      title={location ? `Edit ${location.name}` : 'Add location'}
      submitLabel="Save location"
      wide
      submit={(form, idempotencyKey) => {
        const hours: LocationHours = Object.fromEntries(WEEK_DAYS.map(([day]) => [day, on(form, `${day}.closed`)
          ? { closed: true }
          : { open: str(form, `${day}.open`), close: str(form, `${day}.close`), closed: false }]));
        return saveLocation({
          locationId: location?.id || null, name: str(form, 'name'), address: str(form, 'address'), city: str(form, 'city'), state: str(form, 'state'),
          zipCode: str(form, 'zipCode'), phone: str(form, 'phone'), email: str(form, 'email'), timezone: str(form, 'timezone'), hours,
          isActive: location ? on(form, 'isActive') : true, idempotencyKey,
        });
      }}
    >
      <label className={field}>Name<input className={control} name="name" required maxLength={120} defaultValue={location?.name} /></label>
      <label className={field}>Street address<input className={control} name="address" maxLength={200} defaultValue={location?.address || ''} autoComplete="street-address" /></label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={field}>City<input className={control} name="city" maxLength={120} defaultValue={location?.city || ''} /></label>
        <label className={field}>State<input className={control} name="state" maxLength={60} defaultValue={location?.state || ''} /></label>
        <label className={field}>ZIP<input className={control} name="zipCode" maxLength={20} defaultValue={location?.zipCode || ''} /></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>Phone<input className={control} name="phone" type="tel" maxLength={40} defaultValue={location?.phone || ''} /></label>
        <label className={field}>Email<input className={control} name="email" type="email" maxLength={254} defaultValue={location?.email || ''} /></label>
      </div>
      <label className={field}>Timezone
        <select className={control} name="timezone" required defaultValue={defaultZone}>
          {zones.map((zone) => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}
        </select>
      </label>
      <HoursEditor hours={location?.hours || null} />
      {location ? (
        <label className={check}>
          <input type="checkbox" name="isActive" defaultChecked={location.isActive} disabled={location.isPrimary && location.isActive} className="size-4" />Active
          {location.isPrimary ? <span className="ml-auto text-xs text-muted-foreground">Storefront location</span> : null}
        </label>
      ) : null}
      {location?.isPrimary && location.isActive ? <input type="hidden" name="isActive" value="on" /> : null}
    </WorkflowSheet>
  );
}
