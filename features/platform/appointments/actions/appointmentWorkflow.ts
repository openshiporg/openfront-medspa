'use server';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { getAppointmentSchedule } from './appointmentSchedule';

export type WorkflowCapabilities = {
  canSchedule: boolean;
  canReadClients: boolean;
  canManageClinical: boolean;
  canManageFinance: boolean;
};

export type AppointmentWorkflowDetail = {
  id: string;
  startTime?: string | null;
  endTime?: string | null;
  duration?: number | null;
  status?: string | null;
  depositAmount?: number | null;
  depositPaid?: boolean | null;
  bookedAt?: string | null;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  location?: { id: string; name?: string | null; timezone?: string | null } | null;
  client?: {
    id: string;
    totalVisits?: number | null;
    lastVisit?: string | null;
    user?: { name?: string | null; email?: string | null; phone?: string | null } | null;
  } | null;
  provider?: { id: string; user?: { name?: string | null } | null } | null;
  services: {
    id: string;
    name?: string | null;
    requiresConsultation?: boolean | null;
    requiresIntakeReview?: boolean | null;
    requiresLotTraceability?: boolean | null;
    staffAuthorizationRequired?: boolean | null;
  }[];
  lineItems: { id: string; serviceTitle?: string | null; price?: number | null; quantity?: number | null; duration?: number | null }[];
  payment?: { id: string; status?: string | null; totalAmount?: number | null; paymentMethod?: string | null; processedAt?: string | null } | null;
  transaction?: { id: string; status?: string | null; paymentStatus?: string | null; paymentMethod?: string | null; completedAt?: string | null } | null;
};

export type ClinicalWorkflowSummary = {
  consents: { id: string; status?: string | null; service?: { id: string; name?: string | null } | null; effectiveUntil?: string | null }[];
  sessions: { id: string; serviceTitle?: string | null; status?: string | null; staffAuthorizationConfirmed?: boolean | null }[];
};

export type AppointmentWorkflowData = {
  appointment: AppointmentWorkflowDetail | null;
  capabilities: WorkflowCapabilities;
  clinical: ClinicalWorkflowSummary | null;
};

const noCapabilities: WorkflowCapabilities = {
  canSchedule: false,
  canReadClients: false,
  canManageClinical: false,
  canManageFinance: false,
};

async function getCapabilities(): Promise<WorkflowCapabilities> {
  const response = await keystoneClient<{
    authenticatedItem?: { role?: Partial<WorkflowCapabilities> | null } | null;
  }>(`
    query AppointmentWorkflowCapabilities {
      authenticatedItem {
        ... on User {
          role {
            canSchedule
            canReadClients
            canManageClinical
            canManageFinance
          }
        }
      }
    }
  `);

  if (!response.success) return noCapabilities;
  const role = response.data.authenticatedItem?.role;
  return {
    canSchedule: role?.canSchedule === true,
    canReadClients: role?.canReadClients === true,
    canManageClinical: role?.canManageClinical === true,
    canManageFinance: role?.canManageFinance === true,
  };
}

export async function getAppointmentWorkflowDetail(id: string): Promise<AppointmentWorkflowData> {
  const capabilities = await getCapabilities();
  if (capabilities.canSchedule && !capabilities.canManageClinical) {
    const scheduling = await getAppointmentSchedule(id);
    return { appointment: scheduling ? { id: scheduling.scope.appointmentId, startTime: scheduling.startTime, endTime: scheduling.endTime, status: scheduling.status, location: { id: scheduling.scope.locationId, timezone: scheduling.timezone }, services: [], lineItems: [] } : null, capabilities, clinical: null };
  }
  if (capabilities.canManageClinical) {
    const header = await keystoneClient<{ medspaAppointmentClinicalHeader: { appointmentId: string } }>('query AppointmentClinicalHeader($appointmentId: ID!) { medspaAppointmentClinicalHeader(appointmentId: $appointmentId) }', { appointmentId: id });
    if (!header.success || header.data.medspaAppointmentClinicalHeader?.appointmentId !== id) return { appointment: null, capabilities, clinical: null };
  }
  const canReadClientContext = capabilities.canReadClients || capabilities.canSchedule || capabilities.canManageClinical;
  const clientSelection = canReadClientContext
    ? 'client { id totalVisits lastVisit user { name email phone } }'
    : '';
  const financialFields = capabilities.canManageFinance
    ? `payment { id status totalAmount paymentMethod processedAt }
       transaction { id status paymentStatus paymentMethod completedAt }`
    : '';

  const response = await keystoneClient<{ appointment: AppointmentWorkflowDetail | null }>(`
    query AppointmentWorkflowDetail($id: ID!) {
      appointment(where: { id: $id }) {
        id startTime endTime duration status depositAmount depositPaid bookedAt confirmedAt cancelledAt cancellationReason
        location { id name timezone }
        ${clientSelection}
        provider { id user { name } }
        services {
          id name requiresConsultation requiresIntakeReview requiresLotTraceability staffAuthorizationRequired
        }
        lineItems { id serviceTitle price quantity duration }
        ${financialFields}
      }
    }
  `, { id });

  if (!response.success || !response.data.appointment) {
    return { appointment: null, capabilities, clinical: null };
  }

  let clinical: ClinicalWorkflowSummary | null = null;
  if (capabilities.canManageClinical) {
    const clinicalResponse = await keystoneClient<{ appointment: ClinicalWorkflowSummary | null }>(`
      query AppointmentClinicalWorkflowSummary($id: ID!) {
        appointment(where: { id: $id }) {
          consents(take: 50) { id status effectiveUntil service { id name } }
          sessions: treatmentSessions(take: 50) { id serviceTitle status staffAuthorizationConfirmed }
        }
      }
    `, { id });
    if (clinicalResponse.success && clinicalResponse.data.appointment) clinical = clinicalResponse.data.appointment;
  }

  return { appointment: response.data.appointment, capabilities, clinical };
}
