import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PlatformBreadcrumbs } from './PlatformBreadcrumbs';
import { pillClass, trackClass, type PillVariant } from './pill';

export { pillClass, trackClass, fieldLabelClass, inputClass, textareaClass } from './pill';

/*
 * Med spa platform kit. Status reads as a coloured dot and label in its own column or on
 * the title line, filters are underline tabs, buttons are flat 5px blocks, surfaces are
 * bordered with corners of 6px or less, and every list has explicit empty and failure states.
 */

export type Tone = 'emerald' | 'amber' | 'blue' | 'violet' | 'rose' | 'zinc' | 'sky' | 'orange';

const dotTones: Record<Tone, string> = {
  emerald: 'bg-emerald-500 outline-emerald-100 dark:bg-emerald-400 dark:outline-emerald-900/50',
  amber: 'bg-amber-500 outline-amber-100 dark:bg-amber-400 dark:outline-amber-900/50',
  blue: 'bg-blue-500 outline-blue-100 dark:bg-blue-400 dark:outline-blue-900/50',
  violet: 'bg-violet-500 outline-violet-100 dark:bg-violet-400 dark:outline-violet-900/50',
  rose: 'bg-rose-500 outline-rose-100 dark:bg-rose-400 dark:outline-rose-900/50',
  zinc: 'bg-zinc-400 outline-zinc-100 dark:bg-zinc-500 dark:outline-zinc-800/60',
  sky: 'bg-sky-500 outline-sky-100 dark:bg-sky-400 dark:outline-sky-900/50',
  orange: 'bg-orange-500 outline-orange-100 dark:bg-orange-400 dark:outline-orange-900/50',
};

const textTones: Record<Tone, string> = {
  emerald: 'text-emerald-700 dark:text-emerald-400', amber: 'text-amber-700 dark:text-amber-400', blue: 'text-blue-700 dark:text-blue-400', violet: 'text-violet-700 dark:text-violet-400',
  rose: 'text-rose-700 dark:text-rose-400', zinc: 'text-muted-foreground', sky: 'text-sky-700 dark:text-sky-400', orange: 'text-orange-700 dark:text-orange-400',
};

export const appointmentTone: Record<string, Tone> = {
  pending: 'amber', confirmed: 'emerald', in_progress: 'blue', completed: 'zinc', cancelled: 'rose', no_show: 'orange',
};
export const appointmentLabel: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', in_progress: 'Checked in', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show',
};

/** Tone for generic workflow statuses (records, payments, consultations). */
export function statusTone(status?: string | null): Tone {
  const value = (status || '').toLowerCase();
  if (appointmentTone[value]) return appointmentTone[value];
  if (/^(active|available|ready|verified|paid|signed|approved|installed|in_service|notified|candidate|eligible)/.test(value)) return 'emerald';
  if (/(pending|due|draft|unverified|submitted|paused|acceptance|maintenance|waiting|review)/.test(value)) return 'amber';
  if (/(cancel|revoked|recall|quarantin|destroyed|failed|incident|suspended|not_candidate|lockout|refunded)/.test(value)) return 'rose';
  if (/(progress|processing|partially)/.test(value)) return 'blue';
  return 'zinc';
}

export function humanize(value?: string | null) {
  return value ? value.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase()) : 'Not recorded';
}

export function StatusDot({ tone, className }: { tone: Tone; className?: string }) {
  return <span aria-hidden="true" className={cn('inline-block size-1.5 shrink-0 rounded-full', dotTones[tone], className)} />;
}

