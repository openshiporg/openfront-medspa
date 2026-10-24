import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import { permissions } from "../access";
import { bounded, evidenceHash, requireActorPractice, validIdempotencyKey } from "../workflowAuth";
import { serializableWorkflow } from "./serializableWorkflow";

type Result = { success: boolean; recordId: string | null; version: number | null; error: string | null };
const denied = { success: false, recordId: null, version: null };
const fail = (error: unknown): Result => ({ ...denied, error: error instanceof Error ? error.message : "Form workflow failed" });

const FIELD_TYPES = new Set(["text", "textarea", "checkbox", "radio", "select", "date", "signature"]);
const TEMPLATE_TYPES = new Set(["intake", "consent", "clinical_intake", "waiver"]);

type FormField = { id: string; type: string; label: string; required: boolean; options?: string[] };

/** Validated, normalized field definitions shared by IntakeForm and FormTemplate. */
export function normalizeFormFields(input: unknown): FormField[] {
  if (!Array.isArray(input) || input.length === 0) throw new Error("Add at least one field");
  if (input.length > 100) throw new Error("A form can have at most 100 fields");
  const seen = new Set<string>();
  return input.map((raw, index) => {
    const field = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const id = String(field.id || "").trim();
    const type = String(field.type || "").trim();
    const label = String(field.label || "").trim();
    if (!/^[a-z][a-z0-9_]{0,63}$/i.test(id)) throw new Error(`Field ${index + 1} needs an id of letters, numbers or underscores`);
    if (seen.has(id)) throw new Error(`Field id "${id}" is used twice`);
    seen.add(id);
    if (!FIELD_TYPES.has(type)) throw new Error(`Field "${id}" has an unsupported type`);
    if (!label || label.length > 200) throw new Error(`Field "${id}" needs a label of up to 200 characters`);
    const normalized: FormField = { id, type, label, required: field.required === true };
    if (type === "select" || type === "radio") {
      const options = Array.isArray(field.options) ? field.options.map((option) => String(option).trim()).filter(Boolean) : [];
      if (options.length < 2 || options.length > 50) throw new Error(`Field "${id}" needs 2 to 50 options`);
      normalized.options = [...new Set(options)];
    }
    return normalized;
  });
}

async function scopedIds(context: Context, listKey: "Service" | "ServiceCategory", practiceId: string, ids: readonly string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length > 200) throw new Error("Too many linked records");
  if (!unique.length) return [];
  const rows = await (context.sudo().query[listKey] as any).findMany({ where: { id: { in: unique }, practice: { id: { equals: practiceId } } }, take: unique.length, query: "id" });
  if (rows.length !== unique.length) throw new Error("A linked record was not found");
  return unique;
}

async function replay(context: Context, practiceId: string, idempotencyKey: string, action: string) {
  const prior = (await context.sudo().query.AuditEvent.findMany({ where: { practice: { id: { equals: practiceId } }, correlationId: { equals: idempotencyKey }, action: { equals: action } }, take: 1, query: "resourceId evidence" }))[0];
  return prior ? { success: true, recordId: prior.resourceId, version: Number((prior.evidence as any)?.version) || null, error: null } : null;
}

export async function upsertIntakeFormTransaction(context: Context, args: { formId?: string | null; name: string; fields: unknown; requiredForServiceIds?: readonly string[] | null; isActive: boolean; idempotencyKey: string }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageClinical, "Clinical forms access is required"); } catch (error) { return fail(error); }
  const name = args.name.trim();
  if (!validIdempotencyKey(args.idempotencyKey) || !name || name.length > 200) return { ...denied, error: "Enter a form name of up to 200 characters" };
  try {
    const fields = normalizeFormFields(args.fields);
    const serviceIds = await scopedIds(context, "Service", actor.practiceId, args.requiredForServiceIds || []);
    return await serializableWorkflow(context, "medspa-intake-form", [`intake-form:${args.formId || name.toLowerCase()}`, `idempotency:${actor.practiceId}:${args.idempotencyKey}`], async tx => {
      const sudo = tx.sudo();
      const prior = await replay(tx, actor.practiceId, args.idempotencyKey, "form.intake.upserted");
      if (prior) return prior;
      const data = { name, fields: bounded(fields), isActive: args.isActive === true, requiredForServices: { set: serviceIds.map((id) => ({ id })) } };
      let id: string;
      if (args.formId) {
        const existing = await sudo.query.IntakeForm.findOne({ where: { id: args.formId }, query: "id practice { id }" });
        if (!existing || existing.practice?.id !== actor.practiceId) throw new Error("Form not found");
        id = (await sudo.query.IntakeForm.updateOne({ where: { id: existing.id }, data, query: "id" })).id;
      } else {
        id = (await sudo.query.IntakeForm.createOne({ data: { ...data, practice: { connect: { id: actor.practiceId } }, requiredForServices: { connect: serviceIds.map((serviceId) => ({ id: serviceId })) } }, query: "id" })).id;
      }
      const occurredAt = new Date().toISOString();
      await sudo.query.AuditEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, actor: { connect: { id: actor.actorId } }, action: "form.intake.upserted", resourceType: "IntakeForm", resourceId: id, correlationId: args.idempotencyKey, evidence: { fieldCount: fields.length, serviceIds, isActive: args.isActive === true }, evidenceHash: evidenceHash({ id, name, fields, serviceIds, isActive: args.isActive, occurredAt }), occurredAt }, query: "id" });
      return { success: true, recordId: id, version: null, error: null };
    });
  } catch (error) { return fail(error); }
}

