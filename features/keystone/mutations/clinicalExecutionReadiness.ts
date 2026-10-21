import type { Context } from ".keystone/types";

function instant(value: unknown) {
  if (!(value instanceof Date) && typeof value !== "string") return NaN;
  return new Date(value).getTime();
}

function covers(start: Date, end: Date, reservationStart: unknown, reservationEnd: unknown) {
  const requestedStart = instant(start);
  const requestedEnd = instant(end);
  const left = instant(reservationStart);
  const right = instant(reservationEnd);
  return Number.isFinite(requestedStart) && Number.isFinite(requestedEnd) && requestedEnd > requestedStart
    && Number.isFinite(left) && Number.isFinite(right) && right > left
    && left <= requestedStart && right >= requestedEnd;
}

type ReservationScope = {
  practiceId: string;
  locationId: string;
  appointmentId: string;
  serviceId: string;
  providerId: string;
  supervisorId?: string | null;
};

function validScope(scope: ReservationScope) {
  return [scope.practiceId, scope.locationId, scope.appointmentId, scope.serviceId, scope.providerId]
    .every((value) => typeof value === "string" && value.trim().length > 0);
}

export function reservationCovers(
  reservations: readonly any[],
  scope: ReservationScope & { resourceId: string; purpose: "room" | "device" },
  start: Date,
  end: Date,
) {
  if (!validScope(scope) || !scope.resourceId?.trim()) return false;
  return reservations.some((reservation) => {
    const assignment = reservation.assignmentEvidence;
    return reservation.status === "reserved"
      && reservation.practice?.id === scope.practiceId
      && reservation.location?.id === scope.locationId
      && reservation.appointment?.id === scope.appointmentId
      && reservation.resource?.id === scope.resourceId
      && reservation.purpose === scope.purpose
      && typeof reservation.segmentKey === "string" && reservation.segmentKey.trim().length > 0
      && assignment !== null && typeof assignment === "object" && !Array.isArray(assignment)
      && assignment.segmentKey === reservation.segmentKey
      && assignment.serviceId === scope.serviceId
      && assignment.providerId === scope.providerId
      && (assignment.supervisorId || null) === (scope.supervisorId || null)
      && covers(start, end, reservation.startsAt, reservation.endsAt);
  });
}

export function supervisorReservationCovers(
  reservations: readonly any[],
  scope: ReservationScope & { supervisorId: string },
  start: Date,
  end: Date,
) {
  if (!validScope(scope) || !scope.supervisorId?.trim()) return false;
  return reservations.some((reservation) => reservation.status === "reserved"
    && reservation.practice?.id === scope.practiceId
    && reservation.location?.id === scope.locationId
    && reservation.appointment?.id === scope.appointmentId
    && reservation.service?.id === scope.serviceId
    && reservation.supervisor?.id === scope.supervisorId
    && covers(start, end, reservation.startsAt, reservation.endsAt));
}

export async function loadRequiredIntakeManifest(sudo: ReturnType<Context["sudo"]>, practiceId: string, service: any) {
  if (service.requiresIntakeReview !== true) return [];
  const categoryId = service.category?.id;
  if (!categoryId) throw new Error("A versioned required-intake category is unavailable");
  const templates = await sudo.query.FormTemplate.findMany({
    where: { practice: { id: { equals: practiceId } }, isActive: { equals: true }, requiredForCategories: { some: { id: { equals: categoryId } } } },
    take: 101,
    query: "id version isActive requiredForCategories { id }",
  });
  if (templates.length > 100) throw new Error("Required intake templates exceed the safe verification bound");
  if (!templates.length) throw new Error("No active versioned intake templates are configured for this service");
  if (templates.some((template: any) => !template.id || !Number.isInteger(template.version) || template.version < 1 || template.isActive !== true || !template.requiredForCategories?.some((category: any) => category.id === categoryId))) throw new Error("Required intake template manifest is invalid");
  return templates.map((template: any) => ({ id: template.id, version: template.version })).sort((a: any, b: any) => a.id.localeCompare(b.id));
}

