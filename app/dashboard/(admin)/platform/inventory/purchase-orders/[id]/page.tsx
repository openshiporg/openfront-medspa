import { PurchaseOrderDetailPage } from '@/features/platform/inventory/screens/PurchaseOrderDetailPage';

export const dynamic = 'force-dynamic';

export default async function PurchaseOrderRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PurchaseOrderDetailPage id={id} />;
}
