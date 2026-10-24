'use client';

import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { pillClass, trackClass, type PillVariant } from '@/features/platform/components/pill';
import { StatusDot } from '@/features/platform/components/medspa-ui';
import type { WorkflowActionResult } from '../types';

/**
 * A drawer form for one workflow command. The request key is created on the
 * first submit and reused while the drawer stays open, so a retry after a lost
 * response can't apply the command twice.
 */
export function WorkflowSheet({
  trigger, triggerVariant = 'raised', triggerSize = 'md', title, submitLabel, children, submit, onDone, wide = false,
}: {
  trigger: ReactNode;
  triggerVariant?: PillVariant;
  triggerSize?: 'sm' | 'md';
  title: string;
  submitLabel: string;
  children: ReactNode;
  submit: (form: FormData, idempotencyKey: string) => Promise<WorkflowActionResult>;
  onDone?: (result: WorkflowActionResult) => void;
  wide?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef<string | null>(null);

  function change(next: boolean) {
    setOpen(next);
    if (!next) { setError(null); key.current = null; }
  }

  async function handle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    key.current ||= crypto.randomUUID();
    try {
      const result = await submit(new FormData(event.currentTarget), key.current);
      if (!result.success) { setError(result.error || 'Not saved'); return; }
      onDone?.(result);
      change(false);
      router.refresh();
    } catch {
      setError('Not confirmed. Check the record before retrying.');
    } finally { setBusy(false); }
  }

  return (
    <>
      <button type="button" className={pillClass(triggerVariant, triggerSize)} onClick={() => change(true)}>{trigger}</button>
      <Sheet open={open} onOpenChange={change}>
        <SheetContent className={cn('flex w-full flex-col gap-0 overflow-y-auto p-0', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription className="sr-only">{title}</SheetDescription>
          </SheetHeader>
          <form onSubmit={handle} className="flex min-h-0 flex-1 flex-col">
            <fieldset disabled={busy} className="grid flex-1 content-start gap-4 px-5 py-5">{children}</fieldset>
            <div className="sticky bottom-0 grid gap-3 border-t bg-background px-5 py-4">
              {error ? <p role="alert" className="flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300"><StatusDot tone="rose" className="mt-1.5" />{error}</p> : null}
              <div className={cn(trackClass, 'self-start')}>
                <button type="button" className={pillClass('quiet')} onClick={() => change(false)}>Cancel</button>
                <button type="submit" className={pillClass('primary')}>{busy ? 'Saving' : submitLabel}</button>
              </div>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

export const field = 'grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground';
export const control = 'h-10 w-full min-w-0 rounded-xl border bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';
export const area = 'min-h-24 w-full min-w-0 rounded-xl border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';
export const check = 'flex min-h-10 items-center gap-2.5 rounded-xl border px-3 text-sm font-medium text-foreground';

export function str(form: FormData, name: string) { return String(form.get(name) ?? '').trim(); }
export function all(form: FormData, name: string) { return form.getAll(name).map(String).filter(Boolean); }
export function on(form: FormData, name: string) { return form.get(name) === 'on'; }
