'use client';

import { useState, useTransition } from 'react';
import { pillClass } from '@/features/platform/components/pill';
import { setPaymentProviderFlag } from '../actions/integrations';

export function ProviderToggle({ id, field, value, label }: { id: string; field: 'isInstalled' | 'isDefault'; value: boolean; label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" disabled={pending} className={pillClass(value ? 'quiet' : 'raised', 'sm')} onClick={() => start(async () => {
        const result = await setPaymentProviderFlag(id, field, !value);
        setError(result.success ? null : result.error);
      })}>{pending ? 'Saving' : label}</button>
      {error ? <span role="alert" className="text-xs text-rose-700 dark:text-rose-300">{error}</span> : null}
    </span>
  );
}
