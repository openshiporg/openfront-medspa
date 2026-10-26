import { cn } from '@/lib/utils';

/** A row of buttons: in-page button groups and filter sets sit on the page, no groove behind them. */
export const trackClass = 'inline-flex max-w-full flex-wrap items-center gap-2';

export type PillVariant = 'raised' | 'primary' | 'danger' | 'quiet';

/** A flat 5px button. `raised` is the outline secondary, `primary` the one solid action, `quiet` a ghost. */
export function pillClass(variant: PillVariant = 'raised', size: 'sm' | 'md' = 'md') {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[5px] border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0',
    size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px] max-sm:h-10',
    variant === 'quiet' && 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
    variant === 'raised' && 'border-border bg-background text-foreground shadow-xs hover:bg-muted',
    variant === 'primary' && 'border-violet-700 bg-violet-700 text-white hover:bg-violet-800 dark:border-violet-500 dark:bg-violet-600 dark:hover:bg-violet-500',
    variant === 'danger' && 'border-border bg-background text-rose-700 shadow-xs hover:border-rose-300 hover:bg-rose-50 dark:text-rose-400 dark:hover:border-rose-900 dark:hover:bg-rose-950/40',
  );
}

export const fieldLabelClass = 'grid min-w-0 gap-1 text-xs font-medium text-muted-foreground';
export const inputClass = 'h-9 w-full min-w-0 rounded-[5px] border border-input bg-background px-2.5 text-[13px] text-foreground shadow-xs outline-none transition-shadow focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60 max-sm:h-10 max-sm:text-base';
export const textareaClass = 'min-h-24 w-full min-w-0 rounded-[5px] border border-input bg-background px-2.5 py-2 text-[13px] text-foreground shadow-xs outline-none transition-shadow focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 max-sm:text-base';
