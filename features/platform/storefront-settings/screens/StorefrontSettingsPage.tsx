import { getStorefrontSettings } from '../actions/storefrontSettings'
import { StorefrontSettingsForm } from '../components/StorefrontSettingsForm'
import { PlatformBreadcrumbs } from '@/features/platform/components/PlatformBreadcrumbs'

interface Props { searchParams?: Promise<{ saved?: string }> }

export async function StorefrontSettingsPage(_props: Props) {
  const result = await getStorefrontSettings()
  return <>
    <PlatformBreadcrumbs items={[{ label: 'Storefront settings' }]} />
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Storefront settings</h1>
      {result.status === 'unavailable'
        ? <section role="alert" className="rounded-lg border p-4"><h2 className="font-medium">Settings unavailable</h2><p className="mt-2 text-sm">{result.message}</p><a className="mt-3 inline-flex min-h-11 items-center underline" href="/dashboard/platform/storefront">Retry loading settings</a></section>
        : <StorefrontSettingsForm setting={result.setting} locations={result.locations} />}
    </main>
  </>
}
