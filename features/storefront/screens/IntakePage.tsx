import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getIntakeForms } from "../lib/data/intake"
import { storefrontMetadata } from "../lib/data/brand"
import { IntakeFormClient } from "../components/IntakeFormClient"
import { PillLink, StateCard, Status, Track } from "../components/ui/primitives"

export async function generateIntakeMetadata(): Promise<Metadata> {
  return { ...(await storefrontMetadata("Intake")), robots: { index: false, follow: false } }
}

export async function IntakePage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params
  const forms = await getIntakeForms(appointmentId)
  if (forms === null) notFound()
  return (
    <div className="sf-container-narrow sf-page-pad">
      <header className="mb-[var(--sf-space-lg)] grid gap-4">
        <h1 className="sf-display text-[length:var(--sf-text-display-s)]">Intake</h1>
      </header>
      {forms.length === 0 ? <StateCard title="No forms needed for this visit" action={<Track><PillLink href="/account">My appointments</PillLink></Track>} /> : (
        <div className="grid gap-[var(--sf-space-lg)]">
          {forms.map((form) => (
            <section key={form.id} className="sf-card grid gap-5 p-[var(--sf-space-md)]" aria-labelledby={`intake-${form.id}`}>
              <div className="sf-title-line">
                <h2 id={`intake-${form.id}`} className="sf-display text-[length:var(--sf-text-2xl)]">{form.name}</h2>
                <Status tone={form.submitted ? "ok" : "wait"}>{form.submitted ? "Submitted" : "To do"}</Status>
              </div>
              {!form.submitted && Array.isArray(form.fields) && form.fields.length ? <IntakeFormClient templateId={form.id} appointmentId={appointmentId} fields={form.fields} /> : null}
            </section>
          ))}
          <Track><PillLink href="/account">My appointments</PillLink></Track>
        </div>
      )}
    </div>
  )
}
