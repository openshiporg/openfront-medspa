'use client'

import { useActionState, useState } from 'react'
import { saveStorefrontSettings, type StorefrontSaveState, type StorefrontSettingsData } from '../actions/storefrontSettings'
import { LogoPicker } from './LogoPicker'
import { fieldLabelClass, inputClass, pillClass, trackClass } from '@/features/platform/components/pill'

export function StorefrontSettingsForm({ setting, locations }: StorefrontSettingsData) {
  const [name, setName] = useState(setting?.displayName || '')
  const [location, setLocation] = useState(setting?.primaryLocation?.id || '')
  const [published, setPublished] = useState(setting?.isPublished ?? false)
  const [state, action, pending] = useActionState<StorefrontSaveState, FormData>(saveStorefrontSettings, { status: 'idle', message: '' })
  const revision = state.status === 'saved' ? state.revision ?? setting?.revision ?? 0 : state.revision ?? setting?.revision ?? 0
  const hasActiveLocation = locations.some(item => item.isActive)
  return <form action={action} className="grid min-w-0 gap-6">
    {state.message && <div role={state.status === 'saved' ? 'status' : 'alert'} className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border px-4 py-3 text-sm ${state.status === 'saved' ? '' : 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100'}`}>
      <span aria-hidden="true" className={`size-2 rounded-full ${state.status === 'saved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />{state.message}
      {state.status === 'conflict' && <a className="font-medium underline underline-offset-4" href="/dashboard/platform/storefront">Reload latest settings (discards this draft)</a>}
    </div>}
    <fieldset disabled={pending} className="grid min-w-0 gap-6 disabled:opacity-70">
      <input type="hidden" name="expectedRevision" value={revision} />
      {/* Retain the legacy value without presenting a competing storefront theme source. */}
      <input type="hidden" name="accentHue" value={setting?.accentHue ?? 220} />

      <section className="grid min-w-0 gap-4 rounded-2xl border bg-background p-4 md:p-6">
        <h2 className="text-sm font-semibold">Practice</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={fieldLabelClass}>Public display name
            <input name="displayName" required minLength={1} maxLength={80} value={name} onChange={event => setName(event.target.value)} className={inputClass} autoComplete="organization" />
          </label>
          <label className={fieldLabelClass}>Primary public location
            <select name="primaryLocationId" required value={location} onChange={event => setLocation(event.target.value)} className={inputClass}>
              <option value="" disabled>Select a location</option>
              {locations.map(item => <option key={item.id} value={item.id} disabled={!item.isActive}>{item.name}{item.isActive ? '' : ' (inactive)'}</option>)}
            </select>
          </label>
        </div>
        {!hasActiveLocation && <p role="status" className="text-sm text-amber-800 dark:text-amber-300">No active practice location.</p>}
      </section>

      <section className="min-w-0 rounded-2xl border bg-background p-4 md:p-6">
        <LogoPicker initialSvg={setting?.logoSvg} initialHue={setting?.logoHue} displayName={name} />
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-background p-4 md:p-6">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
          <input type="checkbox" name="isPublished" checked={published} onChange={event => setPublished(event.target.checked)} className="size-5 shrink-0 accent-violet-600" />
          Publish storefront
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><span aria-hidden="true" className={`size-2 rounded-full ${published ? 'bg-emerald-500' : 'bg-zinc-400'}`} />{published ? 'Live' : 'Hidden'}</span>
        </label>
        <div className={trackClass}>
          <button type="submit" disabled={pending || state.status === 'conflict' || !hasActiveLocation} className={pillClass('primary')}>{pending ? 'Saving…' : 'Save storefront settings'}</button>
        </div>
      </section>
    </fieldset>
  </form>
}
