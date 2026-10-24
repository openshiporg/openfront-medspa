import { ClipboardList, PackageCheck } from 'lucide-react';
import { EmptyState, ErrorState, Fact, MetricStrip, PageHeader, Panel, PillLink, PlatformPage, TitleStatus, Track, usd } from '@/features/platform/components/medspa-ui';
import { getPurchaseOrder } from '../actions/inventory';
import { PurchaseOrderActions } from '../components/PurchaseOrderActions';
import { ReceiveForm } from '../components/ReceiveForm';
import { date, poLabel, poTone } from './InventoryTabs';

const LIST = '/dashboard/platform/inventory?tab=purchase-orders';

export async function PurchaseOrderDetailPage({ id }: { id: string }) {
  const result = await getPurchaseOrder(id);
  const order = result.status === 'loaded' ? result.data : null;
  const breadcrumbs = [{ label: 'Inventory', href: '/dashboard/platform/inventory' }, { label: 'Purchase orders', href: LIST }, { label: order?.number || 'Order' }];

  if (result.status === 'unavailable' || !order) {
    return (
      <PlatformPage breadcrumbs={breadcrumbs} width="narrow">
        <ErrorState id="po-unavailable" title={result.status === 'unavailable' ? 'Purchase order unavailable' : 'Purchase order not found'} action={<Track><PillLink href={LIST}>Purchase orders</PillLink></Track>} />
      </PlatformPage>
    );
  }

  const ordered = order.lines.reduce((sum, line) => sum + line.orderedQuantity, 0);
  const received = order.lines.reduce((sum, line) => sum + Number(line.receivedQuantity || 0), 0);
  const receivable = ['submitted', 'partially_received'].includes(order.status);

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader
        title={order.number}
        icon={ClipboardList}
        status={<TitleStatus tone={poTone[order.status] || 'zinc'}>{poLabel[order.status] || order.status}</TitleStatus>}
        meta={<><span>{order.vendor?.name || 'No vendor'}</span><span>{order.location?.name || 'No location'}</span></>}
        actions={<PurchaseOrderActions id={order.id} status={order.status} revision={order.revision || 1} hasReceipts={order.receipts.length > 0} />}
      />
      <MetricStrip items={[
        { label: 'Total', value: usd(order.totalMinor) },
        { label: 'Units received', value: `${received} / ${ordered}`, tone: received >= ordered && ordered > 0 ? 'emerald' : received ? 'amber' : undefined },
        { label: 'Submitted', value: date(order.orderedAt) },
        { label: 'Expected', value: date(order.expectedAt) },
      ]} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <Panel title="Lines" padded={false}>
            <ul className="divide-y">
              {order.lines.map((line) => {
                const got = Number(line.receivedQuantity || 0);
                return (
                  <li key={line.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{line.productTitle}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{usd(line.unitCostMinor)} each{line.product?.trackLots ? ' · lot tracked' : ''}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm tabular-nums">
                      <span className={got >= line.orderedQuantity ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}>{got} / {line.orderedQuantity} received</span>
                      <span className="font-semibold">{usd(line.unitCostMinor * line.orderedQuantity)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
          {receivable ? <Panel title="Receive" icon={PackageCheck}><ReceiveForm purchaseOrderId={order.id} lines={order.lines} /></Panel> : null}
        </div>

        <Panel title="Receipts" padded={!order.receipts.length}>
          {!order.receipts.length ? <EmptyState icon={PackageCheck} title="Nothing received yet" /> : (
            <ul className="divide-y">
              {order.receipts.map((receipt) => (
                <li key={receipt.id} className="grid gap-2 px-4 py-3 md:px-5">
                  <dl className="grid grid-cols-2 gap-3">
                    <Fact label="Receipt">{receipt.receiptNumber}</Fact>
                    <Fact label="Received">{date(receipt.receivedAt, true)}{receipt.receivedBy ? ` · ${receipt.receivedBy.name}` : ''}</Fact>
                  </dl>
                  <ul className="grid gap-1 text-xs text-muted-foreground">
                    {receipt.lines.map((line) => (
                      <li key={line.id} className="flex flex-wrap gap-x-2">
                        <span className="font-medium text-foreground">{line.product?.name || 'Product'}</span>
                        <span className="tabular-nums">× {line.quantity}</span>
                        {line.lotNumberSnapshot ? <span>lot {line.lotNumberSnapshot}</span> : null}
                        {line.quarantineReason ? <span className="text-amber-700 dark:text-amber-300">quarantined · {line.quarantineReason}</span> : null}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </PlatformPage>
  );
}