/** A status label for the title line: dot + text. */
export function TitleStatus({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium', textTones[tone])}><StatusDot tone={tone} />{children}</span>;
}

/** A row of buttons. */
export function Track({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return <div role={label ? 'group' : undefined} aria-label={label} className={cn(trackClass, className)}>{children}</div>;
}

export function PillLink({ href, children, variant = 'raised', size }: { href: string; children: ReactNode; variant?: PillVariant; size?: 'sm' | 'md' }) {
  return <Link href={href} className={pillClass(variant, size)}>{children}</Link>;
}

/** Filter tabs: underline tabs on one ruled baseline; the current tab is underlined. */
export function SegmentTabs({ label, tabs, active }: { label: string; active: string; tabs: Array<{ value: string; label: string; href: string; count?: number | null }> }) {
  return (
    <nav aria-label={label} className="min-w-0 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-5">
        {tabs.map((tab) => {
          const isActive = tab.value === active;
          return (
            <Link key={tab.value} href={tab.href} aria-current={isActive ? 'page' : undefined} className="-mb-px inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent pb-2 pt-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:text-foreground max-sm:min-h-10">
              {tab.label}
              {tab.count !== undefined && tab.count !== null ? <span className="text-xs font-normal tabular-nums text-muted-foreground">{tab.count}</span> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PlatformPage({ breadcrumbs, children, width = 'wide' }: { breadcrumbs: Array<{ label: string; href?: string }>; children: ReactNode; width?: 'wide' | 'narrow' }) {
  return (
    <>
      <PlatformBreadcrumbs items={breadcrumbs} />
      <div className="min-w-0">
        <div className={cn('mx-auto flex w-full min-w-0 flex-col gap-5 px-4 py-5 md:px-6 md:py-6', width === 'wide' ? 'max-w-7xl' : 'max-w-4xl')}>{children}</div>
      </div>
    </>
  );
}

export function PageHeader({ title, status, meta, actions, icon: Icon, eyebrow }: { title: ReactNode; status?: ReactNode; meta?: ReactNode; actions?: ReactNode; icon?: ComponentType<{ className?: string }>; eyebrow?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="min-w-0 break-words text-lg font-semibold tracking-tight">{title}</h1>
          {status}
        </div>
        {meta ? <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">{eyebrow ? <span>{eyebrow}</span> : null}{meta}</div> : eyebrow ? <div className="mt-1 text-xs text-muted-foreground">{eyebrow}</div> : null}
      </div>
      {actions ? <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function MetricStrip({ items }: { items: Array<{ label: string; value: ReactNode; tone?: Tone; href?: string }> }) {
  if (!items.length) return null;
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-[6px] border bg-border sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] [&>*]:bg-background max-sm:[&>*:last-child:nth-child(odd)]:col-span-2" style={{ gap: 1 }}>
      {items.map((item, index) => {
        const body = <>
          <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{item.tone ? <StatusDot tone={item.tone} /> : null}<span className="truncate">{item.label}</span></dt>
          <dd className="mt-0.5 truncate text-lg font-semibold tabular-nums tracking-tight">{item.value}</dd>
        </>;
        return item.href
          ? <Link key={`${item.label}-${index}`} href={item.href} className="block min-w-0 px-3 py-2 transition-colors hover:bg-muted/40">{body}</Link>
          : <div key={`${item.label}-${index}`} className="min-w-0 px-3 py-2">{body}</div>;
      })}
    </dl>
  );
}

export function Panel({ title, icon: Icon, actions, children, className, padded = true, id }: { title?: ReactNode; icon?: ComponentType<{ className?: string }>; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean; id?: string }) {
  return (
    <section id={id} className={cn('min-w-0 overflow-hidden rounded-[6px] border bg-card', className)}>
      {title ? (
        <div className="flex min-h-10 flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
          <h2 className="flex min-w-0 items-center gap-2 text-[13px] font-semibold">{Icon ? <Icon className="size-4 text-muted-foreground" /> : null}{title}</h2>
          {actions}
        </div>
      ) : null}
      <div className={padded ? 'p-4' : undefined}>{children}</div>
    </section>
  );
}

export function Fact({ label, children, wrap = false }: { label: string; children: ReactNode; wrap?: boolean }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className={cn('mt-0.5 text-sm font-medium', wrap ? 'break-words' : 'truncate')}>{children}</dd></div>;
}

export function Chip({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return <span className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-[3px] border bg-background px-1.5 py-0.5 text-xs font-medium text-muted-foreground">{tone ? <StatusDot tone={tone} /> : null}<span className="truncate">{children}</span></span>;
}

export function EmptyState({ icon: Icon, title, action }: { icon: ComponentType<{ className?: string }>; title: string; action?: ReactNode }) {
  return (
    <section className="flex flex-col items-center rounded-[6px] border border-dashed bg-card px-6 py-10 text-center">
      <Icon className="size-5 text-muted-foreground" />
      <h2 className="mt-3 text-[13px] font-medium">{title}</h2>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}

export function ErrorState({ id, title, message, action }: { id: string; title: string; message?: string; action?: ReactNode }) {
  return (
    <section role="alert" aria-labelledby={id} className="rounded-[6px] border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <h2 id={id} className="flex items-center gap-2 text-[13px] font-semibold"><StatusDot tone="amber" />{title}</h2>
      {message ? <p className="mt-1.5 max-w-2xl text-sm opacity-90">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}

export function Notice({ tone = 'amber', title, children, role = 'status' }: { tone?: Tone; title: ReactNode; children?: ReactNode; role?: 'status' | 'alert' }) {
  return (
    <div role={role} className="flex items-start gap-3 rounded-[6px] border bg-card px-3 py-2.5 text-[13px]">
      <StatusDot tone={tone} className="mt-1.5" />
      <div className="min-w-0"><div className="font-medium">{title}</div>{children ? <div className="mt-0.5 text-muted-foreground">{children}</div> : null}</div>
    </div>
  );
}

export function usd(cents?: number | null, options: { whole?: boolean } = {}) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: options.whole ? 0 : 2 }).format((cents || 0) / 100);
}

export function initials(name?: string | null) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  return (parts.length ? parts.slice(0, 2).map((part) => part[0]) : ['·']).join('').toUpperCase();
}

export function Avatar({ name, className }: { name?: string | null; className?: string }) {
  return <span aria-hidden="true" className={cn('flex size-8 shrink-0 items-center justify-center rounded-[5px] bg-violet-50 text-xs font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300', className)}>{initials(name)}</span>;
}
