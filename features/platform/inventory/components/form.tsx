'use client';

import type { ReactNode } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { StatusDot } from '@/features/platform/components/medspa-ui';
import { fieldLabelClass, inputClass, textareaClass } from '@/features/platform/components/pill';

export { fieldLabelClass, inputClass, textareaClass };

/** Dollars typed by staff → integer cents; null when not a valid amount. */
export function toCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}

export function fromCents(value?: number | null): string {
  if (value === null || value === undefined) return '';
  return (value / 100).toFixed(2).replace(/\.00$/, '');
}

export function newKey(prefix: string) {
  return `${prefix}:${crypto.randomUUID()}`;
}

export function Drawer({ open, onOpenChange, title, children, footer }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">{title}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        <div className="border-t px-5 py-4">{footer}</div>
      </SheetContent>
    </Sheet>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="mb-3 flex items-center gap-2 text-sm text-rose-700 dark:text-rose-300"><StatusDot tone="rose" />{message}</p>;
}

export function Field({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return <label className={cn(fieldLabelClass, className)}>{label}{children}</label>;
}
