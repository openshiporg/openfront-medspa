'use client';

import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { WorkflowSheet, all, area, check, control, field, on, str } from '@/features/platform/staff/components/WorkflowSheet';
import { saveSchedules } from '../actions/schedules';
import type { PlatformSchedule, ScheduleLocation, ScheduleSaveInput } from '../types';

const DAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']] as const;
const TYPES = [['recurring', 'Weekly hours'], ['one_time', 'One date'], ['time_off', 'Time off']] as const;
type ScheduleType = typeof TYPES[number][0];

const dateOnly = (value?: string | null) => (value ? value.slice(0, 10) : '');

export function ScheduleSheet({
  providers, locations, schedule, providerId, size = 'md', variant = 'raised',
}: {
  providers: Array<{ id: string; name: string; locationIds: string[]; isPublic: boolean }>;
  locations: ScheduleLocation[];
  schedule?: PlatformSchedule & { providerId: string };
  providerId?: string;
  size?: 'sm' | 'md';
  variant?: 'raised' | 'primary';
}) {
  const [type, setType] = useState<ScheduleType>(schedule?.type || 'recurring');
  const [selectedProvider, setSelectedProvider] = useState(schedule?.providerId || providerId || '');
  const provider = providers.find((item) => item.id === selectedProvider);
  const providerLocations = locations.filter((location) => !provider || provider.locationIds.includes(location.id));
  const editing = Boolean(schedule);

  return (
    <WorkflowSheet
      trigger={editing ? <><Pencil />Edit</> : <><Plus />Add hours</>}
      triggerSize={size}
      triggerVariant={variant}
      title={editing ? 'Edit hours' : 'Add hours'}
      submitLabel="Save"
      submit={(form, idempotencyKey) => {
        const days = editing ? [Number(str(form, 'dayOfWeek'))] : all(form, 'days').map(Number);
        const base: Omit<ScheduleSaveInput, 'dayOfWeek' | 'idempotencyKey'> = {
          scheduleId: schedule?.id || null, expectedRevision: schedule?.revision ?? null,
          providerId: str(form, 'providerId'), locationId: str(form, 'locationId'), type,
          localDate: type === 'recurring' ? null : str(form, 'localDate'),
          startTime: str(form, 'startTime'), endTime: str(form, 'endTime'),
          breakStart: type === 'time_off' ? null : str(form, 'breakStart') || null, breakEnd: type === 'time_off' ? null : str(form, 'breakEnd') || null,
          isPublic: type !== 'time_off' && on(form, 'isPublic'), isAvailable: type === 'time_off' ? false : schedule?.isAvailable !== false, reason: str(form, 'reason') || null,
          effectiveFrom: type === 'recurring' ? str(form, 'effectiveFrom') || null : null,
          effectiveTo: type === 'recurring' ? str(form, 'effectiveTo') || null : null,
        };
        if (!base.providerId || !base.locationId) return Promise.resolve({ success: false, error: 'Choose a provider and location' });
        if (type !== 'recurring') return saveSchedules([{ ...base, dayOfWeek: null, idempotencyKey: editing ? null : idempotencyKey }]);
        if (!days.length || days.some((day) => !Number.isInteger(day))) return Promise.resolve({ success: false, error: 'Choose at least one day' });
        return saveSchedules(days.map((day) => ({ ...base, dayOfWeek: day, idempotencyKey: editing ? null : `${idempotencyKey}:${day}` })));
      }}
    >
      {!editing ? (
        <div role="radiogroup" aria-label="Type" className="inline-flex max-w-full flex-wrap items-center gap-1 self-start rounded-full bg-muted p-1">
          {TYPES.map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={type === value} onClick={() => setType(value)}
              className={type === value ? 'h-8 rounded-full bg-background px-3.5 text-sm font-medium shadow-sm' : 'h-8 rounded-full px-3.5 text-sm text-muted-foreground'}>
              {label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>Provider
          <select className={control} name="providerId" required value={selectedProvider} disabled={editing} onChange={(event) => setSelectedProvider(event.target.value)}>
            <option value="" disabled>Choose a provider</option>
            {providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        {editing ? <input type="hidden" name="providerId" value={selectedProvider} /> : null}
        <label className={field}>Location
          <select className={control} name="locationId" required defaultValue={schedule?.location?.id || (providerLocations.length === 1 ? providerLocations[0].id : '')} key={selectedProvider} disabled={editing}>
            <option value="" disabled>{providerLocations.length ? 'Choose a location' : 'No assigned location'}</option>
            {providerLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>
        {editing ? <input type="hidden" name="locationId" value={schedule?.location?.id || ''} /> : null}
      </div>

      {type === 'recurring' ? (
        editing ? (
          <label className={field}>Day
            <select className={control} name="dayOfWeek" defaultValue={String(schedule?.dayOfWeek ?? 1)}>{DAYS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </label>
        ) : (
          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Days</legend>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(([value, label]) => (
                <label key={value} className="flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm"><input type="checkbox" name="days" value={value} className="size-3.5" />{label}</label>
              ))}
            </div>
          </fieldset>
        )
      ) : (
        <label className={field}>Date<input className={control} type="date" name="localDate" required defaultValue={dateOnly(schedule?.localDate)} /></label>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className={field}>{type === 'time_off' ? 'From' : 'Starts'}<input className={control} type="time" name="startTime" required defaultValue={schedule?.startTime || (type === 'time_off' ? '00:00' : '10:00')} key={`start-${type}`} /></label>
        <label className={field}>{type === 'time_off' ? 'Until' : 'Ends'}<input className={control} type="time" name="endTime" required defaultValue={schedule?.endTime || (type === 'time_off' ? '23:59' : '17:00')} key={`end-${type}`} /></label>
        {type !== 'time_off' ? <>
          <label className={field}>Break starts<input className={control} type="time" name="breakStart" defaultValue={schedule?.breakStart || ''} /></label>
          <label className={field}>Break ends<input className={control} type="time" name="breakEnd" defaultValue={schedule?.breakEnd || ''} /></label>
        </> : null}
      </div>

      {type === 'recurring' ? (
        <div className="grid grid-cols-2 gap-4">
          <label className={field}>Starting<input className={control} type="date" name="effectiveFrom" defaultValue={dateOnly(schedule?.effectiveFrom)} /></label>
          <label className={field}>Ending<input className={control} type="date" name="effectiveTo" defaultValue={dateOnly(schedule?.effectiveTo)} /></label>
        </div>
      ) : null}

      {type !== 'time_off' ? (
        <label className={check}><input type="checkbox" name="isPublic" defaultChecked={schedule ? schedule.isPublic === true : provider?.isPublic !== false} className="size-4" />Bookable online</label>
      ) : null}
      <label className={field}>{type === 'time_off' ? 'Reason' : 'Note'}<textarea className={area} name="reason" maxLength={1000} defaultValue={schedule?.reason || ''} /></label>
    </WorkflowSheet>
  );
}
