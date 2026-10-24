'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { pillClass, trackClass, type PillVariant } from '@/features/platform/components/pill';
import { StatusDot } from '@/features/platform/components/medspa-ui';
import type { ActionResult } from '../types';

export function formNumber(form: FormData, name: string) {
  const value = Number(form.get(name));
  return Number.isFinite(value) ? value : NaN;
}

/** Dollars typed by staff → integer cents for the API. */
export function formCents(form: FormData, name: string) {
  const raw = String(form.get(name) ?? '').trim();
  if (!raw) return 0;
  const value = Math.round(Number(raw) * 100);
  return Number.isFinite(value) ? value : NaN;
}

/**
 * Drawer form with one idempotent command per distinct payload: a retry with the
 * same fields reuses the key, so a lost response can't create a second record.
 */
export function FormSheet({ trigger, triggerVariant = 'raised', title, submitLabel, onSubmit, children, size = 'md' }: {
  trigger: ReactNode;
  triggerVariant?: PillVariant;
  title: string;
  submitLabel: string;
  onSubmit: (form: FormData, idempotencyKey: string) => Promise<ActionResult>;
  children: ReactNode;
  size?: 'sm' | 'md';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const fingerprint = JSON.stringify([...form.entries()].map(([key, value]) => [key, String(value)]));
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    setBusy(true); setError(null);
    try {
      const result = await onSubmit(form, attempt.current.key);
      if (result.success) {
        attempt.current = null;
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error || 'Not saved.');
      }
    } catch {
      setError('Not saved. Check the list before retrying.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={pillClass(triggerVariant, size)} onClick={() => { setError(null); setOpen(true); }}>{trigger}</button>
      <Sheet open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription className="sr-only">{title}</SheetDescription>
          </SheetHeader>
          <form onSubmit={submit} className="flex flex-1 flex-col">
            <fieldset disabled={busy} className="grid flex-1 content-start gap-4 px-5 py-5">{children}</fieldset>
            <div className="sticky bottom-0 grid gap-3 border-t bg-background px-5 py-4">
              {error ? <p role="alert" className="flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300"><StatusDot tone="rose" className="mt-1.5" />{error}</p> : null}
              <div className={cn(trackClass, 'self-start')}>
                <button type="button" className={pillClass('quiet')} onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
                <button type="submit" className={pillClass('primary')} disabled={busy}>{busy ? 'Saving' : submitLabel}</button>
              </div>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function ServicePicker({ name, services, selected = [] }: { name: string; services: Array<{ id: string; name: string }>; selected?: string[] }) {
  const chosen = new Set(selected);
  if (!services.length) return <p className="text-sm text-muted-foreground">No active treatments</p>;
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Treatments</legend>
      <div className="grid max-h-60 gap-1 overflow-y-auto rounded-xl border p-2">
        {services.map((service) => (
          <label key={service.id} className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm hover:bg-muted/60">
            <input type="checkbox" name={name} value={service.id} defaultChecked={chosen.has(service.id)} className="size-4 accent-violet-600" />
            <span className="min-w-0 truncate">{service.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
