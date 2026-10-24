'use client';

import { RotateCcw } from 'lucide-react';
import { fieldLabelClass, inputClass } from '@/features/platform/components/pill';
import { FormSheet, formCents } from '@/features/platform/benefits/components/FormSheet';
import { refundPaymentAction } from '../actions/payments';

export function RefundSheet({ paymentId, paymentSessionId, route, refundable }: { paymentId: string; paymentSessionId: string; route: 'deposit' | 'settlement'; refundable: number }) {
  return (
    <FormSheet
      trigger={<><RotateCcw />Refund</>}
      triggerVariant="danger"
      title="Refund payment"
      submitLabel="Refund"
      onSubmit={(form, idempotencyKey) => {
        const amount = formCents(form, 'amount');
        if (!Number.isInteger(amount) || amount <= 0 || amount > refundable) return Promise.resolve({ success: false, error: `Enter an amount up to $${(refundable / 100).toFixed(2)}` });
        return refundPaymentAction({ paymentId, paymentSessionId, route, amount, reason: String(form.get('reason') || ''), idempotencyKey });
      }}
    >
      <label className={fieldLabelClass}>Amount ($)<input name="amount" type="number" min="0.01" max={(refundable / 100).toFixed(2)} step="0.01" required defaultValue={(refundable / 100).toFixed(2)} className={inputClass} /></label>
      <label className={fieldLabelClass}>Reason<input name="reason" required maxLength={1000} className={inputClass} /></label>
    </FormSheet>
  );
}
