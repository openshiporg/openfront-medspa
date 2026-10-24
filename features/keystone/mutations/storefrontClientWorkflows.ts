import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import type { JSONValue } from "@keystone-6/core/types";
import { assertActiveActor, evidenceHash, requireActorPractice, validIdempotencyKey } from "../workflowAuth";
import { validGuestAccessToken } from "../lib/guestAccess";
import { serializableWorkflow } from "./serializableWorkflow";
import { storefrontPracticeSlug } from "../lib/storefrontPractice";

/*
 * Customer-side workflows for the storefront account. Each one is scoped to the
 * signed-in client's own records; staff workflows stay in their own files.
 */

type IntakeTemplate = { id: string; name: string; type: string; description: string | null; fields: JSONValue; submitted: boolean; status: string | null };
type ReviewProjection = { id: string; rating: number; comment: string | null; author: string; serviceName: string | null; providerName: string | null; createdAt: string | null };
type WorkflowResult = { success: boolean; recordId: string | null; error: string | null };

const failed = (error: unknown): WorkflowResult => ({ success: false, recordId: null, error: error instanceof Error ? error.message : "Request failed" });

async function ownedAppointment(context: Context, appointmentId: string) {
  const actor = await assertActiveActor(context);
  const appointment = await context.sudo().query.Appointment.findOne({
    where: { id: appointmentId },
    query: "id status practice { id } client { id user { id } } provider { id } lineItems { service { id category { id } } } services { id category { id } } review { id }",
  });
  if (!appointment || appointment.practice?.id !== actor.practiceId || appointment.client?.user?.id !== actor.actorId) throw new Error("Appointment not found");
  return { actor, appointment };
}

const IntakeTemplateType = graphql.object<IntakeTemplate>()({
  name: "ClientIntakeTemplate",
  fields: {
    id: graphql.field({ type: graphql.nonNull(graphql.ID) }),
    name: graphql.field({ type: graphql.nonNull(graphql.String) }),
    type: graphql.field({ type: graphql.nonNull(graphql.String) }),
    description: graphql.field({ type: graphql.String }),
    fields: graphql.field({ type: graphql.JSON }),
    submitted: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    status: graphql.field({ type: graphql.String }),
  },
});

/** Intake templates the client must complete before this appointment, and whether each is done. */
export const clientIntakeForms = graphql.field({
  type: graphql.nonNull(graphql.list(graphql.nonNull(IntakeTemplateType))),
  args: { appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }) },
  async resolve(_source, args, context: Context): Promise<IntakeTemplate[]> {
    const { actor, appointment } = await ownedAppointment(context, args.appointmentId);
    const categoryIds = [...new Set([
      ...(appointment.lineItems || []).map((line: any) => line.service?.category?.id),
      ...(appointment.services || []).map((service: any) => service.category?.id),
    ].filter(Boolean))] as string[];
    if (!categoryIds.length) return [];
    const sudo = context.sudo();
    const templates = await sudo.query.FormTemplate.findMany({
      where: { practice: { id: { equals: actor.practiceId } }, isActive: { equals: true }, type: { in: ["intake", "clinical_intake"] }, requiredForCategories: { some: { id: { in: categoryIds } } } },
      take: 20, orderBy: { name: "asc" }, query: "id name type description fields version",
    });
    const submissions = templates.length ? await sudo.query.FormSubmission.findMany({
      where: { practice: { id: { equals: actor.practiceId } }, appointment: { id: { equals: appointment.id } }, client: { id: { equals: actor.actorId } }, template: { id: { in: templates.map((template: any) => template.id) } }, supersededBy: null },
      take: 50, query: "id status template { id }",
    }) : [];
    return templates.map((template: any) => {
      const submission = submissions.find((item: any) => item.template?.id === template.id);
      return { id: template.id, name: template.name, type: template.type, description: template.description || null, fields: (template.fields ?? null) as JSONValue, submitted: Boolean(submission), status: submission?.status || null };
    });
  },
});

