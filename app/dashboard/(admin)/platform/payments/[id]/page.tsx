import { PaymentDetailPage } from '@/features/platform/payments/screens/PaymentDetailPage';

export const dynamic = 'force-dynamic';

export default async function PaymentDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaymentDetailPage paymentId={id} />;
}
