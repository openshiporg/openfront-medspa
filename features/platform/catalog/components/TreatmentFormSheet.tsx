'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { fieldLabelClass, inputClass, pillClass, textareaClass, trackClass } from '@/features/platform/components/pill';
import { saveTreatment } from '../actions/catalog';
import { CLINICAL_FLAGS, type CatalogOptions, type CatalogSaveState, type CatalogTreatment } from '../types';

const initialState: CatalogSaveState = { status: 'idle', message: '' };

function dollars(cents?: number | null) {
  return cents ? (cents / 100).toFixed(2).replace(/\.00$/, '') : '0';
}

function CheckList({ name, items, selected, empty }: { name: string; items: Array<{ id: string; label: string; meta?: string | null }>; selected: Set<string>; empty: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="grid max-h-44 gap-1 overflow-y-auto rounded-[6px] border p-2">
      {items.map((item) => (
        <label key={item.id} className="flex min-h-9 items-center gap-2.5 rounded-[5px] px-2 text-sm hover:bg-muted/50">
          <input type="checkbox" name={name} value={item.id} defaultChecked={selected.has(item.id)} className="size-4" />
          <span className="min-w-0 truncate">{item.label}</span>
          {item.meta ? <span className="ml-auto shrink-0 text-xs text-muted-foreground">{item.meta}</span> : null}
        </label>
      ))}
    </div>
  );
}

/** Create or edit a treatment: price, timing, online booking, clinical flags, rooms and providers. */
export function TreatmentFormSheet({ treatment, options, size = 'md' }: { treatment?: CatalogTreatment; options: CatalogOptions; size?: 'sm' | 'md' }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveTreatment, initialState);
  const [isPublic, setIsPublic] = useState(treatment ? treatment.isPublic === true : false);
  const [active, setActive] = useState(treatment ? treatment.status !== 'inactive' : true);
  const [flags, setFlags] = useState<Record<string, boolean>>(() => Object.fromEntries(CLINICAL_FLAGS.map((flag) => [flag.key, treatment ? (treatment as any)[flag.key] === true : false])));
  const [deposit, setDeposit] = useState(treatment?.depositRequired === true);
  const clinical = Object.values(flags).some(Boolean);

  useEffect(() => {
    if (state.status !== 'saved') return;
    setOpen(false);
    if (!treatment && state.id) router.push(`/dashboard/platform/catalog/${state.id}`);
  }, [state, treatment, router]);

  const onlineBlocked = !active ? 'Inactive' : clinical ? 'Needs clinical authority' : null;

  return (
    <>
      <button type="button" className={pillClass(treatment ? 'raised' : 'primary', size)} onClick={() => setOpen(true)}>
        {treatment ? <><Pencil />Edit</> : <><Plus />New treatment</>}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>{treatment ? `Edit ${treatment.name}` : 'New treatment'}</SheetTitle>
            <SheetDescription className="sr-only">Treatment details</SheetDescription>
          </SheetHeader>
          <form action={action} className="grid gap-5 px-5 py-5">
            <input type="hidden" name="id" value={treatment?.id || ''} />
            <label className={fieldLabelClass}>Name<input className={inputClass} name="name" required maxLength={120} defaultValue={treatment?.name || ''} /></label>
            <label className={fieldLabelClass}>Category
              <select className={inputClass} name="categoryId" defaultValue={treatment?.category?.id || ''}>
                <option value="">No category</option>
                {options.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className={fieldLabelClass}>Description<textarea className={textareaClass} name="description" maxLength={2000} defaultValue={treatment?.description || ''} /></label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className={fieldLabelClass}>Price ($)<input className={inputClass} name="price" type="number" min={0} step="0.01" required inputMode="decimal" defaultValue={dollars(treatment?.price)} /></label>
              <label className={fieldLabelClass}>Duration (min)<input className={inputClass} name="baseDuration" type="number" min={5} max={600} step={5} required defaultValue={treatment?.baseDuration || 60} /></label>
              <label className={fieldLabelClass}>Cleanup (min)<input className={inputClass} name="cleanupBufferMinutes" type="number" min={0} max={240} step={5} defaultValue={treatment?.cleanupBufferMinutes ?? 15} /></label>
            </div>

            <div className="grid gap-3 rounded-[6px] border p-4">
              <label className="flex min-h-9 items-center gap-2.5 text-sm font-medium">
                <input type="checkbox" name="depositRequired" checked={deposit} onChange={(event) => setDeposit(event.target.checked)} className="size-4" />Deposit required
              </label>
              {deposit ? <label className={fieldLabelClass}>Deposit ($)<input className={inputClass} name="depositAmount" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={dollars(treatment?.depositAmount)} /></label> : null}
            </div>

            <fieldset className="grid gap-2 rounded-[6px] border p-4">
              <legend className="px-1 text-xs font-medium text-muted-foreground">Clinical requirements</legend>
              {CLINICAL_FLAGS.map((flag) => (
                <label key={flag.key} className="flex min-h-9 items-center gap-2.5 text-sm">
                  <input type="checkbox" name={flag.key} checked={flags[flag.key]} onChange={(event) => { setFlags({ ...flags, [flag.key]: event.target.checked }); if (event.target.checked) setIsPublic(false); }} className="size-4" />
                  {flag.label}
                </label>
              ))}
            </fieldset>

            <div className="grid gap-3 rounded-[6px] border p-4">
              <label className={fieldLabelClass}>Status
                <select className={inputClass} name="status" value={active ? 'active' : 'inactive'} onChange={(event) => { const next = event.target.value === 'active'; setActive(next); if (!next) setIsPublic(false); }}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className={cn('flex min-h-9 items-center gap-2.5 text-sm font-medium', onlineBlocked && 'text-muted-foreground')}>
                <input type="checkbox" name="isPublic" checked={isPublic && !onlineBlocked} disabled={Boolean(onlineBlocked)} onChange={(event) => setIsPublic(event.target.checked)} className="size-4" />
                Bookable online{onlineBlocked ? <span className="text-xs font-normal">· {onlineBlocked}</span> : null}
              </label>
            </div>

            <fieldset className="grid gap-2">
              <legend className="mb-1 text-xs font-medium text-muted-foreground">Rooms & devices required</legend>
              <CheckList name="resourceIds" empty="No active rooms or devices" selected={new Set(treatment?.requiredResources.map((item) => item.id) || [])}
                items={options.resources.map((item) => ({ id: item.id, label: item.name, meta: item.type }))} />
            </fieldset>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-xs font-medium text-muted-foreground">Providers who perform it</legend>
              <CheckList name="providerIds" empty="No active providers" selected={new Set(treatment?.specialists.map((item) => item.id) || [])}
                items={options.providers.map((item) => ({ id: item.id, label: item.user?.name || 'Provider' }))} />
            </fieldset>

            {state.status === 'error' ? <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{state.message}</p> : null}
            <div className={cn(trackClass, 'self-start')}>
              <button type="button" className={pillClass('quiet')} onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className={pillClass('primary')} disabled={pending}>{pending ? 'Saving' : treatment ? 'Save' : 'Add treatment'}</button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
