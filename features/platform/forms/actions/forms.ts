'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { getRecordCapabilities } from './capabilities';
import type { ConsentTemplateRow, FormFieldDefinition, FormsOverview, FormTemplateRow, IntakeFormRow, SubmissionRow, WorkflowResult } from '../types';

function asFields(value: unknown): FormFieldDefinition[] {
  return Array.isArray(value) ? value.filter((field) => field && typeof field === 'object' && typeof (field as any).id === 'string') as FormFieldDefinition[] : [];
}

export async function getFormsOverview(): Promise<FormsOverview> {
  const capabilities = await getRecordCapabilities();
  if (!capabilities) return { status: 'unavailable' };
  if (!capabilities.canManageClinical) return { status: 'restricted' };
  const response = await keystoneClient<{
    intakeForms: any[]; formTemplates: any[]; consentTemplateVersions: any[]; formSubmissions: any[];
    services: Array<{ id: string; name: string }>; serviceCategories: Array<{ id: string; name: string }>;
  }>(`
    query FormsOverview {
      intakeForms(orderBy: { name: asc }, take: 100) { id name isActive fields updatedAt submissionsCount requiredForServices(orderBy: { name: asc }) { id name } }
      formTemplates(orderBy: [{ name: asc }, { version: desc }], take: 200) { id name type version description isActive fields updatedAt submissionsCount requiredForCategories(orderBy: { name: asc }) { id name } }
      consentTemplateVersions(orderBy: { effectiveFrom: desc }, take: 200) { id version jurisdiction language effectiveFrom effectiveUntil contentSnapshot service { id name } supersededBy { id } recordsCount }
      formSubmissions(orderBy: { submittedAt: desc }, take: 100) {
        id status templateVersion submittedAt reviewedAt data acknowledgement
        client { id name email } template { id name version fields } appointment { id startTime } reviewedBy { name }
        reviewActions(orderBy: { occurredAt: desc }, take: 20) { id disposition rationale occurredAt reviewer { name } }
      }
      services(orderBy: { name: asc }, take: 300) { id name }
      serviceCategories(orderBy: { name: asc }, take: 100) { id name }
    }
  `, {}, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  const data = response.data;
  return {
    status: 'loaded',
    canPublishConsent: capabilities.canManagePractice,
    intakeForms: (data.intakeForms || []).map((row): IntakeFormRow => ({ ...row, fields: asFields(row.fields), requiredForServices: row.requiredForServices || [] })),
    templates: (data.formTemplates || []).map((row): FormTemplateRow => ({ ...row, fields: asFields(row.fields), requiredForCategories: row.requiredForCategories || [] })),
    consentTemplates: (data.consentTemplateVersions || []) as ConsentTemplateRow[],
    submissions: (data.formSubmissions || []).map((row): SubmissionRow => ({ ...row, template: row.template ? { ...row.template, fields: asFields(row.template.fields) } : null, reviewActions: row.reviewActions || [] })),
    services: (data.services || []).map((service) => ({ value: service.id, label: service.name })),
    categories: (data.serviceCategories || []).map((category) => ({ value: category.id, label: category.name })),
  };
}

function done(): void { revalidatePath('/dashboard/platform/forms'); }

export async function saveIntakeForm(input: { formId?: string | null; name: string; fields: FormFieldDefinition[]; requiredForServiceIds: string[]; isActive: boolean; idempotencyKey: string }): Promise<WorkflowResult> {
  const response = await keystoneClient<{ upsertIntakeForm: WorkflowResult }>(`
    mutation SaveIntakeForm($formId: ID, $name: String!, $fields: JSON!, $requiredForServiceIds: [ID!], $isActive: Boolean!, $idempotencyKey: String!) {
      upsertIntakeForm(formId: $formId, name: $name, fields: $fields, requiredForServiceIds: $requiredForServiceIds, isActive: $isActive, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, input);
  if (!response.success) return { success: false, error: 'Form not saved.' };
  if (response.data.upsertIntakeForm.success) done();
  return response.data.upsertIntakeForm;
}

export async function saveFormTemplate(input: { templateId?: string | null; name: string; type: string; description: string; fields: FormFieldDefinition[]; requiredForCategoryIds: string[]; isActive: boolean; idempotencyKey: string }): Promise<WorkflowResult> {
  const response = await keystoneClient<{ upsertFormTemplate: WorkflowResult }>(`
    mutation SaveFormTemplate($templateId: ID, $name: String!, $type: String!, $description: String, $fields: JSON!, $requiredForCategoryIds: [ID!], $isActive: Boolean!, $idempotencyKey: String!) {
      upsertFormTemplate(templateId: $templateId, name: $name, type: $type, description: $description, fields: $fields, requiredForCategoryIds: $requiredForCategoryIds, isActive: $isActive, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, input);
  if (!response.success) return { success: false, error: 'Template not saved.' };
  if (response.data.upsertFormTemplate.success) done();
  return response.data.upsertFormTemplate;
}

export async function publishConsentVersion(input: { serviceId: string; jurisdiction: string; language: string; version: string; title: string; body: string; effectiveFrom: string; effectiveUntil?: string | null; supersedesId?: string | null; idempotencyKey: string }): Promise<WorkflowResult> {
  const { title, body, ...rest } = input;
  if (!title.trim() || !body.trim()) return { success: false, error: 'Enter the consent title and text.' };
  const response = await keystoneClient<{ publishConsentTemplate: WorkflowResult }>(`
    mutation PublishConsentVersion($serviceId: ID!, $jurisdiction: String!, $language: String!, $version: String!, $content: JSON!, $effectiveFrom: String!, $effectiveUntil: String, $supersedesId: ID, $idempotencyKey: String!) {
      publishConsentTemplate(serviceId: $serviceId, jurisdiction: $jurisdiction, language: $language, version: $version, content: $content, effectiveFrom: $effectiveFrom, effectiveUntil: $effectiveUntil, supersedesId: $supersedesId, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, { ...rest, effectiveUntil: rest.effectiveUntil || null, supersedesId: rest.supersedesId || null, content: { title: title.trim(), body: body.trim() } });
  if (!response.success) return { success: false, error: 'Consent not published.' };
  if (response.data.publishConsentTemplate.success) done();
  return response.data.publishConsentTemplate;
}

export async function reviewFormSubmission(input: { submissionId: string; disposition: string; rationale: string; notes: string; idempotencyKey: string }): Promise<WorkflowResult> {
  const response = await keystoneClient<{ reviewIntake: WorkflowResult }>(`
    mutation ReviewFormSubmission($submissionId: ID!, $disposition: String!, $rationale: String!, $findings: JSON!, $idempotencyKey: String!) {
      reviewIntake(submissionId: $submissionId, disposition: $disposition, rationale: $rationale, findings: $findings, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, { submissionId: input.submissionId, disposition: input.disposition, rationale: input.rationale, findings: { notes: input.notes.trim() }, idempotencyKey: input.idempotencyKey });
  if (!response.success) return { success: false, error: 'Review not saved.' };
  if (response.data.reviewIntake.success) done();
  return response.data.reviewIntake;
}
