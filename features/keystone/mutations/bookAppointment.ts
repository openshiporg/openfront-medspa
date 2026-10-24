import { graphql } from "@keystone-6/core";
import { aggregateIdempotencyKey } from "../aggregateIdempotencyKey";
import type { Context } from ".keystone/types";
import { sendAppointmentRequestReceipt } from "../lib/mail";
import { permissions } from "../access";
import { captureServiceSnapshot } from "../serviceSnapshot";
import { computeProviderAvailability, getRuntimeLocation, zonedDateKey } from "../scheduling/availability";
import { evaluateProviderAuthority, recordAuthorityDecision } from "../clinicalAuthority";
import { assertActiveActor, bounded, evidenceHash, requireActorPractice } from "../workflowAuth";
import { serializableWorkflow } from "./serializableWorkflow";
import { guestAccessToken } from "../lib/guestAccess";
import { assertPlanStaffMembership } from "./treatmentPlanApproval";
import { assertNewPlanBooking, loadPlanBookingEvidence, planBookingSnapshot, type PlanBookingInput } from "./planBookingEvidence";

const BookAppointmentResult = graphql.object<{
  success: boolean;
  appointmentId: string | null;
  error: string | null;
  accessToken?: string | null;
}>()({
  name: "BookAppointmentResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    appointmentId: graphql.field({ type: graphql.ID }),
    error: graphql.field({ type: graphql.String }),
    // Guest requests only: the bearer link token for viewing and cancelling this request.
    accessToken: graphql.field({ type: graphql.String }),
  },
});

function guestPassword() {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function resolveAuthorizedClient(
  sudo: ReturnType<Context["sudo"]>,
  input: { name: string; email: string; phone?: string | null },
  sessionUserId?: string,
  isOperator = false,
  practiceId?: string,
) {
  // Public requests remain guest bookings. They must never claim an existing
  // client identity merely by knowing an email address.
  if (!sessionUserId && !isOperator) return null;

  let user = sessionUserId
    ? await sudo.query.User.findOne({ where: { id: sessionUserId }, query: "id name email phone status practice { id }" })
    : (await sudo.query.User.findMany({ where: { email: { equals: input.email }, practice: practiceId ? { id: { equals: practiceId } } : undefined }, take: 1, query: "id name email phone practice { id }" }))[0];

  if (sessionUserId && user?.status !== "active") throw new Error("The signed-in account is unavailable");
  if (sessionUserId && (!practiceId || user?.practice?.id !== practiceId)) throw new Error("Signed-in account does not belong to this practice");
  if (sessionUserId && user?.email?.toLowerCase() !== input.email) {
    throw new Error("Use the email address on your signed-in account");
  }

  if (!user && isOperator) {
    // Identity creation is people administration, not ordinary booking authority.
    // The User hook independently revalidates this capability and tenant.
    user = await sudo.query.User.createOne({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone || "",
        password: guestPassword(),
        practice: practiceId ? { connect: { id: practiceId } } : undefined,
      },
      query: "id name email phone",
    });
  }
  if (!user) throw new Error("Signed-in client account could not be found");

  const existingClients = await sudo.query.Client.findMany({
    where: { user: { id: { equals: user.id } }, practice: practiceId ? { id: { equals: practiceId } } : undefined },
    take: 1,
    query: "id user { id name email phone }",
  });
  if (existingClients[0]) return existingClients[0];

  return sudo.query.Client.createOne({
    data: {
      user: { connect: { id: user.id } },
      practice: practiceId ? { connect: { id: practiceId } } : undefined,
      firstVisit: new Date().toISOString(),
      totalVisits: 0,
      lifetimeValue: 0,
    },
    query: "id user { id name email phone }",
  });
}

