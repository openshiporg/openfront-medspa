import assert from "node:assert/strict";
import type { Context } from ".keystone/types";
import { keystoneContext } from "./context";
import { assertOwnedLocalDatabase } from './localRuntime';

const actorSelection = `
  id name email status onboardingStatus
  practice { id name slug }
  locations { id }
  role {
    id name
    canManagePeople canManageRoles canAccessDashboard canManageOnboarding canManagePractice
    canSchedule canReadClients canManageClinical canManageSensitiveRecords canManageInventory
    canManageFinance canManageCommunications canViewReports canManageIntegrations
    practice { id }
  }
`;

type RuntimeActor = {
  id: string;
  name: string | null;
  email: string;
  status: string;
  onboardingStatus: string;
  practice: { id: string; name: string; slug: string } | null;
  locations: Array<{ id: string }>;
  role: Record<string, unknown> & { id: string; canManageOnboarding?: boolean; practice?: { id: string } | null };
};

export type RuntimeTestActor = {
  actor: RuntimeActor;
  context: Context;
  sudo: ReturnType<Context["sudo"]>;
  practiceId: string;
};

export async function getRuntimeTestActor(options: { requirePractice?: boolean } = {}): Promise<RuntimeTestActor> {
  assert.equal(await assertOwnedLocalDatabase(keystoneContext.prisma), true, 'Runtime tests require the exact goal-owned native cluster');
  const sudo = keystoneContext.sudo();
  const configuredEmail = process.env.MEDSPA_RUNTIME_ACTOR_EMAIL?.trim().toLowerCase();
  const candidates = await sudo.query.User.findMany({
    where: {
      status: { equals: "active" },
      role: { canManageOnboarding: { equals: true } },
      ...(configuredEmail ? { email: { equals: configuredEmail } } : {}),
    },
    take: 20,
    orderBy: { createdAt: "asc" },
    query: actorSelection,
  }) as RuntimeActor[];
  const actor = candidates.find((candidate) => candidate.practice?.id) || candidates[0];
  assert.ok(actor, configuredEmail
    ? `No controlled onboarding actor exists for MEDSPA_RUNTIME_ACTOR_EMAIL=${configuredEmail}`
    : "No controlled onboarding actor exists; create the owner through the supported bootstrap flow first");
  assert.equal(actor.status, "active");
  assert.equal(actor.role?.canManageOnboarding, true);
  if (options.requirePractice !== false) assert.ok(actor.practice?.id, "Controlled onboarding must complete before this runtime test");
  if (actor.practice?.id && actor.role.practice?.id) assert.equal(actor.role.practice.id, actor.practice.id, "Runtime actor role and practice scope differ");

  const session = {
    itemId: actor.id,
    listKey: "User",
    data: {
      name: actor.name,
      email: actor.email,
      status: actor.status,
      practice: actor.practice,
      locations: actor.locations,
      role: actor.role,
    },
  };
  return {
    actor,
    context: keystoneContext.withSession(session as any),
    sudo,
    practiceId: actor.practice?.id || "",
  };
}

export type RuntimeWriteCounts = {
  users: number;
  providers: number;
  clients: number;
  appointments: number;
  appointmentLineItems: number;
  payments: number;
  paymentSessions: number;
  transactions: number;
  commissions: number;
  clinicalOrders: number;
  treatmentSessions: number;
  treatmentAdministrations: number;
  webhookEvents: number;
  inventoryMovements: number;
};

export async function runtimeWriteCounts(sudo: ReturnType<Context["sudo"]>, practiceId: string): Promise<RuntimeWriteCounts> {
  const where = { practice: { id: { equals: practiceId } } };
  const [
    users, providers, clients, appointments, appointmentLineItems, payments, paymentSessions,
    transactions, commissions, clinicalOrders, treatmentSessions, treatmentAdministrations,
    webhookEvents, inventoryMovements,
  ] = await Promise.all([
    sudo.query.User.count({ where }),
    sudo.query.Provider.count({ where }),
    sudo.query.Client.count({ where }),
    sudo.query.Appointment.count({ where }),
    sudo.query.AppointmentLineItem.count({ where }),
    sudo.query.Payment.count({ where }),
    sudo.query.PaymentSession.count({ where }),
    sudo.query.MedSpaTransaction.count({ where }),
    sudo.query.Commission.count({ where }),
    sudo.query.ClinicalOrder.count({ where }),
    sudo.query.TreatmentSession.count({ where }),
    sudo.query.TreatmentAdministration.count({ where }),
    sudo.query.PaymentWebhookEvent.count({ where }),
    sudo.query.InventoryMovement.count({ where }),
  ]);
  return { users, providers, clients, appointments, appointmentLineItems, payments, paymentSessions, transactions, commissions, clinicalOrders, treatmentSessions, treatmentAdministrations, webhookEvents, inventoryMovements };
}

export async function assertNoRuntimeWrites(
  before: RuntimeWriteCounts,
  sudo: ReturnType<Context["sudo"]>,
  practiceId: string,
  message: string,
) {
  assert.deepEqual(await runtimeWriteCounts(sudo, practiceId), before, message);
}

export function futureIso(days = 30) {
  return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
}
