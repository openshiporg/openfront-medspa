import { TreatmentWorkspacePage } from '@/features/platform/treatment/screens/TreatmentWorkspacePage';

export const dynamic = 'force-dynamic';

export default async function TreatmentRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TreatmentWorkspacePage appointmentId={id} />;
}
