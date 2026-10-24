'use client'

import { useActionState } from 'react'
import { savePracticeTaxRate } from '../actions/practiceTax'
import { fieldLabelClass, inputClass, pillClass, trackClass } from '@/features/platform/components/pill'
import { Panel, StatusDot } from '@/features/platform/components/medspa-ui'

/** Checkout sales tax for the practice, entered as a percentage. */
export function PracticeTaxForm({ practiceId, taxRate }: { practiceId: string; taxRate: number }) {
  const [state, action, pending] = useActionState(savePracticeTaxRate, { status: 'idle' as const, message: '' })
  return (
    <Panel title="Checkout tax">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="practiceId" value={practiceId} />
        <label className={fieldLabelClass}>Tax rate (%)
          <input name="taxPercent" type="number" min={0} max={100} step="0.001" required defaultValue={Number((taxRate * 100).toFixed(3))} className={`${inputClass} w-32`} />
        </label>
        <div className={trackClass}><button type="submit" disabled={pending} className={pillClass('primary')}>{pending ? 'Saving' : 'Save'}</button></div>
        {state.message ? <p role={state.status === 'error' ? 'alert' : 'status'} className="flex w-full items-center gap-2 text-sm text-muted-foreground"><StatusDot tone={state.status === 'error' ? 'rose' : 'emerald'} />{state.message}</p> : null}
      </form>
    </Panel>
  )
}
