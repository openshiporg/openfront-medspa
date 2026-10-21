'use client'

import { useActionState, useState } from 'react'
import { saveStorefrontSettings, type StorefrontSaveState, type StorefrontSettingsData } from '../actions/storefrontSettings'
import { LogoPicker } from './LogoPicker'

export function StorefrontSettingsForm({ setting, locations }: StorefrontSettingsData) {
  const [name, setName] = useState(setting?.displayName || '')
  const [location, setLocation] = useState(setting?.primaryLocation?.id || '')
  const [published, setPublished] = useState(setting?.isPublished ?? false)
  const [state, action, pending] = useActionState<StorefrontSaveState, FormData>(saveStorefrontSettings, { status: 'idle', message: '' })
  const revision = state.status === 'saved' ? state.revision ?? setting?.revision ?? 0 : state.revision ?? setting?.revision ?? 0
  return <form action={action} className="grid gap-6 rounded-2xl border bg-background p-4 md:p-6">
    {state.message && <div role={state.status === 'saved' ? 'status' : 'alert'} className="rounded-lg border p-3 text-sm">{state.message}{state.status === 'conflict' && <a className="ml-2 underline" href="/dashboard/platform/storefront">Reload latest settings (discards this draft)</a>}</div>}
    <fieldset disabled={pending} className="grid min-w-0 gap-6 disabled:opacity-70">
      <input type="hidden" name="expectedRevision" value={revision} />
      {/* Retain the legacy value without presenting a competing storefront theme source. */}
      <input type="hidden" name="accentHue" value={setting?.accentHue ?? 220} />
      <label className="grid gap-2 text-sm font-medium">Public display name
        <input name="displayName" required minLength={1} maxLength={80} value={name} onChange={event => setName(event.target.value)} className="h-11 w-full rounded-lg border bg-background px-3 font-normal" autoComplete="organization" />
      </label>
      <label className="grid gap-2 text-sm font-medium">Primary public location
        <select name="primaryLocationId" required value={location} onChange={event => setLocation(event.target.value)} className="h-11 w-full rounded-lg border bg-background px-3 font-normal">
          <option value="" disabled>Select a practice location</option>
          {locations.map(item => <option key={item.id} value={item.id} disabled={!item.isActive}>{item.name}{item.isActive ? '' : ' (inactive)'}</option>)}
        </select>
      </label>
      <LogoPicker initialSvg={setting?.logoSvg} initialHue={setting?.logoHue} />
      <p className="text-sm text-muted-foreground">Logo hue also sets storefront accents and focus color.</p>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
        <input type="checkbox" name="isPublished" checked={published} onChange={event => setPublished(event.target.checked)} className="size-5 shrink-0" />Publish storefront
      </label>
      {!locations.some(item => item.isActive) && <p role="status" className="text-sm">No active practice location is available.</p>}
      <button type="submit" disabled={pending || state.status === 'conflict' || !locations.some(item => item.isActive)} className="min-h-11 rounded-lg bg-foreground px-5 text-sm font-medium text-background disabled:opacity-50">{pending ? 'Saving…' : 'Save storefront settings'}</button>
    </fieldset>
  </form>
}