export async function lockBookingCapacity(context: Context, providerId: string, services: readonly any[], supervisorIds: string[] = []) {
  const keys = [
    `provider:${providerId}`,
    ...supervisorIds.map(id => `provider:${id}`),
    ...services.flatMap((service: any) => service.requiredResources || []).map((resource: any) => `resource:${resource.id}`),
  ];
  for (const key of [...new Set(keys)].sort()) {
    await context.prisma.$executeRawUnsafe(
      "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
      "medspa-appointment-capacity",
      key,
    );
  }
  // Reuse the device writers\u0027 actual namespaces and keys, not a parallel lock domain.
  const devices = services.flatMap((service: any) => service.requiredResources || []).filter((resource: any) => ["device", "equipment"].includes(resource.type));
  for (const namespace of ["medspa-device-readiness", "medspa-incident", "medspa-recall", "medspa-resource", "medspa-resource-reservation"]) {
    const keys = ["medspa-resource", "medspa-resource-reservation"].includes(namespace) ? services.flatMap((service: any) => service.requiredResources || []).map((resource: any) => `resource:${resource.id}`) : devices.map((resource: any) => `device:${resource.id}`);
    for (const key of [...new Set(keys)].sort()) await context.prisma.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", namespace, key);
  }
}

async function loadServices(sudo: ReturnType<Context["sudo"]>, serviceIds: string[], publicOnly: boolean, trustedPracticeId?: string) {
  const services = await sudo.query.Service.findMany({
    where: {
      id: { in: serviceIds },
      ...(trustedPracticeId ? { practice: { id: { equals: trustedPracticeId } } } : {}),
      ...(publicOnly ? { status: { equals: 'active' as const }, isPublic: { equals: true }, practice: { ...(trustedPracticeId ? { id: { equals: trustedPracticeId } } : {}), isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } } } : {}),
    },
    query: `
      id
      name
      status
      isPublic
      staffAuthorizationRequired
      requiresConsultation
      requiresIntakeReview
      requiresLotTraceability
      cleanupBufferMinutes
      category { id }
      baseDuration
      basePrice
      price
      depositAmount
      practice { id isActive storefrontSetting { isPublished primaryLocation { id isActive } } }
      image { imagePath image { url } }
      requiredResources {
        id
        name
        capacity
        type
        practice { id }
        isActive
        isPublic
      }
    `,
  });

  if (services.length !== new Set(serviceIds).size) {
    throw new Error("One or more selected services could not be found");
  }

  const inactiveService = services.find((service: any) => service.status !== "active" || (publicOnly && service.isPublic !== true));
  if (inactiveService) {
    throw new Error('Selected service is unavailable');
  }
  const practiceIds = new Set(services.map((service: any) => service.practice?.id).filter(Boolean));
  if (practiceIds.size !== 1) throw new Error("Selected services do not share one practice");
  for (const service of services as any[]) {
    if (!service.practice?.isActive || (publicOnly && (!service.practice.storefrontSetting?.isPublished
      || service.practice.storefrontSetting.primaryLocation?.isActive !== true))) throw new Error("Storefront is unavailable");
    if ((service.requiredResources || []).some((resource: any) => resource.isActive !== true || (publicOnly && resource.isPublic !== true))) {
      throw new Error(`${service.name || "Selected service"} has no active public request resource`);
    }
  }

  return services;
}

