'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { cn } from '@/lib/utils';
import { pillClass, trackClass } from '@/features/platform/components/pill';
import { StatusDot } from '@/features/platform/components/medspa-ui';
import { acceptInvitation } from '../actions/invitation';
import { control, field } from '../components/WorkflowSheet';

/** Public page that turns a staff invitation link into a dashboard account. */
export function AcceptInvitationPage({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    if (password !== String(form.get('confirm') || '')) { setError('Passwords don’t match'); return; }
    setBusy(true); setError(null);
    try {
      const result = await acceptInvitation({ token, name: String(form.get('name') || '').trim(), password });
      if (result.success) setDone(true);
      else setError(result.error || 'Invitation is invalid or expired');
    } catch {
      setError('Not confirmed. Try signing in before retrying.');
    } finally { setBusy(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <section className="w-full max-w-sm rounded-2xl border bg-background p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">{done ? 'Account created' : 'Join the practice'}</h1>
        {done ? (
          <div className={cn(trackClass, 'mt-5')}><Link href="/dashboard/signin" className={pillClass('primary')}>Sign in</Link></div>
        ) : !token ? (
          <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-rose-700 dark:text-rose-300"><StatusDot tone="rose" />Invitation link is incomplete</p>
        ) : (
          <form onSubmit={submit} className="mt-5 grid gap-4">
            <fieldset disabled={busy} className="grid gap-4">
              <label className={field}>Full name<input className={control} name="name" required maxLength={120} autoComplete="name" /></label>
              <label className={field}>Password<input className={control} name="password" type="password" required minLength={12} maxLength={200} autoComplete="new-password" /></label>
              <label className={field}>Confirm password<input className={control} name="confirm" type="password" required minLength={12} maxLength={200} autoComplete="new-password" /></label>
            </fieldset>
            {error ? <p role="alert" className="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-300"><StatusDot tone="rose" />{error}</p> : null}
            <div className={cn(trackClass, 'self-start')}><button type="submit" className={pillClass('primary')}>{busy ? 'Creating account' : 'Create account'}</button></div>
          </form>
        )}
      </section>
    </main>
  );
}
