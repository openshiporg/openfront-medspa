export type WorkflowResult = { success: boolean; error?: string | null; recordId?: string | null };

export type Capabilities = {
  canManageClinical: boolean;
  canManageSensitiveRecords: boolean;
  canManagePractice: boolean;
  /** The signed-in user's own provider profile; clinical actions are attributed to it. */
  providerId: string | null;
};

export type Option = { value: string; label: string };

export type FormFieldType = 'text' | 'textarea' | 'checkbox' | 'radio' | 'select' | 'date' | 'signature';
export type FormFieldDefinition = { id: string; type: FormFieldType; label: string; required: boolean; options?: string[] };

export type IntakeFormRow = { id: string; name: string; isActive: boolean; fields: FormFieldDefinition[]; requiredForServices: Array<{ id: string; name: string }>; submissionsCount: number; updatedAt: string | null };
export type FormTemplateRow = { id: string; name: string; type: string; version: number; description: string | null; isActive: boolean; fields: FormFieldDefinition[]; requiredForCategories: Array<{ id: string; name: string }>; submissionsCount: number; updatedAt: string | null };
export type ConsentTemplateRow = { id: string; version: string; jurisdiction: string; language: string; effectiveFrom: string | null; effectiveUntil: string | null; contentSnapshot: unknown; service: { id: string; name: string } | null; supersededBy: { id: string } | null; recordsCount: number };
export type SubmissionRow = {
  id: string; status: string; templateVersion: number | null; submittedAt: string | null; reviewedAt: string | null; data: Record<string, unknown> | null; acknowledgement: string | null;
  client: { id: string; name: string | null; email: string | null } | null;
  template: { id: string; name: string; version: number; fields: FormFieldDefinition[] } | null;
  appointment: { id: string; startTime: string | null } | null;
  reviewedBy: { name: string | null } | null;
  reviewActions: Array<{ id: string; disposition: string; rationale: string | null; occurredAt: string | null; reviewer: { name: string | null } | null }>;
};

export type FormsOverview =
  | { status: 'restricted' }
  | { status: 'unavailable' }
  | { status: 'loaded'; intakeForms: IntakeFormRow[]; templates: FormTemplateRow[]; consentTemplates: ConsentTemplateRow[]; submissions: SubmissionRow[]; services: Option[]; categories: Option[]; canPublishConsent: boolean };
