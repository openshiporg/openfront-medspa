'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { fieldLabelClass, inputClass, pillClass, textareaClass, trackClass, type PillVariant } from '@/features/platform/components/pill';
import { StatusDot } from '@/features/platform/components/medspa-ui';
import { saveFormTemplate, saveIntakeForm } from '../actions/forms';
import type { FormFieldDefinition, FormFieldType, FormTemplateRow, IntakeFormRow, Option } from '../types';

const FIELD_TYPES: Array<{ value: FormFieldType; label: string }> = [
  { value: 'text', label: 'Short answer' }, { value: 'textarea', label: 'Long answer' }, { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Single choice' }, { value: 'select', label: 'Dropdown' }, { value: 'date', label: 'Date' }, { value: 'signature', label: 'Signature' },
];
const TEMPLATE_TYPES: Option[] = [
  { value: 'intake', label: 'Intake' }, { value: 'clinical_intake', label: 'Clinical intake' }, { value: 'consent', label: 'Consent' }, { value: 'waiver', label: 'Waiver' },
];

type DraftField = FormFieldDefinition & { optionsText: string; key: string };

function toDraft(fields: FormFieldDefinition[]): DraftField[] {
  return fields.map((field) => ({ ...field, optionsText: (field.options || []).join(', '), key: crypto.randomUUID() }));
}

function slug(label: string) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48);
  return /^[a-z]/.test(base) ? base : `field_${base}`.slice(0, 48);
}

function toFields(drafts: DraftField[]): FormFieldDefinition[] {
  return drafts.map(({ key: _key, optionsText, ...field }) => ({
    ...field,
    id: field.id.trim() || slug(field.label),
    label: field.label.trim(),
    ...(field.type === 'select' || field.type === 'radio' ? { options: optionsText.split(',').map((option) => option.trim()).filter(Boolean) } : { options: undefined }),
  }));
}

