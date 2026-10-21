import { pageIndex } from '@/features/platform/lib/queryParams';
import { ConsultationPlanQueuePage } from '@/features/platform/appointments/screens/PlanJourneyPage';

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const params = await searchParams;
  return <ConsultationPlanQueuePage page={pageIndex(params.page)} search={params.search || ''} />;
}