/** One review per completed visit; it stays hidden until staff approve it. */
export const submitAppointmentReview = graphql.field({
  type: graphql.nonNull(graphql.object<WorkflowResult>()({
    name: "SubmitAppointmentReviewResult",
    fields: {
      success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
      recordId: graphql.field({ type: graphql.ID }),
      error: graphql.field({ type: graphql.String }),
    },
  })),
  args: {
    appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    rating: graphql.arg({ type: graphql.nonNull(graphql.Int) }),
    comment: graphql.arg({ type: graphql.String }),
    idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  async resolve(_source, args, context: Context): Promise<WorkflowResult> {
    try {
      if (!validIdempotencyKey(args.idempotencyKey)) throw new Error("Request key is invalid");
      if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) throw new Error("Choose a rating from 1 to 5");
      const comment = (args.comment || "").trim();
      if (comment.length > 2000) throw new Error("Review is too long");
      const { actor, appointment } = await ownedAppointment(context, args.appointmentId);
      if (appointment.status !== "completed") throw new Error("Only completed visits can be reviewed");
      if (appointment.review?.id) return { success: true, recordId: appointment.review.id, error: null };
      const serviceId = appointment.lineItems?.[0]?.service?.id || appointment.services?.[0]?.id || null;
      return await serializableWorkflow(context, "medspa-client-review", [`appointment:${appointment.id}`], async (tx) => {
        const sudo = tx.sudo();
        const existing = await sudo.query.Review.findMany({ where: { appointment: { id: { equals: appointment.id } } }, take: 1, query: "id" });
        if (existing[0]) return { success: true, recordId: existing[0].id, error: null };
        const review = await sudo.query.Review.createOne({
          data: {
            practice: { connect: { id: actor.practiceId } }, rating: args.rating, comment, isApproved: false,
            client: { connect: { id: appointment.client.id } }, appointment: { connect: { id: appointment.id } },
            service: serviceId ? { connect: { id: serviceId } } : undefined,
            provider: appointment.provider?.id ? { connect: { id: appointment.provider.id } } : undefined,
          },
          query: "id",
        });
        return { success: true, recordId: review.id, error: null };
      });
    } catch (error) { return failed(error); }
  },
});

const PublicReviewType = graphql.object<ReviewProjection>()({
  name: "StorefrontReview",
  fields: {
    id: graphql.field({ type: graphql.nonNull(graphql.ID) }),
    rating: graphql.field({ type: graphql.nonNull(graphql.Int) }),
    comment: graphql.field({ type: graphql.String }),
    author: graphql.field({ type: graphql.nonNull(graphql.String) }),
    serviceName: graphql.field({ type: graphql.String }),
    providerName: graphql.field({ type: graphql.String }),
    createdAt: graphql.field({ type: graphql.String }),
  },
});

function initialName(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Client";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

/** Approved reviews for the published storefront practice; author shown as first name and initial. */
export const storefrontReviews = graphql.field({
  type: graphql.nonNull(graphql.list(graphql.nonNull(PublicReviewType))),
  args: { serviceId: graphql.arg({ type: graphql.ID }), providerId: graphql.arg({ type: graphql.ID }), take: graphql.arg({ type: graphql.Int }) },
  async resolve(_source, args, context: Context): Promise<ReviewProjection[]> {
    const slug = await storefrontPracticeSlug(context);
    if (!slug) return [];
    const sudo = context.sudo();
    const practice = (await sudo.query.Practice.findMany({ where: { slug: { equals: slug }, isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true } } }, take: 1, query: "id" }))[0];
    if (!practice) return [];
    const take = Math.max(1, Math.min(args.take || 24, 60));
    const where: Record<string, unknown> = { practice: { id: { equals: practice.id } }, isApproved: { equals: true } };
    if (args.serviceId) where.service = { id: { equals: args.serviceId } };
    if (args.providerId) where.provider = { id: { equals: args.providerId } };
    const reviews = await sudo.query.Review.findMany({ where, take, orderBy: { createdAt: "desc" }, query: "id rating comment createdAt client { user { name } } service { name isPublic } provider { isPublic user { name } }" });
    return reviews.map((review: any) => ({
      id: review.id, rating: review.rating, comment: review.comment ? String(review.comment).slice(0, 2000) : null,
      author: initialName(review.client?.user?.name),
      serviceName: review.service?.isPublic ? review.service.name : null,
      providerName: review.provider?.isPublic ? review.provider.user?.name || null : null,
      createdAt: review.createdAt ? new Date(review.createdAt).toISOString() : null,
    }));
  },
});

