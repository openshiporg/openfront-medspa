import { AppointmentCheckoutWorkflowPage } from '@/features/platform/checkout/screens/AppointmentCheckoutWorkflowPage';

export default async function AppointmentCheckoutWorkflowRoute({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ checkout?: string }> }) {
  const { id } = await params;
  const query: { checkout?: string } = searchParams ? await searchParams : {};
  const checkoutNotice = query.checkout === 'completed' || query.checkout === 'failed' ? query.checkout : null;
  return <AppointmentCheckoutWorkflowPage appointmentId={id} checkoutNotice={checkoutNotice} />;
}
