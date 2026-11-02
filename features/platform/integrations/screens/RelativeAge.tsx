'use client';

import { useIsMounted } from '@/features/dashboard/lib/useViewerTime';

/** "N min ago" depends on now, so it renders only after mount (server and hydration output match). */
export function RelativeAge({ value }: { value: string | null }) {
  const mounted = useIsMounted();
  if (!value) return <>—</>;
  if (!mounted) return null;
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return <span suppressHydrationWarning>{minutes} min ago</span>;
  const hours = Math.round(minutes / 60);
  return <span suppressHydrationWarning>{hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`}</span>;
}