export function FormEditorSheet({ kind, row, links, triggerLabel, triggerVariant = 'raised' }: {
  kind: 'intake' | 'template';
  row?: IntakeFormRow | FormTemplateRow;
  links: Option[];
  triggerLabel: string;
  triggerVariant?: PillVariant;
}) {
  const router = useRouter();
  const template = kind === 'template' ? row as FormTemplateRow | undefined : undefined;
  const initialLinks = () => row ? (kind === 'intake' ? (row as IntakeFormRow).requiredForServices : (row as FormTemplateRow).requiredForCategories).map((item) => item.id) : [];
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('intake');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [linked, setLinked] = useState<string[]>([]);
  const [fields, setFields] = useState<DraftField[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  function reset(next: boolean) {
    setOpen(next);
    if (!next) return;
    setName(row?.name || ''); setType(template?.type || 'intake'); setDescription(template?.description || '');
    setIsActive(row ? row.isActive : true); setLinked(initialLinks());
    setFields(toDraft(row?.fields?.length ? row.fields : [{ id: '', type: 'textarea', label: '', required: true }]));
    setError(null); attempt.current = null;
  }

  const update = (key: string, patch: Partial<DraftField>) => setFields((current) => current.map((field) => field.key === key ? { ...field, ...patch } : field));
  const move = (index: number, delta: number) => setFields((current) => {
    const next = [...current]; const target = index + delta;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const payload = { name: name.trim(), fields: toFields(fields), isActive, linked: [...linked].sort(), type, description };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    setBusy(true); setError(null);
    try {
      const result = kind === 'intake'
        ? await saveIntakeForm({ formId: row?.id || null, name: payload.name, fields: payload.fields, requiredForServiceIds: payload.linked, isActive, idempotencyKey: attempt.current.key })
        : await saveFormTemplate({ templateId: row?.id || null, name: payload.name, type, description, fields: payload.fields, requiredForCategoryIds: payload.linked, isActive, idempotencyKey: attempt.current.key });
      if (result.success) { setOpen(false); router.refresh(); } else setError(result.error || 'Not saved.');
    } catch { setError('Not confirmed. Reload before trying again.'); }
    finally { setBusy(false); }
  }

  const title = row ? `Edit ${row.name}` : kind === 'intake' ? 'New intake form' : 'New form template';

  return (
    <Sheet open={open} onOpenChange={reset}>
      <button type="button" className={pillClass(triggerVariant, 'sm')} onClick={() => reset(true)}>{triggerLabel}</button>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">{title}</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="flex flex-1 flex-col">
          <div className="grid flex-1 content-start gap-5 px-5 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={cn(fieldLabelClass, kind === 'intake' && 'sm:col-span-2')}>Name<input className={inputClass} required maxLength={200} value={name} onChange={(event) => setName(event.target.value)} /></label>
              {kind === 'template' ? (
                <label className={fieldLabelClass}>Type<select className={inputClass} value={type} onChange={(event) => setType(event.target.value)}>{TEMPLATE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              ) : null}
              {kind === 'template' ? <label className={cn(fieldLabelClass, 'sm:col-span-2')}>Description<textarea className={textareaClass} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></label> : null}
              <label className="flex min-h-10 items-center gap-2.5 text-sm font-medium"><input type="checkbox" className="size-4" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />Active</label>
            </div>
            {template && template.submissionsCount > 0 ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><StatusDot tone="amber" />Field changes save as version {template.version + 1}</p> : null}

            <fieldset className="grid gap-2">
              <legend className="mb-2 text-xs font-medium text-muted-foreground">{kind === 'intake' ? 'Required for treatments' : 'Required for categories'}</legend>
              {links.length ? (
                <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                  {links.map((option) => {
                    const checked = linked.includes(option.value);
                    return (
                      <label key={option.value} className={cn('inline-flex h-8 cursor-pointer items-center gap-2 rounded-[5px] border px-3 text-xs font-medium', checked ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200' : 'bg-background text-muted-foreground')}>
                        <input type="checkbox" className="sr-only" checked={checked} onChange={() => setLinked((current) => checked ? current.filter((id) => id !== option.value) : [...current, option.value])} />{option.label}
                      </label>
                    );
                  })}
                </div>
              ) : <p className="text-xs text-muted-foreground">None available</p>}
            </fieldset>

            <fieldset className="grid gap-3">
              <legend className="mb-1 text-xs font-medium text-muted-foreground">Fields</legend>
              {fields.map((field, index) => (
                <div key={field.key} className="grid gap-3 rounded-[6px] border bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
                  <label className={fieldLabelClass}>Label<input className={inputClass} required maxLength={200} value={field.label} onChange={(event) => update(field.key, { label: event.target.value })} /></label>
                  <label className={fieldLabelClass}>Type<select className={inputClass} value={field.type} onChange={(event) => update(field.key, { type: event.target.value as FormFieldType })}>{FIELD_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                  {field.type === 'select' || field.type === 'radio' ? (
                    <label className={cn(fieldLabelClass, 'sm:col-span-2')}>Options, comma separated<input className={inputClass} required value={field.optionsText} onChange={(event) => update(field.key, { optionsText: event.target.value })} /></label>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" className="size-4" checked={field.required} onChange={(event) => update(field.key, { required: event.target.checked })} />Required</label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">ID<input className="h-7 w-32 rounded-[5px] border bg-background px-2 font-mono text-xs" maxLength={64} value={field.id} placeholder={slug(field.label || 'field')} onChange={(event) => update(field.key, { id: event.target.value })} /></label>
                    </div>
                    <div className={trackClass}>
                      <button type="button" aria-label="Move up" className={pillClass('quiet', 'sm')} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp /></button>
                      <button type="button" aria-label="Move down" className={pillClass('quiet', 'sm')} disabled={index === fields.length - 1} onClick={() => move(index, 1)}><ArrowDown /></button>
                      <button type="button" aria-label="Remove field" className={pillClass('danger', 'sm')} disabled={fields.length === 1} onClick={() => setFields((current) => current.filter((item) => item.key !== field.key))}><Trash2 /></button>
                    </div>
                  </div>
                </div>
              ))}
              <div className={cn(trackClass, 'self-start')}>
                <button type="button" className={pillClass('raised', 'sm')} disabled={fields.length >= 100} onClick={() => setFields((current) => [...current, { id: '', type: 'text', label: '', required: false, optionsText: '', key: crypto.randomUUID() }])}><Plus />Add field</button>
              </div>
            </fieldset>
          </div>
          <div className="sticky bottom-0 flex flex-col gap-3 border-t bg-background px-5 py-4">
            {error ? <p role="alert" className="flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300"><StatusDot tone="rose" className="mt-1.5" />{error}</p> : null}
            <div className={cn(trackClass, 'self-start')}>
              <button type="button" className={pillClass('quiet')} onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className={pillClass('primary')} disabled={busy}>{busy ? 'Saving' : 'Save'}</button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
