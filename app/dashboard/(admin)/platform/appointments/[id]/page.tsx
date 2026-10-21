import { AppointmentWorkflowPage } from '@/features/platform/appointments/screens/AppointmentWorkflowPage';

export default async function AppointmentWorkflowRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppointmentWorkflowPage appointmentId={id} />;
}