export async function upsertFormTemplateTransaction(context: Context, args: { templateId?: string | null; name: string; type: string; description?: string | null; fields: unknown; requiredForCategoryIds?: readonly string[] | null; isActive: boolean; idempotencyKey: string }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageClinical, "Clinical forms access is required"); } catch (error) { return fail(error); }
  const name = args.name.trim();
  if (!validIdempotencyKey(args.idempotencyKey) || !name || name.length > 200) return { ...denied, error: "Enter a template name of up to 200 characters" };
  if (!TEMPLATE_TYPES.has(args.type)) return { ...denied, error: "Choose a template type" };
  if ((args.description || "").length > 2000) return { ...denied, error: "Description is too long" };
  try {
    const fields = normalizeFormFields(args.fields);
    const categoryIds = await scopedIds(context, "ServiceCategory", actor.practiceId, args.requiredForCategoryIds || []);
    return await serializableWorkflow(context, "medspa-form-template", [`form-template:${args.templateId || name.toLowerCase()}`, `idempotency:${actor.practiceId}:${args.idempotencyKey}`], async tx => {
      const sudo = tx.sudo();
      const prior = await replay(tx, actor.practiceId, args.idempotencyKey, "form.template.upserted");
      if (prior) return prior;
      const content = { name, type: args.type, description: (args.description || "").trim(), fields: bounded(fields), isActive: args.isActive === true };
      let id: string, version = 1;
      if (args.templateId) {
        const existing = await sudo.query.FormTemplate.findOne({ where: { id: args.templateId }, query: "id practice { id } version name type fields submissionsCount metadata" });
        if (!existing || existing.practice?.id !== actor.practiceId) throw new Error("Template not found");
        const contentChanged = existing.type !== args.type || evidenceHash(existing.fields) !== evidenceHash(fields);
        if (existing.submissionsCount > 0 && contentChanged) {
          // Submitted answers keep the exact version they were collected against.
          version = Number(existing.version || 1) + 1;
          id = (await sudo.query.FormTemplate.createOne({ data: { ...content, version, practice: { connect: { id: actor.practiceId } }, requiredForCategories: { connect: categoryIds.map((categoryId) => ({ id: categoryId })) }, metadata: { supersedesId: existing.id } }, query: "id" })).id;
          await sudo.query.FormTemplate.updateOne({ where: { id: existing.id }, data: { isActive: false, metadata: { ...((existing.metadata as object) || {}), supersededById: id } }, query: "id" });
        } else {
          version = Number(existing.version || 1);
          id = (await sudo.query.FormTemplate.updateOne({ where: { id: existing.id }, data: { ...content, requiredForCategories: { set: categoryIds.map((categoryId) => ({ id: categoryId })) } }, query: "id" })).id;
        }
      } else {
        id = (await sudo.query.FormTemplate.createOne({ data: { ...content, version, practice: { connect: { id: actor.practiceId } }, requiredForCategories: { connect: categoryIds.map((categoryId) => ({ id: categoryId })) } }, query: "id" })).id;
      }
      const occurredAt = new Date().toISOString();
      await sudo.query.AuditEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, actor: { connect: { id: actor.actorId } }, action: "form.template.upserted", resourceType: "FormTemplate", resourceId: id, correlationId: args.idempotencyKey, evidence: { version, fieldCount: fields.length, categoryIds, sourceTemplateId: args.templateId || null }, evidenceHash: evidenceHash({ id, version, content, categoryIds, occurredAt }), occurredAt }, query: "id" });
      return { success: true, recordId: id, version, error: null };
    });
  } catch (error) { return fail(error); }
}

const resultType = graphql.object<Result>()({ name: "FormWorkflowResult", fields: { success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), recordId: graphql.field({ type: graphql.ID }), version: graphql.field({ type: graphql.Int }), error: graphql.field({ type: graphql.String }) } });

export const upsertIntakeForm = graphql.field({
  type: resultType,
  args: { formId: graphql.arg({ type: graphql.ID }), name: graphql.arg({ type: graphql.nonNull(graphql.String) }), fields: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), requiredForServiceIds: graphql.arg({ type: graphql.list(graphql.nonNull(graphql.ID)) }), isActive: graphql.arg({ type: graphql.nonNull(graphql.Boolean) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) },
  resolve: (_source, args, context: Context) => upsertIntakeFormTransaction(context, args),
});

export const upsertFormTemplate = graphql.field({
  type: resultType,
  args: { templateId: graphql.arg({ type: graphql.ID }), name: graphql.arg({ type: graphql.nonNull(graphql.String) }), type: graphql.arg({ type: graphql.nonNull(graphql.String) }), description: graphql.arg({ type: graphql.String }), fields: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), requiredForCategoryIds: graphql.arg({ type: graphql.list(graphql.nonNull(graphql.ID)) }), isActive: graphql.arg({ type: graphql.nonNull(graphql.Boolean) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) },
  resolve: (_source, args, context: Context) => upsertFormTemplateTransaction(context, args),
});
