import { CalendarPlus } from 'lucide-react';
import { ErrorState, PageHeader, PillLink, PlatformPage, Track } from '@/features/platform/components/medspa-ui';
import { PracticeSetupState } from '@/features/platform/components/PracticeSetupState';
import { hasPracticeSetup } from '@/features/platform/lib/practiceSetup';
import { getFrontDeskOptions } from '../actions/frontDesk';
import { FrontDeskBookingForm } from './FrontDeskBookingForm';

export async function FrontDeskBookingPage() {
  const options = await getFrontDeskOptions();
  const breadcrumbs = [{ label: 'Appointments', href: '/dashboard/platform/appointments' }, { label: 'Book' }];
  const practiceReady = options.status === 'loaded' && options.locations.length ? true : await hasPracticeSetup();

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader title="Book appointment" icon={CalendarPlus} />
      {practiceReady === false ? <PracticeSetupState />
        : options.status === 'unavailable' ? <ErrorState id="front-desk-unavailable" title="Booking unavailable" message="Treatments and locations could not be loaded." action={<Track><PillLink href="/dashboard/platform/appointments/new">Retry</PillLink></Track>} />
        : !options.services.length ? <ErrorState id="front-desk-no-services" title="No active treatments" message="Activate a treatment before booking." action={<Track><PillLink href="/dashboard/platform/catalog">Services & catalog</PillLink></Track>} />
        : !options.locations.length ? <ErrorState id="front-desk-no-locations" title="No active location" message="Activate a location before booking." action={<Track><PillLink href="/dashboard/platform/administration">Staff & locations</PillLink></Track>} />
        : <FrontDeskBookingForm services={options.services} locations={options.locations} clients={options.clients} />}
    </PlatformPage>
  );
}
