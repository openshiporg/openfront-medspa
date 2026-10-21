export function ServiceCatalogUnavailable({ retryHref }: { retryHref: string }) {
  return (
    <section role="alert" className="border border-[var(--sf-rule)] bg-[var(--sf-paper-2)] p-[var(--sf-space-lg)]">
      <h2 className="sf-display text-[var(--sf-text-2xl)]">Service catalog unavailable</h2>
      <p className="mt-3 max-w-2xl text-[var(--sf-text-sm)] leading-relaxed text-[var(--sf-ink-2)]">
        We could not confirm the published service catalog. This does not mean the catalog is empty. No clinical suitability or appointment availability is inferred.
      </p>
      <a href={retryHref} className="sf-btn sf-btn-primary mt-5">Retry catalog</a>
    </section>
  )
}
