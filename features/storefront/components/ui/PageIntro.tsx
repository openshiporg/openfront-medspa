import type { ReactNode } from "react"

interface PageIntroProps {
  eyebrow?: ReactNode
  title: ReactNode
  status?: ReactNode
  children?: ReactNode
}

/** Page opener: display title with an optional status on the same line, then a side note. */
export function PageIntro({ eyebrow, title, status, children }: PageIntroProps) {
  return (
    <header className="mb-[var(--sf-space-lg)] grid gap-4 md:mb-[var(--sf-space-xl)]">
      <div className="sf-title-line">
        <h1 className="sf-display max-w-[16ch] text-[length:var(--sf-text-display)]">{title}</h1>
        {status}
      </div>
      {eyebrow ? <p className="sf-eyebrow">{eyebrow}</p> : null}
      {children}
    </header>
  )
}
