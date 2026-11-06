import { AppointmentCheckoutWorkflowPage } from '@/features/platform/checkout/screens/AppointmentCheckoutWorkflowPage';

export default async function AppointmentCheckoutWorkflowRoute({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ checkout?: string; card?: string }> }) {
  const { id } = await params;
  const query: { checkout?: string; card?: string } = searchParams ? await searchParams : {};
  const checkoutNotice = query.checkout === 'completed' || query.checkout === 'failed' ? query.checkout : null;
  const cardNotice = query.card === 'return' || query.card === 'cancelled' ? query.card : null;
  return <AppointmentCheckoutWorkflowPage appointmentId={id} checkoutNotice={checkoutNotice} cardNotice={cardNotice} />;
}
