'use client'

import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { LOGO_ICONS } from '../lib/icon-registry'
import { sanitizeStoreLogoSvg } from '@/features/lib/sanitize-store-logo'
import { DEFAULT_LOGO_SVG } from '@/features/lib/store-logo'
import { pillClass, trackClass } from '@/features/platform/components/pill'

/** Untitled UI registry tile picker, custom SVG escape hatch, and hue, with a live lockup. */
export function LogoPicker({ initialSvg, initialHue, displayName }: { initialSvg?: string; initialHue?: number; displayName?: string }) {
  const [svg, setSvg] = useState(initialSvg || '')
  const [draft, setDraft] = useState(initialSvg || '')
  const [customMode, setCustomMode] = useState(false)
  const [hue, setHue] = useState(initialHue ?? 0)
  const safe = svg ? sanitizeStoreLogoSvg(svg) : DEFAULT_LOGO_SVG
  const safeDraft = draft ? sanitizeStoreLogoSvg(draft) : ''
  const input = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { input.current?.setCustomValidity(customMode && draft && !safeDraft ? 'Enter a valid, safe SVG document.' : '') }, [customMode, draft, safeDraft])
  const selected = LOGO_ICONS.find(icon => icon.lightSvg === svg)
  const isDefault = !svg
  const isCustom = Boolean(svg) && !selected

  return <fieldset className="grid min-w-0 gap-5">
    <legend className="mb-3 text-sm font-semibold">Logo</legend>
    <input type="hidden" name="logoSvg" value={svg} />

    <div className="flex min-w-0 items-center gap-3 rounded-2xl border bg-muted/30 p-4" aria-label="Current logo preview">
      <span className="block size-10 shrink-0 overflow-hidden [&>svg]:block [&>svg]:size-full" style={{ filter: `hue-rotate(${hue}deg)` }} dangerouslySetInnerHTML={{ __html: safe || DEFAULT_LOGO_SVG }} aria-hidden="true" />
      <span className="min-w-0 truncate text-lg font-semibold tracking-tight">{displayName || 'Practice name'}</span>
      <output className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">{hue}°</output>
    </div>

    <div role="radiogroup" aria-label="Logo library" className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
      <Tile label="Default logo" active={isDefault && !customMode} onSelect={() => { setCustomMode(false); setSvg('') }} svg={DEFAULT_LOGO_SVG} hue={hue} />
      {LOGO_ICONS.map(icon => (
        <Tile key={icon.id} label={icon.name} active={!customMode && selected?.id === icon.id} onSelect={() => { setCustomMode(false); setSvg(icon.lightSvg) }} svg={icon.lightSvg} hue={hue} />
      ))}
    </div>

    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">Logo hue
      <input name="logoHue" type="range" min={0} max={360} step={1} value={hue} onChange={event => setHue(Number(event.target.value))} className="h-8 w-full accent-violet-600" />
    </label>

    <div className={`${trackClass} w-fit flex-wrap`}>
      <button type="button" className={pillClass(customMode || isCustom ? 'raised' : 'quiet', 'sm')} onClick={() => { setDraft(svg); setCustomMode(true) }}>{isCustom ? 'Edit custom SVG' : 'Custom SVG'}</button>
      <button type="button" className={pillClass('quiet', 'sm')} onClick={() => { setSvg(''); setDraft(''); setCustomMode(false) }}>Reset logo</button>
    </div>

    {customMode && <div className="grid gap-3 rounded-2xl border p-4">
      <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">Custom SVG
        <textarea ref={input} aria-label="Custom SVG" maxLength={100000} value={draft} onChange={event => setDraft(event.target.value)} aria-invalid={Boolean(draft && !safeDraft)} className="min-h-32 w-full min-w-0 rounded-xl border bg-background p-3 font-mono text-xs text-foreground" spellCheck={false} />
      </label>
      {draft && !safeDraft ? <p role="alert" className="text-sm text-destructive">Enter a valid, safe SVG document.</p> : null}
      <div className={`${trackClass} w-fit flex-wrap`}>
        <button type="button" disabled={!safeDraft} className={pillClass('raised', 'sm')} onClick={() => { if (safeDraft) { setSvg(safeDraft); setCustomMode(false) } }}>Apply SVG</button>
        <button type="button" className={pillClass('quiet', 'sm')} onClick={() => { setDraft(svg); setCustomMode(false) }}>Cancel</button>
      </div>
    </div>}
  </fieldset>
}

function Tile({ label, active, onSelect, svg, hue }: { label: string; active: boolean; onSelect: () => void; svg: string; hue: number }) {
  return <button
    type="button"
    role="radio"
    aria-checked={active}
    aria-label={label}
    title={label}
    onClick={onSelect}
    className={`relative flex aspect-square min-w-0 items-center justify-center rounded-xl border bg-background p-2.5 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'border-violet-500 shadow-[0_0_0_3px_rgb(139_92_246/0.18)]' : 'hover:bg-muted/50'}`}
  >
    <span className="block size-full overflow-hidden [&>svg]:block [&>svg]:size-full" style={{ filter: `hue-rotate(${hue}deg)` }} dangerouslySetInnerHTML={{ __html: svg }} aria-hidden="true" />
    {active ? <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-violet-600 text-white"><Check className="size-3" /></span> : null}
  </button>
}
