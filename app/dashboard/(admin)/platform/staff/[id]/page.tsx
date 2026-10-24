import { StaffDetailPage } from '@/features/platform/staff/screens/StaffDetailPage';

export const dynamic = 'force-dynamic';

export default async function StaffDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StaffDetailPage providerId={id} />;
}
