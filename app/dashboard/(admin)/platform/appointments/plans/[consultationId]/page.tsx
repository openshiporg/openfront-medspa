import { pageIndex } from '@/features/platform/lib/queryParams';
import { PlanJourneyPage } from '@/features/platform/appointments/screens/PlanJourneyPage';

export default async function Page({ params, searchParams }: { params: Promise<{ consultationId: string }>; searchParams: Promise<{ planPage?: string; appointmentPage?: string; historyPage?: string }> }) {
  const { consultationId } = await params;
  const pages = await searchParams;
  return <PlanJourneyPage consultationId={consultationId} pages={{ planPage: pageIndex(pages.planPage), appointmentPage: pageIndex(pages.appointmentPage), historyPage: pageIndex(pages.historyPage) }} />;
}
