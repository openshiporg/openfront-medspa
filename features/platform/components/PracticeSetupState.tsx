'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import OnboardingDialog from '@/features/platform/onboarding/components/OnboardingDialog';
import { pillClass } from './pill';
import { Track } from './medspa-ui';

/** Shown instead of "unavailable" when the install has no practice yet. */
export function PracticeSetupState() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <section role="status" className="flex flex-col items-center rounded-2xl border border-dashed bg-background px-6 py-14 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted"><Building2 className="size-5 text-muted-foreground" /></span>
      <h2 className="mt-4 text-base font-semibold">Practice not set up</h2>
      <div className="mt-5">
        <Track><button type="button" className={pillClass('primary')} onClick={() => setOpen(true)}>Start practice setup</button></Track>
      </div>
      <OnboardingDialog isOpen={open} onClose={() => { setOpen(false); router.refresh(); }} />
    </section>
  );
}