export const bookAppointment = graphql.field({
  type: BookAppointmentResult,
  args: {
    rescheduleAppointmentId: graphql.arg({ type: graphql.ID }),
    expectedAppointmentRevision: graphql.arg({ type: graphql.Int }),
    rescheduleReason: graphql.arg({ type: graphql.String }),
    planId: graphql.arg({ type: graphql.ID }),
    planItemId: graphql.arg({ type: graphql.ID }),
    planClientId: graphql.arg({ type: graphql.ID }),
    expectedPlanHash: graphql.arg({ type: graphql.String }),
    expectedResourceIds: graphql.arg({ type: graphql.list(graphql.nonNull(graphql.ID)) }),
    expectedSupervisorIds: graphql.arg({ type: graphql.list(graphql.nonNull(graphql.ID)) }),
    serviceIds: graphql.arg({ type: graphql.nonNull(graphql.list(graphql.nonNull(graphql.ID))) }),
    providerId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    locationId: graphql.arg({ type: graphql.ID }),
    startTime: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    clientName: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    clientEmail: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    clientPhone: graphql.arg({ type: graphql.String }),
    clientNotes: graphql.arg({ type: graphql.String }),
    idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  resolve(_source, args, context: Context) { return bookAppointmentTransaction(context, args); },
});

export type BookingInput = PlanBookingInput & { rescheduleAppointmentId?: string | null; expectedAppointmentRevision?: number | null; rescheduleReason?: string | null; serviceIds: readonly string[]; providerId: string; locationId?: string | null; startTime: string; clientName: string; clientEmail: string; clientPhone?: string | null; clientNotes?: string | null; idempotencyKey: string; expectedResourceIds?: readonly string[] | null; expectedSupervisorIds?: readonly string[] | null };

export async function bookAppointmentTransaction(context: Context, args: BookingInput) {
    const serviceIds = Array.from(new Set(args.serviceIds.filter(Boolean)));
    const clientName = args.clientName.trim();
    const clientEmail = args.clientEmail.trim().toLowerCase();
    const clientPhone = args.clientPhone?.trim() || "";
    const start = new Date(args.startTime);
    const idempotencyKey = args.idempotencyKey.trim();

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
      return { success: false, appointmentId: null, error: "A valid booking request key is required" };
    }
    if (serviceIds.length === 0) {
      return { success: false, appointmentId: null, error: "Choose at least one service" };
    }
    if (serviceIds.length > 10) {
      return { success: false, appointmentId: null, error: "Too many services were selected" };
    }
    if (!clientName || clientName.length > 120) {
      return { success: false, appointmentId: null, error: "Client name is required" };
    }
    if (!clientEmail || clientEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      return { success: false, appointmentId: null, error: "A valid email address is required" };
    }
    if (clientPhone.length > 40 || (args.clientNotes?.length || 0) > 2_000) {
      return { success: false, appointmentId: null, error: "Booking contact details are too long" };
    }
    if (Number.isNaN(start.getTime())) {
      return { success: false, appointmentId: null, error: "Appointment start time is invalid" };
    }

    try {
      const schedulingSession = permissions.canSchedule({ session: context.session as any });
      const publicOnly = !schedulingSession;
      const booking = await serializableWorkflow(context, "medspa-booking", [], async (transactionContext) => {
        const sudo = transactionContext.sudo();
        const operator = schedulingSession
          ? { ...requireActorPractice(transactionContext, permissions.canSchedule), ...(await assertActiveActor(transactionContext)) }
          : null;
        const services = await loadServices(sudo, serviceIds, publicOnly, operator?.practiceId || transactionContext.session?.data.practice?.id);

        const duration = services.reduce((sum: number, service: any) => sum + Number(service.baseDuration || 0), 0) || 60;
        const end = new Date(start.getTime() + duration * 60_000);
        const practiceIds = [...new Set(services.map((service: any) => service.practice?.id).filter(Boolean))] as string[];
        if (practiceIds.length !== 1) throw new Error("Booking scope is unavailable");
        const bookingPracticeId = practiceIds[0];
        if (operator && operator.practiceId !== bookingPracticeId) throw new Error("Scheduling authority does not cover this practice");
        const restrictedServices = services.filter((service: any) => service.staffAuthorizationRequired !== false || service.requiresConsultation || service.requiresIntakeReview || service.requiresLotTraceability);
        if (new Set(restrictedServices.map((service: any) => service.id)).size > 1) throw new Error("Book each restricted service separately until service-specific encounter evidence is supported");
        const location = await getRuntimeLocation(sudo, args.locationId, bookingPracticeId, publicOnly);
        const hasPlan = Boolean(args.planId || args.planItemId || args.planClientId || args.expectedPlanHash);
        if (hasPlan && !operator) throw new Error("Approved-plan booking requires scheduling authority");
        const binding = hasPlan ? await loadPlanBookingEvidence(transactionContext, args, { practiceId: bookingPracticeId, providerId: args.providerId, locationId: location.locationId!, serviceIds }) : null;
        if (binding && (binding.client.user?.email?.toLowerCase() !== clientEmail || binding.client.user?.name !== clientName)) throw new Error("Booking patient contact identity changed; refresh the original patient");
        const bookingRequestHash = evidenceHash({ practiceId: bookingPracticeId, serviceIds, providerId: args.providerId, locationId: location.locationId, startTime: start.toISOString(), clientName, clientEmail, clientPhone, clientNotes: args.clientNotes?.trim() || "", ...(binding ? { rescheduleAppointmentId: args.rescheduleAppointmentId || null, expectedAppointmentRevision: args.expectedAppointmentRevision || null, rescheduleReason: args.rescheduleReason?.trim() || "", actorId: operator!.actorId, planBooking: planBookingSnapshot(binding), expectedResourceIds: [...(args.expectedResourceIds || [])].sort(), expectedSupervisorIds: [...(args.expectedSupervisorIds || [])].sort() } : {}) });
        const scopedIdempotencyKey = aggregateIdempotencyKey(`booking:${bookingPracticeId}`, idempotencyKey);
        await transactionContext.prisma.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", "medspa-booking-idempotency", scopedIdempotencyKey);
        if (args.rescheduleAppointmentId && !binding) throw new Error("Only an exact approved-plan appointment can use this reschedule workflow");
        const correctionReceipts = await sudo.query.AuditEvent.findMany({ where: { practice: { id: { equals: bookingPracticeId } }, resourceType: { equals: "Appointment" }, action: { equals: "treatment_plan.rescheduled.v1" }, correlationId: { equals: idempotencyKey } }, take: 2, query: "resourceId evidence evidenceHash" });
        if (correctionReceipts.length) {
          const evidence = correctionReceipts[0].evidence as any;
          if (correctionReceipts.length !== 1 || correctionReceipts[0].resourceId !== args.rescheduleAppointmentId || evidence?.requestHash !== bookingRequestHash || correctionReceipts[0].evidenceHash !== evidenceHash(evidence)) throw new Error("Reschedule key was already used with different evidence");
          return { appointmentId: correctionReceipts[0].resourceId, duration, services, providerName: "", created: false, timezone: location.timezone };
        }
        const prior = (await sudo.query.Appointment.findMany({ where: { idempotencyKey: { equals: scopedIdempotencyKey }, practice: { id: { equals: bookingPracticeId } } }, take: 1, query: "id metadata duration" }))[0];
        if (prior) {
          if ((prior.metadata as any)?.bookingRequestHash !== bookingRequestHash) throw new Error("Booking request key was already used with different details");
          return { appointmentId: prior.id, duration: prior.duration || 0, services, providerName: "", created: false, timezone: location.timezone };
        }
        if (start.getTime() < Date.now() || start.getTime() > Date.now() + 366 * 24 * 60 * 60_000) throw new Error("Appointment start time is invalid");
        let moving: any = null;
        if (args.rescheduleAppointmentId) {
          for (const namespace of ["medspa-appointment-transition", "medspa-resource-reservation"]) await transactionContext.prisma.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", namespace, `appointment:${args.rescheduleAppointmentId}`);
          moving = await sudo.query.Appointment.findOne({ where: { id: args.rescheduleAppointmentId }, query: "id practice { id } client { id } provider { id } location { id } status revision startTime endTime metadata payment { id } transaction { id } treatmentSessionsCount consentsCount resourceReservations { id status } supervisorReservations { id status }" });
          if (!moving || moving.practice?.id !== bookingPracticeId || moving.client?.id !== binding!.client.id || moving.provider?.id !== args.providerId || moving.location?.id !== location.locationId || evidenceHash(moving.metadata?.planBooking) !== evidenceHash(planBookingSnapshot(binding!)) || !["pending", "confirmed"].includes(moving.status) || moving.revision !== args.expectedAppointmentRevision || !args.rescheduleReason?.trim() || args.rescheduleReason.length > 1000) throw new Error("Current appointment version and reschedule reason are required");
          if (moving.payment?.id || moving.transaction?.id || moving.treatmentSessionsCount || moving.consentsCount) throw new Error("Documented clinical or financial evidence requires a separate reviewed correction workflow; this appointment cannot be silently rescheduled");
        }
        if (binding) {
          await transactionContext.prisma.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", "medspa-treatment-plan", `client:${binding.client.id}`);
          await assertNewPlanBooking(transactionContext, binding, services[0], start, end, moving?.id);
        }
        const authorityDecisions = [];
        for (const service of services.filter((item: any) => item.staffAuthorizationRequired !== false)) authorityDecisions.push(await evaluateProviderAuthority(sudo, { providerId: args.providerId, serviceId: service.id, locationId: location.locationId!, at: start, stage: "scheduling" }));
        if (binding) for (const decision of authorityDecisions) if (decision.supervisorId) {
          const supervisor = await sudo.query.Provider.findOne({ where: { id: decision.supervisorId }, query: "id status isActive practice { id } user { id status practice { id } }" });
          if (!supervisor || supervisor.practice?.id !== bookingPracticeId || supervisor.status !== "active" || supervisor.isActive !== true || supervisor.user?.status !== "active" || supervisor.user.practice?.id !== bookingPracticeId) throw new Error("Required supervisor identity is no longer active");
          await assertPlanStaffMembership(sudo, bookingPracticeId, supervisor.user.id, location.locationId!);
        }
        await lockBookingCapacity(transactionContext, args.providerId, services, authorityDecisions.map(decision => decision.supervisorId).filter(Boolean) as string[]);
        const availability = await computeProviderAvailability({
          sudo,
          providerId: args.providerId,
          date: zonedDateKey(start, location.timezone),
          serviceDuration: duration,
          serviceIds,
          locationId: location.locationId,
          publicOnly,
          excludeAppointmentId: moving?.id,
        });
        const selectedSlot = availability.slots.find((slot) => new Date(slot.startTime).getTime() === start.getTime());
        if (!selectedSlot?.available) {
          throw new Error(selectedSlot?.blockedReason || "Selected time is outside the provider's schedule");
        }
        if (binding && (!args.expectedResourceIds || !args.expectedSupervisorIds || JSON.stringify([...args.expectedResourceIds].sort()) !== JSON.stringify([...selectedSlot.resourceIds].sort()) || JSON.stringify([...args.expectedSupervisorIds].sort()) !== JSON.stringify([...selectedSlot.supervisorIds].sort()))) throw new Error("Reviewed resource or supervisor assignment changed; reselect availability with a new request key");
        const providerName = availability.providerName;
        const resourceId = selectedSlot.resourceId;
        if (JSON.stringify([...new Set(authorityDecisions.map(decision => decision.supervisorId).filter(Boolean))].sort()) !== JSON.stringify([...selectedSlot.supervisorIds].sort())) throw new Error("Supervisor authority changed across the selected interval");
        const cleanupBufferMinutes = Math.max(15, ...services.map((service: any) => Number(service.cleanupBufferMinutes || 0)));
        const reservedEnd = new Date(end.getTime() + cleanupBufferMinutes * 60_000);
        for (const decision of authorityDecisions) {
          const throughEnd = await evaluateProviderAuthority(sudo, { providerId: args.providerId, serviceId: decision.serviceId, locationId: location.locationId!, at: end, stage: "scheduling" });
          if (throughEnd.authorizationId !== decision.authorizationId || throughEnd.credentialId !== decision.credentialId || throughEnd.supervisorId !== decision.supervisorId || throughEnd.policyVersion !== decision.policyVersion) throw new Error("Provider authority does not cover the exact appointment interval");
        }
        const practiceId = practiceIds[0];
        if (!practiceId || authorityDecisions.some(decision => decision.practiceId !== practiceId)) throw new Error("Booking scope is unavailable");
        const client = binding?.client || await resolveAuthorizedClient(
          sudo,
          { name: clientName, email: clientEmail, phone: clientPhone },
          operator ? undefined : context.session?.itemId,
          Boolean(operator),
          practiceId,
        );

        if (moving) {
          for (const row of moving.resourceReservations.filter((value: any) => ["reserved", "in_use"].includes(value.status))) await sudo.query.AppointmentResourceReservation.updateOne({ where: { id: row.id }, data: { status: "superseded" }, query: "id" });
          for (const row of moving.supervisorReservations.filter((value: any) => value.status === "reserved")) await sudo.query.AppointmentSupervisorReservation.updateOne({ where: { id: row.id }, data: { status: "superseded" }, query: "id" });
        }
        const appointment = moving ? await sudo.query.Appointment.updateOne({ where: { id: moving.id }, data: { startTime: start.toISOString(), endTime: end.toISOString(), revision: moving.revision + 1, resource: resourceId ? { connect: { id: resourceId } } : { disconnect: true }, room: selectedSlot.roomId ? { connect: { id: selectedSlot.roomId } } : { disconnect: true }, device: selectedSlot.deviceId ? { connect: { id: selectedSlot.deviceId } } : { disconnect: true }, metadata: { ...moving.metadata, capacityBufferMinutes: cleanupBufferMinutes } }, query: "id" }) : await sudo.query.Appointment.createOne({
          data: {
            practice: { connect: { id: practiceId } },
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            duration,
            status: "pending",
            depositAmount: services.reduce((sum: number, service: any) => sum + Number(service.depositAmount || 0), 0),
            depositPaid: false,
            location: availability.locationId ? { connect: { id: availability.locationId } } : undefined,
            client: client ? { connect: { id: client.id } } : undefined,
            provider: { connect: { id: args.providerId } },
            resource: resourceId ? { connect: { id: resourceId } } : undefined,
            room: selectedSlot.roomId ? { connect: { id: selectedSlot.roomId } } : undefined,
            device: selectedSlot.deviceId ? { connect: { id: selectedSlot.deviceId } } : undefined,
            services: { connect: serviceIds.map((id) => ({ id })) },
            clientNotes: args.clientNotes?.trim() || "",
            idempotencyKey: scopedIdempotencyKey,
            metadata: {
              source: binding ? "approved_plan_booking" : "storefront_booking",
              ...(binding ? { planBooking: planBookingSnapshot(binding) } : {}),
              bookingRequestHash,
              capacityBufferMinutes: cleanupBufferMinutes,
              guest: client ? null : { name: clientName, email: clientEmail, phone: clientPhone },
            },
          },
          query: "id",
        });
        const requestBoundaryEvidenceHash = authorityDecisions.length
          ? authorityDecisions.map(decision => decision.evidenceHash).join(":")
          : evidenceHash({ appointmentId: appointment.id, practiceId, providerId: args.providerId, serviceIds, stage: "non_clinical_demo_request" });
        const selectedResources = services.flatMap((service: any) => service.requiredResources || [])
          .filter((resource: any, index: number, all: any[]) => selectedSlot.resourceIds.includes(resource.id) && all.findIndex(candidate => candidate.id === resource.id) === index);
        for (const resource of selectedResources) {
          await sudo.query.AppointmentResourceReservation.createOne({ data: {
            practice: { connect: { id: practiceId } }, location: { connect: { id: availability.locationId! } }, appointment: { connect: { id: appointment.id } },
            resource: { connect: { id: resource.id } }, segmentKey: "booking", purpose: resource.type === "room" ? "room" : resource.type === "device" ? "device" : "equipment",
            units: 1, startsAt: start.toISOString(), endsAt: end.toISOString(), status: "reserved", revision: 1,
            assignmentEvidence: { segmentKey: "booking", serviceId: serviceIds.length === 1 ? serviceIds[0] : null, providerId: args.providerId, supervisorId: selectedSlot.supervisorIds.length === 1 ? selectedSlot.supervisorIds[0] : null, cleanupBufferMinutes, authorityEvidenceHashes: authorityDecisions.map(decision => decision.evidenceHash), requestBoundary: authorityDecisions.length ? "clinical_authority_evaluated" : "non_clinical_demo_request", resourceReadinessChecked: true },
            evidenceHash: requestBoundaryEvidenceHash, idempotencyKey: `booking:${appointment.id}:${idempotencyKey}:resource:${resource.id}`,
          }, query: "id" });
        }
        for (const supervisorId of [...new Set(authorityDecisions.map((decision: any) => decision.supervisorId).filter(Boolean))] as string[]) {
          const supervisorEvidenceHash = authorityDecisions.filter((decision: any) => decision.supervisorId === supervisorId).map((decision: any) => decision.evidenceHash).join(":");
          await sudo.query.AppointmentSupervisorReservation.createOne({ data: { practice: { connect: { id: practiceId } }, location: { connect: { id: availability.locationId! } }, appointment: { connect: { id: appointment.id } }, supervisor: { connect: { id: supervisorId } }, service: serviceIds.length === 1 ? { connect: { id: serviceIds[0] } } : undefined, startsAt: start.toISOString(), endsAt: reservedEnd.toISOString(), status: "reserved", evidenceHash: supervisorEvidenceHash, idempotencyKey: `booking:${appointment.id}:${idempotencyKey}:supervisor:${supervisorId}` }, query: "id" });
        }
        for (const [index, decision] of authorityDecisions.entries()) await recordAuthorityDecision(transactionContext, decision, { clientId: client?.id, appointmentId: appointment.id }, `booking:${appointment.id}:${idempotencyKey}:authority:${index}`);
        for (const service of moving ? [] : services) {
          const snapshot = binding ? { serviceTitle: binding.accepted.serviceTitle, duration: binding.accepted.duration, price: binding.accepted.price, serviceImagePath: null } : captureServiceSnapshot(service);
          await sudo.query.AppointmentLineItem.createOne({
            data: {
              appointment: { connect: { id: appointment.id } },
              service: { connect: { id: service.id } },
              staff: { connect: { id: args.providerId } },
              serviceTitle: snapshot.serviceTitle,
              serviceImagePath: snapshot.serviceImagePath,
              duration: snapshot.duration,
              price: snapshot.price,
              quantity: 1,
              notes: args.clientNotes?.trim() || "",
              metadata: {
                snapshotType: binding ? "approved_plan_booking" : "booking_request",
                ...(binding ? { planBooking: planBookingSnapshot(binding) } : {}),
                snapshotVersion: 1,
                serviceId: service.id,
                serviceName: snapshot.serviceTitle,
                serviceImagePath: snapshot.serviceImagePath,
                serviceBasePrice: service.basePrice,
                servicePrice: snapshot.price,
                requestedStartTime: start.toISOString(),
                requirements: {
                  snapshotVersion: 1,
                  serviceId: service.id,
                  requiresConsultation: service.requiresConsultation === true,
                  requiresIntakeReview: service.requiresIntakeReview === true,
                  staffAuthorizationRequired: service.staffAuthorizationRequired !== false,
                  requiresLotTraceability: service.requiresLotTraceability === true,
                },
              },
            },
            query: "id",
          });
        }

        if (binding) {
          const evidence = { ...(moving ? { priorStartTime: moving.startTime, priorEndTime: moving.endTime, fromRevision: moving.revision, toRevision: moving.revision + 1, reason: args.rescheduleReason!.trim() } : {}), requestHash: bookingRequestHash, appointmentId: appointment.id, planBooking: planBookingSnapshot(binding), actorId: operator!.actorId, startTime: start.toISOString(), endTime: end.toISOString(), resourceIds: selectedSlot.resourceIds, supervisorIds: selectedSlot.supervisorIds };
          await sudo.query.AuditEvent.createOne({ data: { practice: { connect: { id: practiceId } }, location: { connect: { id: availability.locationId! } }, actor: { connect: { id: operator!.actorId } }, action: moving ? "treatment_plan.rescheduled.v1" : "treatment_plan.booked.v1", resourceType: "Appointment", resourceId: appointment.id, correlationId: idempotencyKey, evidence: bounded(evidence), evidenceHash: evidenceHash(evidence), occurredAt: new Date().toISOString() }, query: "id" });
        }
        return { appointmentId: appointment.id, duration, services, providerName, created: !moving, timezone: location.timezone };
      });

      // Plan booking does not activate a clinical notification sink. Delivery needs the separately approved outbox/sink policy.
      if (booking.created && !args.planId) try {
        const dateStr = start.toLocaleDateString("en-US", {
          timeZone: booking.timezone,
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const timeStr = start.toLocaleTimeString("en-US", {
          timeZone: booking.timezone,
          timeZoneName: "short",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        await sendAppointmentRequestReceipt({
          to: clientEmail,
          clientName,
          serviceName: booking.services.map((service: any) => service.name).join(", "),
          providerName: booking.providerName,
          appointmentDate: dateStr,
          appointmentTime: timeStr,
          duration: booking.duration,
        });
      } catch (emailError) {
        console.error("Failed to send appointment request receipt:", emailError);
      }

      const booked = await context.sudo().query.Appointment.findOne({ where: { id: booking.appointmentId }, query: "id client { id }" });
      const accessToken = booked && !booked.client?.id ? guestAccessToken(booking.appointmentId) : null;
      return { success: true, appointmentId: booking.appointmentId, error: null, accessToken };
    } catch (error) {
      return {
        success: false,
        appointmentId: null,
        error: error instanceof Error ? error.message : "Unable to book appointment",
      };
    }
}
