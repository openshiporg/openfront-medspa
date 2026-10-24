import { Store } from 'lucide-react'
import { hasPracticeSetup } from '@/features/platform/lib/practiceSetup'
import { getPracticeTaxRate } from '../actions/practiceTax'
import { PracticeTaxForm } from '../components/PracticeTaxForm'
import { PracticeSetupState } from '@/features/platform/components/PracticeSetupState'
import { getStorefrontSettings } from '../actions/storefrontSettings'
import { StorefrontSettingsForm } from '../components/StorefrontSettingsForm'
import { ErrorState, PageHeader, PillLink, PlatformPage, TitleStatus, Track } from '@/features/platform/components/medspa-ui'

interface Props { searchParams?: Promise<{ saved?: string }> }

export async function StorefrontSettingsPage(_props: Props) {
  const [result, tax] = await Promise.all([getStorefrontSettings(), getPracticeTaxRate()])
  const published = result.status === 'loaded' && result.setting?.isPublished
  const needsSetup = (result.status === 'unavailable' || (!result.setting && result.locations.length === 0)) && await hasPracticeSetup() === false
  return (
    <PlatformPage width="narrow" breadcrumbs={[{ label: 'Storefront settings' }]}>
      <PageHeader
        title="Storefront"
        icon={Store}
        status={result.status === 'loaded' ? <TitleStatus tone={published ? 'emerald' : 'zinc'}>{published ? 'Published' : 'Not published'}</TitleStatus> : null}
        actions={published ? <Track><PillLink href="/">View storefront</PillLink></Track> : null}
      />
      {needsSetup ? <PracticeSetupState /> : result.status === 'unavailable'
        ? <ErrorState id="storefront-settings-unavailable" title="Settings unavailable" message={result.message} action={<Track><PillLink href="/dashboard/platform/storefront">Retry</PillLink></Track>} />
        : <StorefrontSettingsForm setting={result.setting} locations={result.locations} />}
      {!needsSetup && tax ? <PracticeTaxForm practiceId={tax.practiceId} taxRate={tax.taxRate} /> : null}
    </PlatformPage>
  )
}
