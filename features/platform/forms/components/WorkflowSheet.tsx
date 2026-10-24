'use client';

import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { fieldLabelClass, inputClass, pillClass, textareaClass, trackClass, type PillVariant } from '@/features/platform/components/pill';
import { StatusDot } from '@/features/platform/components/medspa-ui';
import type { Option, WorkflowResult } from '../types';

export type SheetField = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'datetime-local' | 'number' | 'checkbox';
  required?: boolean;
  options?: Option[];
  defaultValue?: string | boolean;
  maxLength?: number;
  min?: number;
  wide?: boolean;
};

export type SheetValues = Record<string, string | boolean>;

function initialValues(fields: SheetField[]): SheetValues {
  return Object.fromEntries(fields.map((field) => [field.name, field.defaultValue ?? (field.type === 'checkbox' ? false : '')]));
}

/**
 * A drawer that sends one workflow command. The idempotency key is frozen for
 * identical input, so a retry after a lost response cannot apply twice.
 */
export function WorkflowSheet({ triggerLabel, triggerVariant = 'raised', triggerSize = 'md', title, submitLabel, fields, onSubmit, children, disabled = false }: {
  triggerLabel: ReactNode;
  triggerVariant?: PillVariant;
  triggerSize?: 'sm' | 'md';
  title: string;
  submitLabel: string;
  fields: SheetField[];
  onSubmit: (values: SheetValues, idempotencyKey: string) => Promise<WorkflowResult>;
  children?: ReactNode;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<SheetValues>(() => initialValues(fields));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  function openSheet(next: boolean) {
    setOpen(next);
    if (next) { setValues(initialValues(fields)); setError(null); attempt.current = null; }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fingerprint = JSON.stringify(values);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    setBusy(true); setError(null);
    try {
      const result = await onSubmit(values, attempt.current.key);
      if (result.success) { setOpen(false); router.refresh(); }
      else setError(result.error || 'Not saved.');
    } catch {
      setError('Not confirmed. Reload before trying again.');
    } finally { setBusy(false); }
  }

  const set = (name: string, value: string | boolean) => setValues((current) => ({ ...current, [name]: value }));

  return (
    <Sheet open={open} onOpenChange={openSheet}>
      <button type="button" className={pillClass(triggerVariant, triggerSize)} disabled={disabled} onClick={() => openSheet(true)}>{triggerLabel}</button>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">{title}</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="flex flex-1 flex-col">
          <div className="grid flex-1 content-start gap-4 px-5 py-5 sm:grid-cols-2">
            {children ? <div className="sm:col-span-2">{children}</div> : null}
            {fields.map((field) => field.type === 'checkbox' ? (
              <label key={field.name} className="flex min-h-10 items-center gap-2.5 text-sm font-medium sm:col-span-2">
                <input type="checkbox" className="size-4" checked={values[field.name] === true} onChange={(event) => set(field.name, event.target.checked)} />{field.label}
              </label>
            ) : (
              <label key={field.name} className={cn(fieldLabelClass, (field.wide || field.type === 'textarea') && 'sm:col-span-2')}>
                {field.label}
                {field.type === 'textarea' ? (
                  <textarea className={textareaClass} required={field.required} maxLength={field.maxLength || 4000} value={String(values[field.name] ?? '')} onChange={(event) => set(field.name, event.target.value)} />
                ) : field.type === 'select' ? (
                  <select className={inputClass} required={field.required} value={String(values[field.name] ?? '')} onChange={(event) => set(field.name, event.target.value)}>
                    <option value="">{field.required ? 'Choose' : 'None'}</option>
                    {(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : (
                  <input className={inputClass} type={field.type} required={field.required} min={field.min} maxLength={field.maxLength || 500} value={String(values[field.name] ?? '')} onChange={(event) => set(field.name, event.target.value)} />
                )}
              </label>
            ))}
          </div>
          <div className="sticky bottom-0 flex flex-col gap-3 border-t bg-background px-5 py-4">
            {error ? <p role="alert" className="flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300"><StatusDot tone="rose" className="mt-1.5" />{error}</p> : null}
            <div className={cn(trackClass, 'self-start')}>
              <button type="button" className={pillClass('quiet')} onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className={pillClass('primary')} disabled={busy}>{busy ? 'Saving' : submitLabel}</button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
