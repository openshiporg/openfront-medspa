'use client';

import { useActionState, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fieldLabelClass, inputClass, pillClass, trackClass } from '@/features/platform/components/pill';
import { Panel, usd } from '@/features/platform/components/medspa-ui';
import { deleteVariant, saveVariant } from '../actions/catalog';
import type { CatalogSaveState, CatalogVariant } from '../types';

const initialState: CatalogSaveState = { status: 'idle', message: '' };

function VariantForm({ serviceId, variant, onDone }: { serviceId: string; variant?: CatalogVariant; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveVariant, initialState);
  useEffect(() => { if (state.status === 'saved') onDone(); }, [state, onDone]);
  return (
    <form action={action} className="grid gap-3 rounded-2xl border bg-muted/20 p-4">
      <input type="hidden" name="id" value={variant?.id || ''} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <label className={fieldLabelClass}>Name<input className={inputClass} name="name" required maxLength={120} defaultValue={variant?.name || ''} /></label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className={fieldLabelClass}>Price ($)<input className={inputClass} name="price" type="number" min={0} step="0.01" required defaultValue={variant?.price != null ? (variant.price / 100).toString() : ''} /></label>
        <label className={fieldLabelClass}>Minutes<input className={inputClass} name="duration" type="number" min={0} max={600} step={5} defaultValue={variant?.duration ?? ''} /></label>
        <label className={fieldLabelClass}>Provider level<input className={inputClass} name="staffLevel" maxLength={60} defaultValue={variant?.staffLevel || ''} /></label>
        <label className={fieldLabelClass}>Order<input className={inputClass} name="displayOrder" type="number" step={1} defaultValue={variant?.displayOrder ?? 0} /></label>
      </div>
      {state.status === 'error' ? <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{state.message}</p> : null}
      <div className={cn(trackClass, 'self-start')}>
        <button type="button" className={pillClass('quiet', 'sm')} onClick={onDone}>Cancel</button>
        <button type="submit" className={pillClass('primary', 'sm')} disabled={pending}>{pending ? 'Saving' : variant ? 'Save' : 'Add variant'}</button>
      </div>
    </form>
  );
}

/** Price and duration tiers of one treatment. */
export function VariantsPanel({ serviceId, variants }: { serviceId: string; variants: CatalogVariant[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string) {
    setBusy(id); setError(null);
    const result = await deleteVariant({ id, serviceId }).catch(() => ({ success: false, error: 'Not deleted' }));
    setBusy(null);
    if (!result.success) setError(result.error || 'Not deleted');
  }

  return (
    <Panel title="Variants" actions={editing !== 'new' ? <div className={trackClass}><button type="button" className={pillClass('raised', 'sm')} onClick={() => setEditing('new')}>Add variant</button></div> : null}>
      <div className="grid gap-3">
        {editing === 'new' ? <VariantForm serviceId={serviceId} onDone={() => setEditing(null)} /> : null}
        {error ? <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}
        {variants.length ? (
          <ul className="divide-y">
            {variants.map((variant) => (
              <li key={variant.id} className="py-3 first:pt-0 last:pb-0">
                {editing === variant.id ? <VariantForm serviceId={serviceId} variant={variant} onDone={() => setEditing(null)} /> : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{variant.name}</div>
                      <div className="text-xs tabular-nums text-muted-foreground">{usd(variant.price)}{variant.duration ? ` · ${variant.duration} min` : ''}{variant.staffLevel ? ` · ${variant.staffLevel}` : ''}</div>
                    </div>
                    <div className={trackClass}>
                      <button type="button" className={pillClass('raised', 'sm')} onClick={() => setEditing(variant.id)}>Edit</button>
                      <button type="button" aria-label={`Delete ${variant.name}`} className={pillClass('quiet', 'sm')} disabled={busy === variant.id} onClick={() => remove(variant.id)}><Trash2 /></button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : editing !== 'new' ? <p className="text-sm text-muted-foreground">No variants</p> : null}
      </div>
    </Panel>
  );
}
