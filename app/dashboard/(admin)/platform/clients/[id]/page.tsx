import { ClientDetailPage } from '@/features/platform/clients/screens/ClientDetailPage';

export const dynamic = 'force-dynamic';

export default async function ClientDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientDetailPage clientId={id} />;
}
