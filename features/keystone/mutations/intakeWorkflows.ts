import { graphql } from '@keystone-6/core'
import type { Context, IntakeReviewActionDispositionType } from '.keystone/types'
import { permissions } from '../access'
import { assertPracticeRecord, bounded, evidenceHash, requireActorPractice, validIdempotencyKey } from '../workflowAuth'
import { serializableWorkflow } from './serializableWorkflow'

type Result = { success: boolean; recordId: string | null; evidenceHash: string | null; error: string | null }
const denied = { success: false, recordId: null, evidenceHash: null }
const reviewDispositions = ['reviewed', 'needs_clarification', 'escalated'] as const satisfies readonly IntakeReviewActionDispositionType[]
const isReviewDisposition = (value: string): value is typeof reviewDispositions[number] => reviewDispositions.some(disposition => disposition === value)
const fail = (error: unknown): Result => ({ ...denied, error: error instanceof Error ? error.message : 'Intake workflow failed' })

export async function submitIntakeTransaction(context: Context, args: { templateId: string; appointmentId: string; responses: unknown; acknowledgement: string; supersedesId?: string | null; idempotencyKey: string }): Promise<Result> {
  if (!context.session?.itemId || !validIdempotencyKey(args.idempotencyKey) || !args.acknowledgement.trim()) return { ...denied, error: 'Authenticated intake evidence is required' }
  try {
    const actor = requireActorPractice(context)
    const [template, appointment, prior] = await Promise.all([
      assertPracticeRecord(context, 'FormTemplate', args.templateId, 'id practice { id } version isActive'),
      assertPracticeRecord(context, 'Appointment', args.appointmentId, 'id practice { id } client { user { id } }'),
      args.supersedesId ? assertPracticeRecord(context, 'FormSubmission', args.supersedesId, 'id practice { id } client { id } supersededBy { id }') : null,
    ])
    if (appointment.client?.user?.id !== actor.actorId) throw new Error('Intake ownership could not be verified')
    if (template.isActive !== true) throw new Error('Intake template is not active')
    if (prior && (prior.client?.id !== actor.actorId || prior.supersededBy?.id)) throw new Error('Intake supersession is invalid')
    const submittedAt = new Date().toISOString(), data = bounded(args.responses)
    const hash = evidenceHash({ templateId: template.id, templateVersion: template.version, appointmentId: appointment.id, clientId: actor.actorId, data, acknowledgement: args.acknowledgement, submittedAt })
    return await serializableWorkflow(context, 'medspa-intake', [`appointment:${appointment.id}`, `client:${actor.actorId}`, `idempotency:${args.idempotencyKey}`], async tx => {
      const sudo = tx.sudo(), existing = (await tx.sudo().query.FormSubmission.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: 'id evidenceHash' }))[0]
      if (existing) return { success: true, recordId: existing.id, evidenceHash: existing.evidenceHash, error: null }
      const row = await sudo.query.FormSubmission.createOne({ data: { practice: { connect: { id: actor.practiceId } }, template: { connect: { id: template.id } }, templateVersion: template.version, appointment: { connect: { id: appointment.id } }, client: { connect: { id: actor.actorId } }, status: 'submitted', data, acknowledgement: args.acknowledgement.trim(), submittedAt, signedAt: submittedAt, evidenceHash: hash, idempotencyKey: args.idempotencyKey, supersedes: prior ? { connect: { id: prior.id } } : undefined }, query: 'id evidenceHash' })
      if (prior) await sudo.query.FormSubmission.updateOne({ where: { id: prior.id }, data: { status: 'superseded' }, query: 'id' })
      return { success: true, recordId: row.id, evidenceHash: row.evidenceHash, error: null }
    })
  } catch (error) { return fail(error) }
}

export async function reviewIntakeTransaction(context: Context, args: { submissionId: string; disposition: Exclude<IntakeReviewActionDispositionType, 'superseded'>; rationale: string; findings: unknown; idempotencyKey: string }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageClinical); await assertPracticeRecord(context, 'FormSubmission', args.submissionId) } catch (error) { return fail(error) }
  if (!validIdempotencyKey(args.idempotencyKey) || !isReviewDisposition(args.disposition) || !args.rationale.trim()) return { ...denied, error: 'Intake review evidence is invalid' }
  try { return await serializableWorkflow(context, 'medspa-intake-review', [`submission:${args.submissionId}`, `idempotency:${args.idempotencyKey}`], async tx => {
    const sudo = tx.sudo(), existing = (await sudo.query.IntakeReviewAction.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: 'id evidenceHash submission { id }' }))[0]
    if (existing) { if (existing.submission?.id !== args.submissionId) throw new Error('Idempotency key was already used'); return { success: true, recordId: args.submissionId, evidenceHash: existing.evidenceHash, error: null } }
    const row = await sudo.query.FormSubmission.findOne({ where: { id: args.submissionId }, query: 'id status' }); if (!row || row.status === 'superseded') throw new Error('Superseded intake cannot be reviewed')
    const occurredAt = new Date().toISOString(), hash = evidenceHash({ ...args, reviewerId: actor.actorId, fromStatus: row.status, occurredAt })
    await sudo.query.IntakeReviewAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, submission: { connect: { id: row.id } }, reviewer: { connect: { id: actor.actorId } }, disposition: args.disposition, rationale: args.rationale.trim(), findings: bounded(args.findings), evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: 'id' })
    await sudo.query.FormSubmission.updateOne({ where: { id: row.id }, data: { status: args.disposition === 'reviewed' ? 'reviewed' : 'in_review', reviewedBy: { connect: { id: actor.actorId } }, reviewedAt: occurredAt }, query: 'id' })
    return { success: true, recordId: row.id, evidenceHash: hash, error: null }
  }) } catch (error) { return fail(error) }
}

const resultType = graphql.object<Result>()({ name: 'IntakeWorkflowResult', fields: { success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), recordId: graphql.field({ type: graphql.ID }), evidenceHash: graphql.field({ type: graphql.String }), error: graphql.field({ type: graphql.String }) } })
export const submitIntake = graphql.field({ type: resultType, args: { templateId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), responses: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), acknowledgement: graphql.arg({ type: graphql.nonNull(graphql.String) }), supersedesId: graphql.arg({ type: graphql.ID }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) }, resolve: (_s,args,context:Context) => submitIntakeTransaction(context,args) })
export const reviewIntake = graphql.field({ type: resultType, args: { submissionId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), disposition: graphql.arg({ type: graphql.nonNull(graphql.String) }), rationale: graphql.arg({ type: graphql.nonNull(graphql.String) }), findings: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) }, resolve: (_s,args,context:Context) => {
  if (!isReviewDisposition(args.disposition)) return Promise.resolve({ ...denied, error: 'Intake review evidence is invalid' })
  return reviewIntakeTransaction(context, { submissionId: args.submissionId, disposition: args.disposition, rationale: args.rationale, findings: args.findings, idempotencyKey: args.idempotencyKey })
} })
