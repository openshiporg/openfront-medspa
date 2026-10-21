export function ProviderProfilesUnavailable({ retryHref }: { retryHref: string }) {
  return (
    <section role="alert" className="border border-[var(--sf-rule)] bg-[var(--sf-paper-2)] p-[var(--sf-space-lg)]">
      <h2 className="sf-display text-[var(--sf-text-2xl)]">Provider profiles unavailable</h2>
      <p className="mt-3 max-w-2xl text-[var(--sf-text-sm)] leading-relaxed text-[var(--sf-ink-2)]">
        We could not confirm this public profile read. This does not establish whether a profile is published or associated. Public profiles do not establish credentials, clinical authorization, or appointment availability.
      </p>
      <a href={retryHref} className="sf-btn sf-btn-primary mt-5">Retry profile lookup</a>
    </section>
  )
}