/** Signed-in clients ask to hear about an opening for a public treatment. */
export const requestWaitlistSpot = graphql.field({
  type: graphql.nonNull(graphql.object<WorkflowResult>()({
    name: "RequestWaitlistSpotResult",
    fields: {
      success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
      recordId: graphql.field({ type: graphql.ID }),
      error: graphql.field({ type: graphql.String }),
    },
  })),
  args: {
    serviceId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    providerId: graphql.arg({ type: graphql.ID }),
    preferredDays: graphql.arg({ type: graphql.list(graphql.nonNull(graphql.String)) }),
    preferredTimeRange: graphql.arg({ type: graphql.String }),
    notes: graphql.arg({ type: graphql.String }),
    idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  async resolve(_source, args, context: Context): Promise<WorkflowResult> {
    try {
      requireActorPractice(context, undefined, "Sign in to join the waitlist");
      const actor = await assertActiveActor(context);
      if (!validIdempotencyKey(args.idempotencyKey)) throw new Error("Request key is invalid");
      const days = [...new Set((args.preferredDays || []).map((day) => day.toLowerCase()))];
      const allowed = new Set(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
      if (days.some((day) => !allowed.has(day))) throw new Error("Preferred days are invalid");
      const timeRange = (args.preferredTimeRange || "").trim();
      const notes = (args.notes || "").trim();
      if (timeRange.length > 120 || notes.length > 1000) throw new Error("Waitlist details are too long");
      const sudo = context.sudo();
      const service = await sudo.query.Service.findOne({ where: { id: args.serviceId }, query: "id status isPublic practice { id }" });
      if (!service || service.practice?.id !== actor.practiceId || service.status !== "active" || service.isPublic !== true) throw new Error("Treatment is unavailable");
      if (args.providerId) {
        const provider = await sudo.query.Provider.findOne({ where: { id: args.providerId }, query: "id status isActive isPublic practice { id }" });
        if (!provider || provider.practice?.id !== actor.practiceId || provider.status !== "active" || provider.isActive !== true || provider.isPublic !== true) throw new Error("Provider is unavailable");
      }
      return await serializableWorkflow(context, "medspa-client-waitlist", [`client-service:${actor.actorId}:${service.id}`, `request:${args.idempotencyKey}`], async (tx) => {
        const txSudo = tx.sudo();
        const open = (await txSudo.query.WaitlistEntry.findMany({
          where: { OR: [{ requestKey: { equals: args.idempotencyKey } }, { client: { id: { equals: actor.actorId } }, service: { id: { equals: service.id } }, isActive: { equals: true } }] },
          take: 1, query: "id",
        }))[0];
        if (open) return { success: true, recordId: open.id, error: null };
        const entry = await txSudo.query.WaitlistEntry.createOne({
          data: {
            practice: { connect: { id: actor.practiceId } }, client: { connect: { id: actor.actorId } }, service: { connect: { id: service.id } },
            preferredProviders: args.providerId ? { connect: [{ id: args.providerId }] } : undefined,
            preferredDays: days, preferredTimeRange: timeRange, notes, requestKey: args.idempotencyKey, status: "active", isActive: true,
          },
          query: "id",
        });
        return { success: true, recordId: entry.id, error: null };
      });
    } catch (error) { return failed(error); }
  },
});

type GuestAppointment = { id: string; status: string; startTime: string; duration: number | null; timezone: string | null; serviceNames: string[]; providerName: string | null; locationName: string | null; price: number | null; cancellable: boolean };

const GuestAppointmentType = graphql.object<GuestAppointment>()({
  name: "StorefrontGuestAppointment",
  fields: {
    id: graphql.field({ type: graphql.nonNull(graphql.ID) }),
    status: graphql.field({ type: graphql.nonNull(graphql.String) }),
    startTime: graphql.field({ type: graphql.nonNull(graphql.String) }),
    duration: graphql.field({ type: graphql.Int }),
    timezone: graphql.field({ type: graphql.String }),
    serviceNames: graphql.field({ type: graphql.nonNull(graphql.list(graphql.nonNull(graphql.String))) }),
    providerName: graphql.field({ type: graphql.String }),
    locationName: graphql.field({ type: graphql.String }),
    price: graphql.field({ type: graphql.Int }),
    cancellable: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
  },
});

const GUEST_FIELDS = "id status startTime duration revision metadata client { id } practice { id } location { id name timezone } provider { user { name } } lineItems { serviceTitle price quantity } payment { id } transaction { id } consentsCount treatmentSessionsCount resourceReservations(where: { status: { in: [reserved, in_use] } }) { id } supervisorReservations(where: { status: { equals: reserved } }) { id }";

async function guestRecord(context: Context, appointmentId: string, token: string) {
  if (!validGuestAccessToken(appointmentId, token)) throw new Error("Appointment not found");
  const appointment = await context.sudo().query.Appointment.findOne({ where: { id: appointmentId }, query: GUEST_FIELDS });
  // Links are issued only for guest requests; a claimed or client-owned visit is managed from the account.
  if (!appointment || appointment.client?.id) throw new Error("Appointment not found");
  return appointment;
}

function guestCancellable(appointment: any) {
  return ["pending", "confirmed"].includes(appointment.status) && new Date(appointment.startTime).getTime() > Date.now()
    && !appointment.payment?.id && !appointment.transaction?.id && !appointment.treatmentSessionsCount && !appointment.consentsCount;
}

/** One visit for the storefront: the signed-in owner's, or a guest's via the confirmation link token. */
export const storefrontAppointment = graphql.field({
  type: GuestAppointmentType,
  args: { appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), token: graphql.arg({ type: graphql.String }) },
  async resolve(_source, args, context: Context): Promise<GuestAppointment | null> {
    try {
      let appointment: any
      if (args.token) appointment = await guestRecord(context, args.appointmentId, args.token)
      else {
        const { appointment: owned } = await ownedAppointment(context, args.appointmentId)
        appointment = await context.sudo().query.Appointment.findOne({ where: { id: owned.id }, query: GUEST_FIELDS })
      }
      if (!appointment) return null
      const lines = appointment.lineItems || []
      return {
        id: appointment.id, status: appointment.status, startTime: new Date(appointment.startTime).toISOString(), duration: appointment.duration ?? null,
        timezone: appointment.location?.timezone || null, serviceNames: lines.map((line: any) => line.serviceTitle).filter(Boolean),
        providerName: appointment.provider?.user?.name || null, locationName: appointment.location?.name || null,
        price: lines.length ? lines.reduce((sum: number, line: any) => sum + Number(line.price || 0) * Number(line.quantity || 1), 0) : null,
        // Signed-in owners cancel from the account's scheduling control; the flag is for guest links.
        cancellable: Boolean(args.token) && guestCancellable(appointment),
      }
    } catch { return null }
  },
});

/** Guest cancellation through the confirmation link: same release rules as a client cancel. */
export const cancelGuestAppointment = graphql.field({
  type: graphql.nonNull(graphql.object<WorkflowResult>()({
    name: "CancelGuestAppointmentResult",
    fields: {
      success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
      recordId: graphql.field({ type: graphql.ID }),
      error: graphql.field({ type: graphql.String }),
    },
  })),
  args: { appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), token: graphql.arg({ type: graphql.nonNull(graphql.String) }), reason: graphql.arg({ type: graphql.String }) },
  async resolve(_source, args, context: Context): Promise<WorkflowResult> {
    try {
      const reason = (args.reason || "").trim().slice(0, 1000) || "Cancelled by guest";
      await guestRecord(context, args.appointmentId, args.token);
      return await serializableWorkflow(context, "medspa-guest-cancel", [`appointment:${args.appointmentId}`], async (tx) => {
        const sudo = tx.sudo();
        const appointment: any = await sudo.query.Appointment.findOne({ where: { id: args.appointmentId }, query: GUEST_FIELDS });
        if (!appointment || appointment.client?.id) throw new Error("Appointment not found");
        if (appointment.status === "cancelled") return { success: true, recordId: appointment.id, error: null };
        if (!guestCancellable(appointment)) throw new Error("This appointment can't be cancelled online; contact the practice");
        const now = new Date().toISOString();
        const metadata = appointment.metadata && typeof appointment.metadata === "object" ? appointment.metadata : {};
        const history = Array.isArray(metadata.transitionHistory) ? metadata.transitionHistory.slice(-49) : [];
        await sudo.query.Appointment.updateOne({
          where: { id: appointment.id },
          data: {
            status: "cancelled", cancelledAt: now, cancellationReason: reason, revision: Number(appointment.revision || 1) + 1,
            metadata: { ...metadata, transitionHistory: [...history, { from: appointment.status, to: "cancelled", reason, actorId: null, actor: "guest_link", at: now }] },
          },
          query: "id",
        });
        for (const reservation of appointment.resourceReservations || []) await sudo.query.AppointmentResourceReservation.updateOne({ where: { id: reservation.id }, data: { status: "cancelled" }, query: "id" });
        for (const reservation of appointment.supervisorReservations || []) await sudo.query.AppointmentSupervisorReservation.updateOne({ where: { id: reservation.id }, data: { status: "cancelled" }, query: "id" });
        await sudo.query.AuditEvent.createOne({ data: { practice: { connect: { id: appointment.practice.id } }, location: appointment.location?.id ? { connect: { id: appointment.location.id } } : undefined, action: "appointment.guest_cancelled", resourceType: "Appointment", resourceId: appointment.id, correlationId: `guest-cancel:${appointment.id}`, evidence: { fromStatus: appointment.status, reason }, evidenceHash: evidenceHash({ appointmentId: appointment.id, fromStatus: appointment.status, reason, at: now }), occurredAt: now }, query: "id" });
        return { success: true, recordId: appointment.id, error: null };
      });
    } catch (error) { return failed(error); }
  },
});
