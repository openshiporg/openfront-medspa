import { Boxes } from 'lucide-react';
import { PageHeader, PlatformPage, SegmentTabs } from '@/features/platform/components/medspa-ui';
import { PracticeSetupState } from '@/features/platform/components/PracticeSetupState';
import { hasPracticeSetup } from '@/features/platform/lib/practiceSetup';
import { statusFilter } from '@/features/platform/lib/queryParams';
import { INVENTORY_TABS, type InventoryTab } from '../types';
import { LotsTab, MovementsTab, ProductsTab, PurchaseOrdersTab, VendorsTab } from './InventoryTabs';

const BASE = '/dashboard/platform/inventory';
const TAB_LABELS: Record<InventoryTab, string> = { products: 'Products', lots: 'Lots', 'purchase-orders': 'Purchase orders', vendors: 'Vendors', movements: 'Movements' };

type SearchParams = { tab?: string; filter?: string; status?: string; source?: string; product?: string };

export async function InventoryPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const tab = statusFilter(params.tab, INVENTORY_TABS, 'products');
  const practiceReady = await hasPracticeSetup();

  return (
    <PlatformPage breadcrumbs={[{ label: 'Inventory' }]}>
      <PageHeader title="Inventory" icon={Boxes} />
      {practiceReady === false ? <PracticeSetupState /> : (
        <>
          <SegmentTabs label="Inventory sections" active={tab} tabs={INVENTORY_TABS.map((value) => ({ value, label: TAB_LABELS[value], href: value === 'products' ? BASE : `${BASE}?tab=${value}` }))} />
          {tab === 'products' ? <ProductsTab filter={statusFilter(params.filter, ['active', 'low', 'inactive', 'all'] as const, 'active')} /> : null}
          {tab === 'lots' ? <LotsTab status={statusFilter(params.status, ['available', 'quarantined', 'recalled', 'expired', 'depleted', 'all'] as const, 'available')} /> : null}
          {tab === 'purchase-orders' ? <PurchaseOrdersTab status={statusFilter(params.status, ['open', 'draft', 'submitted', 'partially_received', 'received', 'cancelled', 'all'] as const, 'open')} /> : null}
          {tab === 'vendors' ? <VendorsTab /> : null}
          {tab === 'movements' ? <MovementsTab source={statusFilter(params.source, ['all', 'product', 'lot'] as const, 'all')} productId={/^[\w-]{1,64}$/.test(params.product || '') ? params.product! : ''} /> : null}
        </>
      )}
    </PlatformPage>
  );
}
