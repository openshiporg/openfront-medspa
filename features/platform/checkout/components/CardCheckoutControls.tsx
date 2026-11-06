'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import { pillClass, trackClass } from '@/features/platform/components/pill';
import { confirmCardCheckoutAction, startCardCheckoutAction, type CardCheckoutState } from '../actions/cardCheckout';

const initial: CardCheckoutState = { url: null, amount: null, error: null };

function money(cents: number | null) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100);
}

/**
 * "Charge card" submits the same checkout form to a Stripe Checkout for the computed total. The desk keys the
 * card in on Stripe's page (Open card entry) or sends the link to the client; the sale is written when Stripe reports it paid.
 */
export function ChargeCardButton({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(startCardCheckoutAction, initial);
  const [copied, setCopied] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);
  useEffect(() => setCopied(false), [state.url]);

  return (
    <>
      <button type="submit" formAction={action} disabled={disabled || pending} className={pillClass('raised')}>
        <CreditCard className="size-4" aria-hidden="true" />
        {pending ? 'Opening card payment' : 'Charge card'}
      </button>
      {state.error ? <p role="alert" className="basis-full text-xs text-red-700 dark:text-red-300">{state.error}</p> : null}
      {state.url ? (
        <div role="status" className="grid basis-full gap-2 rounded-[6px] border bg-background p-3 text-sm">
          <p className="font-medium">Card payment for {money(state.amount)} is ready</p>
          <p className="text-xs text-muted-foreground">Key the card in on Stripe, or send the link to the client. The visit checks out when the payment goes through.</p>
          <input ref={linkRef} readOnly value={state.url} aria-label="Payment link" className="h-9 w-full min-w-0 rounded-[5px] border bg-muted/30 px-2 text-xs" onFocus={(event) => event.currentTarget.select()} />
          <div className={`${trackClass} w-fit flex-wrap`}>
            <a href={state.url} className={pillClass('primary', 'sm')}>Open card entry</a>
            <button type="button" className={pillClass('quiet', 'sm')} onClick={async () => { await navigator.clipboard?.writeText(state.url!).catch(() => undefined); setCopied(true); }}>{copied ? 'Link copied' : 'Copy payment link'}</button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** On return from Stripe (and on demand), settle the card payment and refresh the page. */
export function CardPaymentStatus({ appointmentId, auto }: { appointmentId: string; auto: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<{ busy: boolean; message: string | null; tone: 'ok' | 'warn' }>({ busy: false, message: null, tone: 'ok' });
  const ran = useRef(false);

  async function check() {
    setState({ busy: true, message: null, tone: 'ok' });
    const result = await confirmCardCheckoutAction(appointmentId);
    if (result.outcome === 'completed') { setState({ busy: false, message: 'Card payment received. The visit is checked out.', tone: 'ok' }); router.replace(`/dashboard/platform/checkout/${encodeURIComponent(appointmentId)}?checkout=completed`); router.refresh(); return; }
    if (result.outcome === 'refund_queued') { setState({ busy: false, message: `The card was charged but checkout could not finish${result.error ? ` (${result.error})` : ''}. The charge is being refunded.`, tone: 'warn' }); router.refresh(); return; }
    if (result.outcome === 'review') { setState({ busy: false, message: 'Stripe reported an amount that does not match. Review it under Payments.', tone: 'warn' }); return; }
    if (result.outcome === 'expired') { setState({ busy: false, message: 'The card payment link expired. Charge the card again.', tone: 'warn' }); return; }
    setState({ busy: false, message: result.error || 'No card payment has gone through yet.', tone: 'warn' });
  }

  useEffect(() => { if (auto && !ran.current) { ran.current = true; void check(); } });

  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-[6px] border bg-card px-3 py-2.5 text-[13px]">
      <span className="min-w-0 flex-1">{state.busy ? 'Checking the card payment with Stripe…' : state.message || 'Card payment waiting for the client.'}</span>
      <button type="button" onClick={check} disabled={state.busy} className={pillClass('quiet', 'sm')}>Check card payment</button>
    </div>
  );
}
