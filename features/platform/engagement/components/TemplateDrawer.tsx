'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { fieldLabelClass, inputClass, pillClass, textareaClass, trackClass } from '@/features/platform/components/pill';
import { StatusDot } from '@/features/platform/components/medspa-ui';
import { saveMessageTemplate } from '../actions/engagement';
import { TEMPLATE_TYPES, type MessageTemplateView, type TemplateType } from '../types';

const typeLabels: Record<TemplateType, string> = { reminder: 'Reminder', confirmation: 'Confirmation', marketing: 'Marketing' };
const KNOWN_VARIABLES = ['clientName', 'appointmentDate', 'appointmentTime', 'providerName', 'serviceName', 'practiceName'];

/** Variables used in the text as {{name}}, so the saved list matches the message. */
function variablesIn(content: string) {
  return [...new Set([...content.matchAll(/\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g)].map((match) => match[1]))];
}

export function TemplateDrawer({ template }: { template?: MessageTemplateView }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initial = { name: template?.name || '', type: template?.type || 'reminder' as TemplateType, content: template?.content || '', isActive: template?.isActive ?? true };
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof initial>(key: K, value: (typeof initial)[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const result = await saveMessageTemplate({ id: template?.id || null, ...form, variables: variablesIn(form.content) });
      if (result.success) { setOpen(false); router.refresh(); }
      else setError(result.error || 'Template not saved.');
    } catch {
      setError('Template not saved. Try again.');
    } finally { setBusy(false); }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { setOpen(next); if (next) { setForm(initial); setError(null); } }}>
      <div className={trackClass}>
        {template
          ? <button type="button" className={pillClass('raised', 'sm')} onClick={() => setOpen(true)} aria-label={`Edit ${template.name}`}><Pencil />Edit</button>
          : <button type="button" className={pillClass('primary')} onClick={() => setOpen(true)}><Plus />New template</button>}
      </div>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>{template ? 'Edit template' : 'New template'}</SheetTitle>
          <SheetDescription className="sr-only">Message name, type and text.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="grid gap-4 px-5 py-5">
          <label className={fieldLabelClass}>Name<input className={inputClass} required maxLength={120} value={form.name} onChange={(event) => set('name', event.target.value)} /></label>
          <label className={fieldLabelClass}>Type
            <select className={inputClass} value={form.type} onChange={(event) => set('type', event.target.value as TemplateType)}>
              {TEMPLATE_TYPES.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}
            </select>
          </label>
          <label className={fieldLabelClass}>Message<textarea className={cn(textareaClass, 'min-h-36')} required maxLength={5000} value={form.content} onChange={(event) => set('content', event.target.value)} /></label>
          <div className="flex flex-wrap gap-1.5" aria-label="Insert variable">
            {KNOWN_VARIABLES.map((variable) => (
              <button key={variable} type="button" className="h-7 rounded-full border bg-background px-2.5 font-mono text-[11px] text-muted-foreground hover:border-foreground/40 hover:text-foreground" onClick={() => set('content', `${form.content}{{${variable}}}`)}>{`{{${variable}}}`}</button>
            ))}
          </div>
          <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-medium">
            <input type="checkbox" className="size-4" checked={form.isActive} onChange={(event) => set('isActive', event.target.checked)} />Active
          </label>
          {error ? <p role="alert" className="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-300"><StatusDot tone="rose" />{error}</p> : null}
          <div className={cn(trackClass, 'self-start')}>
            <button type="button" className={pillClass('quiet')} onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className={pillClass('primary')} disabled={busy || !form.name.trim() || !form.content.trim()}>{busy ? 'Saving' : 'Save'}</button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
