import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PlatformBreadcrumbs } from './PlatformBreadcrumbs';
import { pillClass, trackClass, type PillVariant } from './pill';

export { pillClass, trackClass, fieldLabelClass, inputClass, textareaClass } from './pill';

/*
 * Med spa platform kit. Status dots sit on the title line, in-page buttons are
 * raised pills in a recessed track, and every list has explicit empty and
 * failure states.
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
  return <span aria-hidden="true" className={cn('inline-block size-2 shrink-0 rounded-full outline-3 -outline-offset-1', dotTones[tone], className)} />;
}

/** A status label for the title line: dot + text. */
export function TitleStatus({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-muted-foreground"><StatusDot tone={tone} />{children}</span>;
}

/** Recessed track that holds one or more raised pills. */
export function Track({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return <div role={label ? 'group' : undefined} aria-label={label} className={cn(trackClass, 'flex-wrap', className)}>{children}</div>;
}

export function PillLink({ href, children, variant = 'raised', size }: { href: string; children: ReactNode; variant?: PillVariant; size?: 'sm' | 'md' }) {
  return <Link href={href} className={pillClass(variant, size)}>{children}</Link>;
}

/** Filter tabs: the active tab is the raised pill; the rest sit quiet in the track. */
export function SegmentTabs({ label, tabs, active }: { label: string; active: string; tabs: Array<{ value: string; label: string; href: string; count?: number | null }> }) {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] md:mx-0 md:px-0 md:[mask-image:none]">
      <div className={cn(trackClass, 'w-max max-w-none pr-1')}>
        {tabs.map((tab) => {
          const isActive = tab.value === active;
          return (
            <Link key={tab.value} href={tab.href} aria-current={isActive ? 'page' : undefined} className={pillClass(isActive ? 'raised' : 'quiet')}>
              {tab.label}
              {tab.count !== undefined && tab.count !== null ? <span className={cn('tabular-nums', isActive ? 'text-muted-foreground' : 'opacity-70')}>{tab.count}</span> : null}
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
      <main className="min-w-0">
        <div className={cn('mx-auto flex w-full min-w-0 flex-col gap-6 px-4 py-6 md:px-6 md:py-8', width === 'wide' ? 'max-w-7xl' : 'max-w-4xl')}>{children}</div>
      </main>
    </>
  );
}

export function PageHeader({ title, status, meta, actions, icon: Icon, eyebrow }: { title: ReactNode; status?: ReactNode; meta?: ReactNode; actions?: ReactNode; icon?: ComponentType<{ className?: string }>; eyebrow?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2 text-xs font-medium text-muted-foreground">{eyebrow}</div> : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {Icon ? <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"><Icon className="size-[18px]" /></span> : null}
          <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight md:text-[1.75rem]">{title}</h1>
          {status}
        </div>
        {meta ? <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">{meta}</div> : null}
      </div>
      {actions ? <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function MetricStrip({ items }: { items: Array<{ label: string; value: ReactNode; tone?: Tone; href?: string }> }) {
  if (!items.length) return null;
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border bg-border sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] [&>*]:bg-background max-sm:[&>*:last-child:nth-child(odd)]:col-span-2" style={{ gap: 1 }}>
      {items.map((item, index) => {
        const body = <>
          <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{item.tone ? <StatusDot tone={item.tone} /> : null}<span className="truncate">{item.label}</span></dt>
          <dd className="mt-1.5 truncate text-xl font-semibold tabular-nums tracking-tight">{item.value}</dd>
        </>;
        return item.href
          ? <Link key={`${item.label}-${index}`} href={item.href} className="block min-w-0 p-4 transition-colors hover:bg-muted/40">{body}</Link>
          : <div key={`${item.label}-${index}`} className="min-w-0 p-4">{body}</div>;
      })}
    </dl>
  );
}

export function Panel({ title, icon: Icon, actions, children, className, padded = true, id }: { title?: ReactNode; icon?: ComponentType<{ className?: string }>; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean; id?: string }) {
  return (
    <section id={id} className={cn('min-w-0 overflow-hidden rounded-2xl border bg-background', className)}>
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 md:px-5">
          <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">{Icon ? <Icon className="size-4 text-muted-foreground" /> : null}{title}</h2>
          {actions}
        </div>
      ) : null}
      <div className={padded ? 'p-4 md:p-5' : undefined}>{children}</div>
    </section>
  );
}

export function Fact({ label, children, wrap = false }: { label: string; children: ReactNode; wrap?: boolean }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className={cn('mt-0.5 text-sm font-medium', wrap ? 'break-words' : 'truncate')}>{children}</dd></div>;
}

export function Chip({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return <span className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">{tone ? <StatusDot tone={tone} /> : null}<span className="truncate">{children}</span></span>;
}

export function EmptyState({ icon: Icon, title, action }: { icon: ComponentType<{ className?: string }>; title: string; action?: ReactNode }) {
  return (
    <section className="flex flex-col items-center rounded-2xl border border-dashed bg-background px-6 py-14 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted"><Icon className="size-5 text-muted-foreground" /></span>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}

export function ErrorState({ id, title, message, action }: { id: string; title: string; message?: string; action?: ReactNode }) {
  return (
    <section role="alert" aria-labelledby={id} className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100 md:p-6">
      <h2 id={id} className="flex items-center gap-2 text-base font-semibold"><StatusDot tone="amber" />{title}</h2>
      {message ? <p className="mt-1.5 max-w-2xl text-sm opacity-90">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}

export function Notice({ tone = 'amber', title, children, role = 'status' }: { tone?: Tone; title: ReactNode; children?: ReactNode; role?: 'status' | 'alert' }) {
  return (
    <div role={role} className="flex items-start gap-3 rounded-2xl border bg-background px-4 py-3 text-sm">
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
  return <span aria-hidden="true" className={cn('flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300', className)}>{initials(name)}</span>;
}
