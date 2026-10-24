'use client';

import { useActionState, useEffect, useState } from 'react';
import { FolderTree, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { fieldLabelClass, inputClass, pillClass, trackClass } from '@/features/platform/components/pill';
import { StatusDot } from '@/features/platform/components/medspa-ui';
import { deleteCategory, saveCategory } from '../actions/catalog';
import type { CatalogCategory, CatalogSaveState } from '../types';

const initialState: CatalogSaveState = { status: 'idle', message: '' };

function CategoryForm({ category, onDone }: { category?: CatalogCategory; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveCategory, initialState);
  useEffect(() => { if (state.status === 'saved') onDone(); }, [state, onDone]);
  return (
    <form action={action} className="grid gap-3 rounded-2xl border bg-muted/20 p-4">
      <input type="hidden" name="id" value={category?.id || ''} />
      <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
        <label className={fieldLabelClass}>Name<input className={inputClass} name="name" required maxLength={80} defaultValue={category?.name || ''} /></label>
        <label className={fieldLabelClass}>Order<input className={inputClass} name="displayOrder" type="number" step={1} defaultValue={category?.displayOrder ?? 0} /></label>
      </div>
      {category ? <label className={fieldLabelClass}>Slug<input className={inputClass} name="slug" maxLength={80} defaultValue={category.slug || ''} /></label> : null}
      <label className="flex min-h-9 items-center gap-2.5 text-sm font-medium"><input type="checkbox" name="isVisible" defaultChecked={category ? category.isVisible !== false : true} className="size-4" />Shown on the storefront</label>
      {state.status === 'error' ? <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{state.message}</p> : null}
      <div className={cn(trackClass, 'self-start')}>
        <button type="button" className={pillClass('quiet', 'sm')} onClick={onDone}>Cancel</button>
        <button type="submit" className={pillClass('primary', 'sm')} disabled={pending}>{pending ? 'Saving' : category ? 'Save' : 'Add category'}</button>
      </div>
    </form>
  );
}

/** Add, rename, reorder, hide and delete treatment categories. */
export function CategoryManagerSheet({ categories }: { categories: CatalogCategory[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(id: string) {
    setBusy(true); setError(null);
    const result = await deleteCategory({ id }).catch(() => ({ success: false, error: 'Not deleted' }));
    setBusy(false); setConfirming(null);
    if (!result.success) setError(result.error || 'Not deleted');
  }

  return (
    <>
      <button type="button" className={pillClass()} onClick={() => setOpen(true)}><FolderTree />Categories</button>
      <Sheet open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setEditing(null); setConfirming(null); } }}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>Categories</SheetTitle>
            <SheetDescription className="sr-only">Treatment categories</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 px-5 py-5">
            {editing === 'new' ? <CategoryForm onDone={() => setEditing(null)} /> : (
              <div className={cn(trackClass, 'self-start')}><button type="button" className={pillClass('primary', 'sm')} onClick={() => setEditing('new')}>Add category</button></div>
            )}
            {error ? <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}
            {categories.length ? (
              <ul className="divide-y rounded-2xl border">
                {categories.map((category) => (
                  <li key={category.id} className="grid gap-3 p-3">
                    {editing === category.id ? <CategoryForm category={category} onDone={() => setEditing(null)} /> : (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{category.name}</span>
                            <StatusDot tone={category.isVisible === false ? 'zinc' : 'emerald'} />
                          </div>
                          <p className="text-xs tabular-nums text-muted-foreground">#{category.displayOrder ?? 0} · {category.servicesCount} {category.servicesCount === 1 ? 'treatment' : 'treatments'}{category.isVisible === false ? ' · Hidden' : ''}</p>
                        </div>
                        {confirming === category.id ? (
                          <div className={trackClass}>
                            <button type="button" className={pillClass('quiet', 'sm')} onClick={() => setConfirming(null)}>Keep</button>
                            <button type="button" className={pillClass('danger', 'sm')} disabled={busy} onClick={() => remove(category.id)}>{category.servicesCount ? `Delete; uncategorize ${category.servicesCount}` : 'Delete'}</button>
                          </div>
                        ) : (
                          <div className={trackClass}>
                            <button type="button" className={pillClass('raised', 'sm')} onClick={() => setEditing(category.id)}>Edit</button>
                            <button type="button" aria-label={`Delete ${category.name}`} className={pillClass('quiet', 'sm')} onClick={() => setConfirming(category.id)}><Trash2 /></button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No categories yet</p>}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
