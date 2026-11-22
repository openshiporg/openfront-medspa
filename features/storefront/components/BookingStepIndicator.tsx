import { Check } from "lucide-react"

interface Step {
  number: number
  title: string
}

interface BookingStepIndicatorProps {
  currentStep: number
  steps: Step[]
  /** Completed steps become buttons that return to that step. */
  onStepSelect?: (step: number) => void
}

export function BookingStepIndicator({ currentStep, steps, onStepSelect }: BookingStepIndicatorProps) {
  return (
    <nav aria-label="Booking steps" className="mb-[var(--sf-space-md)]">
      {/* On a phone four pills do not fit with their names, so the step is one line of text. */}
      <p className="sf-num text-[length:var(--sf-text-sm)] text-[var(--sf-ink-3)] sm:hidden" aria-current="step">
        Step {currentStep} of {steps.length} · <span className="font-medium text-[var(--sf-ink)]">{steps.find((step) => step.number === currentStep)?.title}</span>
      </p>
      <div className="max-sm:hidden"><ol className="sf-track sf-track-scroll w-full sm:w-auto">
        {steps.map((step) => {
          const done = currentStep > step.number
          const current = currentStep === step.number
          const content = (
            <>
              <span className="sf-num text-[length:var(--sf-text-2xs)] opacity-70">{done ? <Check className="!size-3.5" aria-hidden="true" /> : step.number}</span>
              <span>{step.title}</span>
            </>
          )
          return (
            <li key={step.number} className="flex">
              {done && onStepSelect ? (
                <button type="button" className="sf-pill sf-pill-quiet" onClick={() => onStepSelect(step.number)} aria-label={`${step.title}, completed. Change`}>{content}</button>
              ) : (
                <span className={`sf-pill ${current ? "" : "sf-pill-quiet"}`} aria-current={current ? "step" : undefined} style={current ? undefined : { cursor: "default" }}>{content}</span>
              )}
            </li>
          )
        })}
      </ol></div>
    </nav>
  )
}