export async function assertCurrentIntakeEvidence(sudo: ReturnType<Context["sudo"]>, input: {
  practiceId: string; clientUserId: string; appointmentId: string; categoryId: string; requiredForms: Array<{ id: string; version: number }>;
}) {
  const maxAgeDays = Number(process.env.MEDSPA_INTAKE_MAX_AGE_DAYS);
  if (!Number.isInteger(maxAgeDays) || maxAgeDays < 1 || !input.clientUserId || !input.requiredForms.length) throw new Error("Current reviewed intake policy is unavailable");
  const templateIds = input.requiredForms.map((form) => form.id);
  const templates = await sudo.query.FormTemplate.findMany({
    where: { practice: { id: { equals: input.practiceId } }, id: { in: templateIds } },
    take: 101,
    query: "id version isActive requiredForCategories { id }",
  });
  if (templates.length > 100 || templates.length !== input.requiredForms.length) throw new Error("Versioned required-intake templates are unavailable");
  for (const expected of input.requiredForms) {
    const template = templates.find((candidate: any) => candidate.id === expected.id);
    if (!template || template.isActive !== true || !Number.isInteger(template.version) || template.version !== expected.version
      || !template.requiredForCategories?.some((category: any) => category.id === input.categoryId)) {
      throw new Error("Required intake template changed after the clinical order was issued");
    }
  }
  const submissions = await sudo.query.FormSubmission.findMany({
    where: {
      practice: { id: { equals: input.practiceId } },
      client: { id: { equals: input.clientUserId } },
      appointment: { id: { equals: input.appointmentId } },
      template: { id: { in: templateIds } },
    },
    take: 1001,
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    query: "id status templateVersion submittedAt reviewedAt evidenceHash template { id } reviewActions(orderBy: { occurredAt: desc }, take: 1) { disposition evidenceHash occurredAt }", 
  });
  if (submissions.length > 1000) throw new Error("Intake review evidence exceeds the safe verification bound");
  const latestByTemplate = new Map<string, any>();
  for (const submission of submissions as any[]) {
    const templateId = submission.template?.id;
    if (templateId && !latestByTemplate.has(templateId)) latestByTemplate.set(templateId, submission);
  }
  const maxAgeMs = maxAgeDays * 86_400_000;
  for (const expected of input.requiredForms) {
    const submission = latestByTemplate.get(expected.id);
    const reviewedAt = submission?.reviewedAt ? new Date(submission.reviewedAt).getTime() : NaN;
    const submittedAt = submission?.submittedAt ? new Date(submission.submittedAt).getTime() : NaN;
    if (!submission || submission.status !== "reviewed" || submission.templateVersion !== expected.version
      || !submission.evidenceHash || !Number.isFinite(reviewedAt) || !Number.isFinite(submittedAt) || reviewedAt < submittedAt || reviewedAt > Date.now()
      || reviewedAt < Date.now() - maxAgeMs
      || submission.reviewActions?.[0]?.disposition !== "reviewed" || !submission.reviewActions[0].evidenceHash) {
      throw new Error("Current reviewed evidence for every required intake version is required");
    }
  }
}

