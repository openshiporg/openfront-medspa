import { TreatmentDetailPage } from '@/features/platform/catalog/screens/TreatmentDetailPage';

export const dynamic = 'force-dynamic'

export default async function TreatmentRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TreatmentDetailPage id={id} />;
}
