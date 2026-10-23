import { cn } from '@/lib/utils';

/** Recessed track: the groove that every in-page button group and filter set sits in. */
export const trackClass = 'inline-flex max-w-full items-center gap-1 rounded-full bg-muted p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.08)] dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.45)]';

export type PillVariant = 'raised' | 'primary' | 'danger' | 'quiet';

/** Raised pill. `quiet` is an inactive slot inside a track. */
export function pillClass(variant: PillVariant = 'raised', size: 'sm' | 'md' = 'md') {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0',
    size === 'sm' ? 'h-7 px-3 text-xs' : 'h-8 px-3.5 text-sm',
    variant === 'quiet'
      ? 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
      : 'bg-background shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_rgb(0_0_0/0.04)] hover:shadow-[0_1px_3px_rgb(0_0_0/0.12),0_0_0_1px_rgb(0_0_0/0.06)] dark:bg-zinc-800 dark:shadow-[0_1px_2px_rgb(0_0_0/0.5),0_0_0_1px_rgb(255_255_255/0.06)]',
    variant === 'raised' && 'text-foreground',
    variant === 'primary' && 'font-semibold text-violet-700 dark:text-violet-300',
    variant === 'danger' && 'text-rose-700 dark:text-rose-300',
  );
}

export const fieldLabelClass = 'grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground';
export const inputClass = 'h-10 w-full min-w-0 rounded-xl border bg-background px-3 text-sm text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';
export const textareaClass = 'min-h-24 w-full min-w-0 rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring';
