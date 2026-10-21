interface PageIntroProps {
  title: string
  description?: string
  align?: "left" | "center"
  size?: "default" | "large"
}

export function PageIntro({
  title,
  description,
  align = "left",
  size = "default",
}: PageIntroProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : ""
  const titleClass =
    size === "large" ? "text-[var(--sf-text-display)]" : "text-[var(--sf-text-display-s)]"

  return (
    <header className={`mb-[var(--sf-space-lg)] max-w-4xl ${alignClass}`}>
      <h1 className={`sf-display ${titleClass} text-[var(--sf-ink)] mb-[var(--sf-space-sm)]`}>
        {title}
      </h1>
      {description ? (
        <p
          className={`sf-lead ${align === "center" ? "mx-auto" : ""}`}
          style={{ fontSize: size === "large" ? "var(--sf-text-lg)" : undefined }}
        >
          {description}
        </p>
      ) : null}
    </header>
  )
}