/** Start is a pre-effect check, not a claim that administration is already in progress. */
export async function assertCurrentClinicalStartReadiness(sudo: ReturnType<Context['sudo']>, session: any, order: any, consent: any, startsAt: Date, endsAt: Date) {
  if (session.plan?.practice?.id !== session.practice?.id || session.plan?.client?.id !== session.client?.id || order.practice?.id !== session.practice?.id || consent.practice?.id !== session.practice?.id
    || order.location?.id !== session.location?.id || order.plan?.id !== session.plan?.id || order.supersededBy?.id || consent.supersededBy?.id
    || (order.authorizedPerformer?.id && order.authorizedPerformer.id !== session.provider?.id) || (order.requiredSupervisor?.id || null) !== (session.supervisor?.id || null)
    || order.consultation?.practice?.id !== session.practice?.id || order.consultation?.location?.id !== session.location?.id || order.consultation?.staffDecisionRecorded !== true
    || !Number.isFinite(instant(order.consultation?.signedAt)) || instant(order.consultation.signedAt) > startsAt.getTime()
    || !/^[a-f0-9]{64}$/.test(order.consultation?.evidenceHash || '') || !order.consultation?.contraindicationReviewHash || !order.consultation?.contraindicationProtocolVersion
    || !/^[a-f0-9]{64}$/.test(order.evidenceHash || '') || !/^[a-f0-9]{64}$/.test(consent.evidenceHash || '')) throw new Error('Current human-signed order, consent, plan and provider scope are required to start');
  const service = await sudo.query.Service.findOne({ where: { id: session.service?.id || '' }, query: 'id status practice { id } category { id } requiresConsultation requiresIntakeReview staffAuthorizationRequired requiresLotTraceability cleanupBufferMinutes clinicalProducts { id }' });
  const accepted = order.instructionSnapshot?.serviceRequirements;
  if (!service || !accepted || service.status !== 'active' || service.practice?.id !== session.practice?.id || service.id !== accepted.serviceId || (service.category?.id || null) !== accepted.categoryId
    || service.requiresConsultation !== accepted.requiresConsultation || service.requiresIntakeReview !== accepted.requiresIntakeReview || service.staffAuthorizationRequired !== accepted.staffAuthorizationRequired || service.requiresLotTraceability !== accepted.requiresLotTraceability
    || Math.max(0, Number(service.cleanupBufferMinutes) || 0) !== accepted.cleanupBufferMinutes
    || JSON.stringify((service.clinicalProducts || []).map((product: { id: string }) => product.id).sort()) !== JSON.stringify(accepted.clinicalProductIds)) throw new Error('Current clinical service requirements changed after the human order');
  const manifest = await loadRequiredIntakeManifest(sudo, session.practice.id, service);
  if (JSON.stringify(manifest) !== JSON.stringify(accepted.requiredIntakeForms)) throw new Error('Current intake versions changed after the human order');
  return assertClinicalReadiness(sudo, session, order, consent, startsAt, endsAt, 'start');
}

/** Administration/documented-service must retain the in-progress prerequisite. */
export async function assertCurrentClinicalExecutionReadiness(sudo: ReturnType<Context['sudo']>, session: any, order: any, consent: any, startsAt: Date, endsAt: Date) {
  return assertClinicalReadiness(sudo, session, order, consent, startsAt, endsAt, 'administration');
}

