'use client'

import { useEffect, useRef, useState } from 'react'
import { LOGO_ICONS } from '../lib/icon-registry'
import { sanitizeStoreLogoSvg } from '@/features/lib/sanitize-store-logo'
import { DEFAULT_LOGO_SVG } from '@/features/lib/store-logo'

export function LogoPicker({ initialSvg, initialHue }: { initialSvg?: string; initialHue?: number }) {
  const [svg, setSvg] = useState(initialSvg || '')
  const [draft, setDraft] = useState(initialSvg || '')
  const [customMode, setCustomMode] = useState(false)
  const [hue, setHue] = useState(initialHue ?? 0)
  const safe = svg ? sanitizeStoreLogoSvg(svg) : DEFAULT_LOGO_SVG
  const safeDraft = draft ? sanitizeStoreLogoSvg(draft) : ''
  const input = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { input.current?.setCustomValidity(customMode && draft && !safeDraft ? 'Enter a valid, safe SVG document.' : '') }, [customMode, draft, safeDraft])
  const selected = LOGO_ICONS.find(icon => icon.lightSvg === svg)
  return <fieldset className="grid min-w-0 gap-4 rounded-xl border p-4">
    <legend className="px-1 text-sm font-medium">Logo</legend>
    <input type="hidden" name="logoSvg" value={svg} />
    <label className="grid gap-2 text-sm font-medium">Logo library
      <select aria-label="Logo library" value={customMode ? 'custom' : svg ? selected?.id || 'custom' : 'default'} onChange={event => {
        const icon = LOGO_ICONS.find(candidate => candidate.id === event.target.value)
        if (event.target.value === 'custom') { setDraft(svg); setCustomMode(true); return }
        setCustomMode(false)
        setSvg(icon?.lightSvg || '')
      }} className="h-11 w-full rounded-lg border bg-background px-3 font-normal">
        <option value="default">Default logo</option>
        {LOGO_ICONS.map(icon => <option key={icon.id} value={icon.id}>{icon.name}</option>)}
        <option value="custom">Custom SVG</option>
      </select>
    </label>
    {!customMode && svg && !selected && <button type="button" className="min-h-11 rounded-lg border px-3 text-sm" onClick={() => { setDraft(svg); setCustomMode(true) }}>Edit custom SVG</button>}
    {customMode && <>
      <label className="grid gap-2 text-sm font-medium">Custom SVG
        <textarea ref={input} aria-label="Custom SVG" maxLength={100000} value={draft} onChange={event => setDraft(event.target.value)} aria-invalid={Boolean(draft && !safeDraft)} className="min-h-32 w-full rounded-lg border bg-background p-3 font-mono text-xs font-normal" spellCheck={false} />
      </label>
      <p className="text-sm text-muted-foreground">Apply the draft before saving settings. Cancel keeps the current logo.</p>
      {draft && !safeDraft ? <p role="alert" className="text-sm text-destructive">Enter a valid, safe SVG document.</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!safeDraft} className="min-h-11 rounded-lg border px-3 text-sm disabled:opacity-50" onClick={() => { if (safeDraft) { setSvg(safeDraft); setCustomMode(false) } }}>Apply SVG</button>
        <button type="button" className="min-h-11 rounded-lg border px-3 text-sm" onClick={() => { setDraft(svg); setCustomMode(false) }}>Cancel edit</button>
      </div>
    </>}
    <button type="button" className="min-h-11 rounded-lg border px-3 text-sm" onClick={() => { setSvg(''); setDraft(''); setCustomMode(false) }}>Reset logo</button>
    <div className="flex min-h-16 items-center gap-4" aria-label="Current logo preview">
      <span className="block size-12 shrink-0 overflow-hidden [&>svg]:block [&>svg]:size-full" style={{ filter: `hue-rotate(${hue}deg)` }} dangerouslySetInnerHTML={{ __html: safe || DEFAULT_LOGO_SVG }} aria-hidden="true" />
      <output className="text-sm">{hue}°</output>
    </div>
    <label className="grid gap-2 text-sm font-medium">Logo hue
      <input name="logoHue" type="range" min={0} max={360} step={1} value={hue} onChange={event => setHue(Number(event.target.value))} className="h-11 w-full" />
    </label>
  </fieldset>
}
