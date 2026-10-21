import { Check } from "lucide-react"

interface Step {
  number: number
  title: string
  description: string
}

interface BookingStepIndicatorProps {
  currentStep: number
  steps: Step[]
}

export function BookingStepIndicator({ currentStep, steps }: BookingStepIndicatorProps) {
  return (
    <ol className="mb-[var(--sf-space-lg)] flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      {steps.map((step) => {
        const isCompleted = currentStep > step.number
        const isCurrent = currentStep === step.number

        return (
          <li
            key={step.number}
            className={`flex items-start gap-3 min-w-0 flex-1 ${
              isCurrent ? "text-[var(--sf-ink)]" : "text-[var(--sf-ink-3)]"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center text-[var(--sf-text-xs)] font-medium border ${
                isCompleted
                  ? "border-[var(--sf-ink)] bg-[var(--sf-ink)] text-[var(--sf-accent-ink)]"
                  : isCurrent
                  ? "border-[var(--sf-accent)] text-[var(--sf-accent)]"
                  : "border-[var(--sf-rule)]"
              }`}
              aria-current={isCurrent ? "step" : undefined}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : step.number}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[var(--sf-text-sm)] font-medium">{step.title}</p>
              <p className="text-[var(--sf-text-xs)] hidden sm:block">{step.description}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
