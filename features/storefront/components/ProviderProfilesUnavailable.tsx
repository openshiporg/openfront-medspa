import { StateCard } from "./ui/primitives"

export function ProviderProfilesUnavailable({ retryHref }: { retryHref: string }) {
  return (
    <StateCard alert title="Providers couldn't load" action={<div className="sf-track"><a href={retryHref} className="sf-pill">Try again</a></div>} />
  )
}
