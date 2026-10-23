import type { ReactNode } from "react"

interface PageIntroProps {
  eyebrow?: ReactNode
  title: ReactNode
  status?: ReactNode
  children?: ReactNode
}

/** Page opener: mono eyebrow, display title with an optional status on the same line. */
export function PageIntro({ eyebrow, title, status, children }: PageIntroProps) {
  return (
    <header className="mb-[var(--sf-space-lg)] grid gap-4 md:mb-[var(--sf-space-xl)]">
      {eyebrow ? <p className="sf-eyebrow">{eyebrow}</p> : null}
      <div className="sf-title-line">
        <h1 className="sf-display max-w-[16ch] text-[length:var(--sf-text-display)]">{title}</h1>
        {status}
      </div>
      {children}
    </header>
  )
}
