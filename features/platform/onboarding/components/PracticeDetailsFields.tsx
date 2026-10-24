'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FIELDS: Array<{ key: string; label: string; type?: string; autoComplete?: string; wide?: boolean }> = [
  { key: 'name', label: 'Practice name', autoComplete: 'organization', wide: true },
  { key: 'address', label: 'Street address', autoComplete: 'street-address', wide: true },
  { key: 'city', label: 'City', autoComplete: 'address-level2' },
  { key: 'state', label: 'State', autoComplete: 'address-level1' },
  { key: 'zipCode', label: 'ZIP', autoComplete: 'postal-code' },
  { key: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
  { key: 'email', label: 'Email', type: 'email', autoComplete: 'email', wide: true },
];

/** The practice's real identity, written into the setup data before anything is published. */
export function PracticeDetailsFields({ data, onChange }: { data: any; onChange: (next: any) => void }) {
  const info = data?.medspaInfo || {};
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone').filter((zone) => zone.startsWith('America/') || zone.startsWith('Pacific/Honolulu') || zone === 'UTC') : ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'];
  const update = (key: string, value: string) => {
    const medspaInfo = { ...info, [key]: value };
    const storefront = key === 'name' ? { ...data.storefront, displayName: value } : data.storefront;
    onChange({ ...data, medspaInfo, storefront });
  };
  return (
    <fieldset className="mb-6 grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
      <legend className="px-1 text-sm font-medium">Your practice</legend>
      {FIELDS.map((field) => (
        <div key={field.key} className={`grid gap-1.5 ${field.wide ? 'sm:col-span-2' : ''}`}>
          <Label htmlFor={`practice-${field.key}`} className="text-xs text-muted-foreground">{field.label}</Label>
          <Input id={`practice-${field.key}`} type={field.type || 'text'} autoComplete={field.autoComplete} value={info[field.key] || ''} onChange={(event) => update(field.key, event.target.value)} maxLength={field.key === 'name' ? 80 : 200} />
        </div>
      ))}
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="practice-timezone" className="text-xs text-muted-foreground">Timezone</Label>
        <select id="practice-timezone" className="h-9 rounded-md border bg-background px-3 text-sm" value={info.timezone || 'America/New_York'} onChange={(event) => update('timezone', event.target.value)}>
          {zones.map((zone) => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}
        </select>
      </div>
    </fieldset>
  );
}
