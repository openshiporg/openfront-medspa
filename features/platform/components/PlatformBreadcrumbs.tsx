import { PageBreadcrumbs } from '@/features/dashboard/components/PageBreadcrumbs';
import { basePath } from '@/features/dashboard/lib/config';

type Crumb = { label: string; href?: string };

/** Adapt vertical absolute routes to the unchanged family header/menu contract. */
export function PlatformBreadcrumbs({ items }: { items: Crumb[] }) {
  return <PageBreadcrumbs items={items.map(item => ({
    type: item.href ? 'link' as const : 'page' as const,
    label: item.label,
    href: item.href?.startsWith(`${basePath}/`) ? item.href.slice(basePath.length) : item.href,
  }))} />;
}