/** Re-read every mutable patient-specific prerequisite inside the execution transaction. */
async function assertClinicalReadiness(
  sudo: ReturnType<Context["sudo"]>,
  session: any,
  order: any,
  consent: any,
  startsAt: Date,
  endsAt: Date,
  phase: 'start' | 'administration',
) {
  if (!session.appointment?.id || !session.client?.id || !session.service?.id || !session.provider?.id) {
    throw new Error("Treatment-session links are incomplete");
  }
  if (!(phase === 'start' ? ['planned', 'ready'].includes(session.status) : session.status === 'in_progress') || session.plan?.status !== "active") {
    throw new Error("Treatment session or plan is no longer executable");
  }
  if (!Number.isFinite(instant(startsAt)) || !Number.isFinite(instant(endsAt)) || instant(endsAt) <= instant(startsAt)
    || !Number.isFinite(instant(order.validFrom)) || !Number.isFinite(instant(order.validUntil)) || instant(order.validFrom) > instant(startsAt) || instant(order.validUntil) <= instant(endsAt)
    || !Number.isFinite(instant(consent.signedAt)) || (consent.effectiveUntil && (!Number.isFinite(instant(consent.effectiveUntil)) || instant(consent.effectiveUntil) <= instant(endsAt)))) throw new Error('Order and consent must be effective for the full treatment interval');
  const bookedPlan = session.appointment.metadata?.planBooking;
  if (bookedPlan) {
    const currentPlan = await sudo.query.TreatmentPlan.findOne({ where: { id: bookedPlan.planId }, query: "id status revision evidenceHash practice { id } client { id } consultation { id evidenceHash supersededBy { id } } items { id service { id } status }" });
    if (!currentPlan || currentPlan.practice?.id !== session.practice?.id || currentPlan.status !== "active" || currentPlan.id !== session.plan?.id || currentPlan.revision !== bookedPlan.planRevision || currentPlan.evidenceHash !== bookedPlan.planHash || currentPlan.client?.id !== session.client?.id || bookedPlan.providerId !== session.provider?.id || bookedPlan.serviceId !== session.service?.id || !currentPlan.items?.some((item: any) => item.id === bookedPlan.itemId && item.service?.id === session.service.id && ["planned", "in_progress"].includes(item.status)) || currentPlan.consultation?.id !== order.consultation?.id || currentPlan.consultation?.evidenceHash !== bookedPlan.consultationHash || currentPlan.consultation?.supersededBy?.id) throw new Error("Exact approved plan, item, and consultation version no longer authorize this booked encounter");
  }
  const serviceRequirements = order.instructionSnapshot?.serviceRequirements;
  if (!serviceRequirements || serviceRequirements.snapshotVersion !== 1 || serviceRequirements.serviceId !== session.service.id
    || order.status !== "active" || new Date(order.validFrom) > startsAt || new Date(order.validUntil) <= startsAt
    || order.protocolVersion === "" || order.client?.id !== session.client.id || order.service?.id !== session.service.id
    || order.consultation?.status !== "completed" || order.consultation?.candidacyDecision !== "candidate"
    || order.consultation?.supersededBy?.id || order.consultation?.client?.id !== session.client.id
    || order.consultation?.service?.id !== session.service.id) {
    throw new Error("Current active clinical order and matching candidate consultation are required");
  }
  if (consent.status !== "effective" || new Date(consent.signedAt) > startsAt
    || (consent.effectiveUntil && new Date(consent.effectiveUntil) <= startsAt)
    || consent.client?.id !== session.client.id || consent.appointment?.id !== session.appointment.id
    || consent.service?.id !== session.service.id) {
    throw new Error("Current matching treatment consent is required");
  }
  if (new Date(session.appointment.startTime) > startsAt || new Date(session.appointment.endTime) < endsAt) {
    throw new Error("Treatment interval is outside the appointment window");
  }

  if (serviceRequirements.requiresIntakeReview === true) {
    await assertCurrentIntakeEvidence(sudo, {
      practiceId: session.practice.id,
      clientUserId: session.client.user?.id,
      appointmentId: session.appointment.id,
      categoryId: serviceRequirements.categoryId,
      requiredForms: serviceRequirements.requiredIntakeForms || [],
    });
  }

  const consultationId = order.consultation.id;
  const findings = await sudo.query.ContraindicationFinding.findMany({
    where: {
      practice: { id: { equals: session.practice.id } },
      consultation: { id: { equals: consultationId } },
      severity: { in: ["hard_stop", "clinician_review"] },
    },
    take: 101,
    orderBy: { detectedAt: "desc" },
    query: "id severity decisions(orderBy: { decidedAt: desc }, take: 1) { disposition expiresAt evidenceHash }",
  });
  if (findings.length > 100) throw new Error("Contraindication review exceeds the safe verification bound");
  const unresolved = findings.some((finding: any) => {
    const decision = finding.decisions?.[0];
    return !decision || decision.disposition !== "cleared_with_rationale" || !/^[a-f0-9]{64}$/.test(decision.evidenceHash || '')
      || (decision.expiresAt && (!Number.isFinite(instant(decision.expiresAt)) || instant(decision.expiresAt) <= endsAt.getTime()));
  });
  if (unresolved) throw new Error("Current contraindication review blocks treatment execution");
}

export async function assertResourceIntervalReady(
  sudo: ReturnType<Context["sudo"]>,
  resourceId: string,
  startsAt: Date,
  endsAt: Date,
) {
  const blocks = await sudo.query.ResourceScheduleBlock.findMany({
    where: {
      resource: { id: { equals: resourceId } },
      startsAt: { lt: endsAt.toISOString() },
      endsAt: { gt: startsAt.toISOString() },
    },
    take: 51,
    query: "id startsAt endsAt",
  });
  if (blocks.length) throw new Error("A required treatment resource has an overlapping maintenance or unavailable block");
  if (blocks.length > 50) throw new Error("Resource availability exceeds the safe verification bound");
}
