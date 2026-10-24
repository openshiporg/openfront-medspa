import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import { permissions } from "../access";
import { assertActiveActor, evidenceHash, requireActorPractice, validIdempotencyKey } from "../workflowAuth";

/*
 * Client relationship workflows: the front-desk client directory, one client
 * record, profile edits, and review moderation. Client, User and Review are
 * write-locked lists, so these are the only dashboard write paths for them.
 */

type WorkflowResult = { success: boolean; recordId: string | null; error: string | null };

const resultType = graphql.object<WorkflowResult>()({
  name: "ClientRelationshipWorkflowResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    recordId: graphql.field({ type: graphql.ID }),
    error: graphql.field({ type: graphql.String }),
  },
});

const failure = (error: unknown): WorkflowResult => ({ success: false, recordId: null, error: error instanceof Error ? error.message : "Request failed" });

const canReadClientRecords = ({ session }: { session?: any }) =>
  permissions.canReadClients({ session }) || permissions.canSchedule({ session }) || permissions.canManageClinical({ session });

const DIRECTORY_FILTERS = ["all", "upcoming", "followup", "marketing"] as const;
const PAGE_SIZE = 50;

function text(value: unknown, max: number, label: string): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed.length > max) throw new Error(`${label} is too long`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(trimmed)) throw new Error(`${label} contains invalid characters`);
  return trimmed;
}

async function dueFollowUpClientIds(sudo: ReturnType<Context["sudo"]>, practiceId: string) {
  const tasks = await sudo.query.FollowUpTask.findMany({
    where: { practice: { id: { equals: practiceId } }, status: { in: ["open", "in_progress"] }, dueAt: { lte: new Date().toISOString() } },
    take: 1000,
    query: "client { id }",
  });
  return [...new Set(tasks.map((task: any) => task.client?.id).filter(Boolean))] as string[];
}

export const medspaClientDirectory = graphql.field({
  type: graphql.JSON,
  args: {
    search: graphql.arg({ type: graphql.String }),
    filter: graphql.arg({ type: graphql.String }),
    page: graphql.arg({ type: graphql.Int }),
  },
  async resolve(_source, args, context: Context) {
    const actor = requireActorPractice(context, canReadClientRecords, "Client access is not authorized");
    await assertActiveActor(context);
    const sudo = context.sudo();
    const filter = DIRECTORY_FILTERS.includes(args.filter as any) ? args.filter as typeof DIRECTORY_FILTERS[number] : "all";
    const page = Math.max(0, Math.min(Math.trunc(args.page || 0), 1000));
    const search = (args.search || "").trim().slice(0, 100);
    const now = new Date().toISOString();

    const conditions: any[] = [{ practice: { id: { equals: actor.practiceId } } }];
    if (search) {
      conditions.push({ OR: [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { phone: { contains: search } } },
      ] });
    }
    if (filter === "upcoming") conditions.push({ appointments: { some: { startTime: { gte: now }, status: { in: ["pending", "confirmed"] } } } });
    if (filter === "marketing") conditions.push({ marketingConsent: { equals: true } });
    const dueIds = await dueFollowUpClientIds(sudo, actor.practiceId);
    if (filter === "followup") conditions.push({ id: { in: dueIds } });
    const where = { AND: conditions };

    const [items, total] = await Promise.all([
      sudo.query.Client.findMany({
        where, take: PAGE_SIZE, skip: page * PAGE_SIZE, orderBy: [{ updatedAt: "desc" }],
        query: `id totalVisits lifetimeValue lastVisit marketingConsent
          user { id name email phone }
          preferredProvider { user { name } }
          homeLocation { timezone }
          appointments(where: { startTime: { gte: "${now}" }, status: { in: [pending, confirmed] } }, orderBy: { startTime: asc }, take: 1) { id startTime location { timezone } }`,
      }),
      sudo.query.Client.count({ where }),
    ]);
    const due = new Set(dueIds);
    return {
      total,
      page,
      pageSize: PAGE_SIZE,
      items: items.map((item: any) => ({
        id: item.id,
        userId: item.user?.id || null,
        name: item.user?.name || null,
        email: item.user?.email || null,
        phone: item.user?.phone || null,
        lastVisit: item.lastVisit || null,
        totalVisits: item.totalVisits || 0,
        lifetimeValue: item.lifetimeValue || 0,
        marketingConsent: item.marketingConsent === true,
        preferredProvider: item.preferredProvider?.user?.name || null,
        nextAppointment: item.appointments?.[0] ? { id: item.appointments[0].id, startTime: item.appointments[0].startTime } : null,
        timezone: item.appointments?.[0]?.location?.timezone || item.homeLocation?.timezone || null,
        followUpDue: due.has(item.id),
      })),
    };
  },
});

export const medspaClientRecord = graphql.field({
  type: graphql.JSON,
  args: { clientId: graphql.arg({ type: graphql.nonNull(graphql.ID) }) },
  async resolve(_source, args, context: Context) {
    const actor = requireActorPractice(context, canReadClientRecords, "Client access is not authorized");
    const { role } = await assertActiveActor(context);
    const sudo = context.sudo();
    const client = await sudo.query.Client.findOne({
      where: { id: args.clientId },
      query: `id practice { id } dateOfBirth contactPreferences operationalNotes firstVisit lastVisit totalVisits lifetimeValue marketingConsent photoMarketingConsent createdAt
        user { id name email phone }
        homeLocation { id name }
        preferredProvider { id user { name } }`,
    });
    if (!client || client.practice?.id !== actor.practiceId) return null;
    const userId = client.user?.id || null;
    const scoped = (extra: Record<string, unknown>) => ({ AND: [{ practice: { id: { equals: actor.practiceId } } }, extra] });
    const finance = (role as any).canManageFinance === true || (role as any).canSchedule === true;
    const giftCards = (role as any).canManageFinance === true;
    const clinical = (role as any).canManageClinical === true;

    const [appointments, followUps, waitlist, packages, memberships, cards, notes] = await Promise.all([
      sudo.query.Appointment.findMany({
        where: scoped({ client: { id: { equals: client.id } } }), take: 100, orderBy: { startTime: "desc" },
        query: "id startTime status duration provider { user { name } } location { name timezone } lineItems { serviceTitle price quantity }",
      }),
      sudo.query.FollowUpTask.findMany({
        where: scoped({ client: { id: { equals: client.id } } }), take: 50, orderBy: { dueAt: "desc" },
        query: "id title status dueAt completedAt assignedTo { name }",
      }),
      userId ? sudo.query.WaitlistEntry.findMany({
        where: scoped({ client: { id: { equals: userId } } }), take: 50, orderBy: { createdAt: "desc" },
        query: "id status createdAt preferredTimeRange service { name }",
      }) : Promise.resolve([]),
      finance && userId ? sudo.query.ClientPackage.findMany({
        where: scoped({ client: { id: { equals: userId } } }), take: 50, orderBy: { purchasedAt: "desc" },
        query: "id status purchasedAt expiresAt totalValue usedValue package { name }",
      }) : Promise.resolve(null),
      finance && userId ? sudo.query.ClientMembership.findMany({
        where: scoped({ client: { id: { equals: userId } } }), take: 50,
        query: "id status startDate nextBillingDate pausedUntil membership { name monthlyPrice }",
      }) : Promise.resolve(null),
      giftCards && userId ? sudo.query.GiftCard.findMany({
        where: scoped({ purchasedBy: { id: { equals: userId } } }), take: 50,
        query: "id code currentBalance initialValue isActive expiresAt recipientName",
      }) : Promise.resolve(null),
      clinical ? sudo.query.ClientNote.findMany({
        where: scoped({ client: { id: { equals: client.id } }, supersededBy: null }), take: 50, orderBy: { createdAt: "desc" },
        query: "id type content signedAt createdAt author { name }",
      }) : Promise.resolve(null),
    ]);

    return {
      client: {
        id: client.id,
        name: client.user?.name || null,
        email: client.user?.email || null,
        phone: client.user?.phone || null,
        dateOfBirth: client.dateOfBirth || null,
        contactPreferences: client.contactPreferences || "",
        operationalNotes: client.operationalNotes || "",
        firstVisit: client.firstVisit || null,
        lastVisit: client.lastVisit || null,
        totalVisits: client.totalVisits || 0,
        lifetimeValue: client.lifetimeValue || 0,
        marketingConsent: client.marketingConsent === true,
        createdAt: client.createdAt || null,
        homeLocation: client.homeLocation || null,
        preferredProvider: client.preferredProvider ? { id: client.preferredProvider.id, name: client.preferredProvider.user?.name || null } : null,
      },
      appointments: appointments.map((item: any) => ({
        id: item.id, startTime: item.startTime, status: item.status, duration: item.duration,
        provider: item.provider?.user?.name || null, location: item.location?.name || null, timezone: item.location?.timezone || null,
        treatments: (item.lineItems || []).map((line: any) => line.serviceTitle).filter(Boolean),
        total: (item.lineItems || []).reduce((sum: number, line: any) => sum + (line.price || 0) * (line.quantity ?? 1), 0),
      })),
      followUps: followUps.map((item: any) => ({ id: item.id, title: item.title, status: item.status, dueAt: item.dueAt, completedAt: item.completedAt || null, assignedTo: item.assignedTo?.name || null })),
      waitlist: (waitlist as any[]).map((item: any) => ({ id: item.id, status: item.status, createdAt: item.createdAt, preferredTimeRange: item.preferredTimeRange || null, service: item.service?.name || null })),
      packages: packages ? (packages as any[]).map((item: any) => ({ id: item.id, name: item.package?.name || null, status: item.status, purchasedAt: item.purchasedAt || null, expiresAt: item.expiresAt || null, remaining: Math.max(0, (item.totalValue || 0) - (item.usedValue || 0)) })) : null,
      memberships: memberships ? (memberships as any[]).map((item: any) => ({ id: item.id, name: item.membership?.name || null, status: item.status, monthlyPrice: item.membership?.monthlyPrice ?? null, startDate: item.startDate || null, nextBillingDate: item.nextBillingDate || null, pausedUntil: item.pausedUntil || null })) : null,
      giftCards: cards ? (cards as any[]).map((item: any) => ({ id: item.id, code: item.code ? `•••• ${String(item.code).slice(-4)}` : null, balance: item.currentBalance || 0, initialValue: item.initialValue || 0, isActive: item.isActive === true, expiresAt: item.expiresAt || null, recipientName: item.recipientName || null })) : null,
      notes: notes ? (notes as any[]).map((item: any) => ({ id: item.id, type: item.type || null, content: item.content || "", signedAt: item.signedAt || null, createdAt: item.createdAt, author: item.author?.name || null })) : null,
    };
  },
});

export const updateClientProfile = graphql.field({
  type: graphql.nonNull(resultType),
  args: {
    clientId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    name: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    phone: graphql.arg({ type: graphql.String }),
    dateOfBirth: graphql.arg({ type: graphql.String }),
    contactPreferences: graphql.arg({ type: graphql.String }),
    operationalNotes: graphql.arg({ type: graphql.String }),
    preferredProviderId: graphql.arg({ type: graphql.ID }),
    homeLocationId: graphql.arg({ type: graphql.ID }),
    marketingConsent: graphql.arg({ type: graphql.nonNull(graphql.Boolean) }),
    idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  async resolve(_source, args, context: Context): Promise<WorkflowResult> {
    try {
      const actor = requireActorPractice(context, permissions.canReadClients, "Client profile access is not authorized");
      await assertActiveActor(context);
      if (!validIdempotencyKey(args.idempotencyKey)) throw new Error("Request key is invalid");
      const name = text(args.name, 120, "Name");
      if (!name) throw new Error("Name is required");
      const phone = text(args.phone, 40, "Phone") || "";
      const contactPreferences = text(args.contactPreferences, 500, "Contact preferences") || "";
      const operationalNotes = text(args.operationalNotes, 2000, "Notes") || "";
      let dateOfBirth: string | null = null;
      if (args.dateOfBirth) {
        const parsed = new Date(args.dateOfBirth);
        if (Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now() || parsed.getFullYear() < 1900) throw new Error("Date of birth is invalid");
        dateOfBirth = parsed.toISOString();
      }

      const sudo = context.sudo();
      const client = await sudo.query.Client.findOne({
        where: { id: args.clientId },
        query: "id practice { id } user { id practice { id } providerProfile { id } role { id } }",
      });
      if (!client || client.practice?.id !== actor.practiceId) throw new Error("Client not found");
      const user = client.user;
      // Staff identities are managed through the staff workflows, never from a client record.
      if (user && (user.providerProfile?.id || user.role?.id || (user.practice?.id && user.practice.id !== actor.practiceId))) {
        throw new Error("This client is linked to a staff account; edit it from Staff");
      }
      const [provider, location] = await Promise.all([
        args.preferredProviderId ? sudo.query.Provider.findOne({ where: { id: args.preferredProviderId }, query: "id practice { id }" }) : Promise.resolve(null),
        args.homeLocationId ? sudo.query.Location.findOne({ where: { id: args.homeLocationId }, query: "id practice { id } isActive" }) : Promise.resolve(null),
      ]);
      if (args.preferredProviderId && provider?.practice?.id !== actor.practiceId) throw new Error("Preferred provider not found");
      if (args.homeLocationId && (location?.practice?.id !== actor.practiceId || location?.isActive !== true)) throw new Error("Home location not found");

      return await context.transaction(async (tx: Context) => {
        const txSudo = tx.sudo();
        await txSudo.query.Client.updateOne({
          where: { id: client.id },
          data: {
            dateOfBirth, contactPreferences, operationalNotes, marketingConsent: args.marketingConsent,
            preferredProvider: args.preferredProviderId ? { connect: { id: args.preferredProviderId } } : { disconnect: true },
            homeLocation: args.homeLocationId ? { connect: { id: args.homeLocationId } } : { disconnect: true },
          },
          query: "id",
        });
        if (user?.id) await txSudo.query.User.updateOne({ where: { id: user.id }, data: { name, phone }, query: "id" });
        const evidence = { clientId: client.id, fields: ["name", "phone", "dateOfBirth", "contactPreferences", "operationalNotes", "preferredProvider", "homeLocation", "marketingConsent"], marketingConsent: args.marketingConsent };
        await txSudo.query.AuditEvent.createOne({
          data: {
            practice: { connect: { id: actor.practiceId } }, actor: { connect: { id: actor.actorId } },
            action: "client.profile_updated.v1", resourceType: "Client", resourceId: client.id,
            correlationId: args.idempotencyKey, evidence, evidenceHash: evidenceHash(evidence), occurredAt: new Date().toISOString(),
          },
          query: "id",
        });
        return { success: true, recordId: client.id, error: null };
      });
    } catch (error) {
      return failure(error);
    }
  },
});

export const moderateReview = graphql.field({
  type: graphql.nonNull(resultType),
  args: {
    reviewId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    isApproved: graphql.arg({ type: graphql.nonNull(graphql.Boolean) }),
    idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  async resolve(_source, args, context: Context): Promise<WorkflowResult> {
    try {
      const actor = requireActorPractice(
        context,
        ({ session }) => permissions.canManageCommunications({ session }) || permissions.canManagePractice({ session }),
        "Review moderation is not authorized",
      );
      await assertActiveActor(context);
      if (!validIdempotencyKey(args.idempotencyKey)) throw new Error("Request key is invalid");
      const sudo = context.sudo();
      const review = await sudo.query.Review.findOne({ where: { id: args.reviewId }, query: "id isApproved practice { id }" });
      if (!review || review.practice?.id !== actor.practiceId) throw new Error("Review not found");
      if (review.isApproved === args.isApproved) return { success: true, recordId: review.id, error: null };
      return await context.transaction(async (tx: Context) => {
        const txSudo = tx.sudo();
        await txSudo.query.Review.updateOne({ where: { id: review.id }, data: { isApproved: args.isApproved }, query: "id" });
        const evidence = { reviewId: review.id, from: review.isApproved === true, to: args.isApproved };
        await txSudo.query.AuditEvent.createOne({
          data: {
            practice: { connect: { id: actor.practiceId } }, actor: { connect: { id: actor.actorId } },
            action: args.isApproved ? "review.approved.v1" : "review.hidden.v1", resourceType: "Review", resourceId: review.id,
            correlationId: args.idempotencyKey, evidence, evidenceHash: evidenceHash(evidence), occurredAt: new Date().toISOString(),
          },
          query: "id",
        });
        return { success: true, recordId: review.id, error: null };
      });
    } catch (error) {
      return failure(error);
    }
  },
});

const WAITLIST_STATUSES = ["active", "notified", "converted", "removed"] as const;

/** Waitlist board for schedulers: names resolve even for roles without people access. */
export const medspaWaitlistBoard = graphql.field({
  type: graphql.JSON,
  args: { status: graphql.arg({ type: graphql.String }) },
  async resolve(_source, args, context: Context) {
    const actor = requireActorPractice(context, permissions.canSchedule, "Waitlist access is not authorized");
    await assertActiveActor(context);
    const sudo = context.sudo();
    const status = WAITLIST_STATUSES.includes(args.status as any) ? args.status as typeof WAITLIST_STATUSES[number] : "active";
    const scoped = (extra?: Record<string, unknown>) => ({ AND: [{ practice: { id: { equals: actor.practiceId } } }, ...(extra ? [extra] : [])] });
    const [entries, ...counts] = await Promise.all([
      sudo.query.WaitlistEntry.findMany({
        where: scoped({ status: { equals: status } }), take: 200, orderBy: { createdAt: status === "active" ? "asc" : "desc" },
        query: `id status guestName guestPhone preferredDays preferredTimeRange dateRangeStart dateRangeEnd notes createdAt notifiedAt transitionedAt
          client { id name email phone clientProfile { id } }
          service { id name }
          preferredProviders { id user { name } }
          convertedAppointment { id startTime }`,
      }),
      ...WAITLIST_STATUSES.map((value) => sudo.query.WaitlistEntry.count({ where: scoped({ status: { equals: value } }) })),
    ]);
    return {
      status,
      counts: Object.fromEntries(WAITLIST_STATUSES.map((value, index) => [value, counts[index]])),
      entries: entries.map((entry: any) => ({
        id: entry.id,
        status: entry.status,
        name: entry.client?.name || entry.guestName || null,
        phone: entry.client?.phone || entry.guestPhone || null,
        email: entry.client?.email || null,
        clientRecordId: entry.client?.clientProfile?.id || null,
        isGuest: !entry.client,
        service: entry.service ? { id: entry.service.id, name: entry.service.name } : null,
        providers: (entry.preferredProviders || []).map((provider: any) => provider.user?.name).filter(Boolean),
        preferredDays: Array.isArray(entry.preferredDays) ? entry.preferredDays : [],
        preferredTimeRange: entry.preferredTimeRange || null,
        dateRangeStart: entry.dateRangeStart || null,
        dateRangeEnd: entry.dateRangeEnd || null,
        notes: entry.notes || null,
        createdAt: entry.createdAt,
        notifiedAt: entry.notifiedAt || null,
        convertedAppointment: entry.convertedAppointment || null,
      })),
    };
  },
});

const MESSAGE_STATUSES = ["all", "sent", "delivered", "failed"] as const;

/** Sent-message log for communications staff, newest first. */
export const medspaMessageLog = graphql.field({
  type: graphql.JSON,
  args: { status: graphql.arg({ type: graphql.String }), page: graphql.arg({ type: graphql.Int }) },
  async resolve(_source, args, context: Context) {
    const actor = requireActorPractice(context, permissions.canManageCommunications, "Message log access is not authorized");
    await assertActiveActor(context);
    const sudo = context.sudo();
    const status = MESSAGE_STATUSES.includes(args.status as any) ? args.status as typeof MESSAGE_STATUSES[number] : "all";
    const page = Math.max(0, Math.min(Math.trunc(args.page || 0), 1000));
    const where = { AND: [{ practice: { id: { equals: actor.practiceId } } }, ...(status === "all" ? [] : [{ status: { equals: status } }])] };
    const [items, total, failed] = await Promise.all([
      sudo.query.MessageLog.findMany({
        where, take: PAGE_SIZE, skip: page * PAGE_SIZE, orderBy: { sentAt: "desc" },
        query: "id channel status sentAt errorMessage recipient { name email clientProfile { id } } template { id name type }",
      }),
      sudo.query.MessageLog.count({ where }),
      sudo.query.MessageLog.count({ where: { AND: [{ practice: { id: { equals: actor.practiceId } } }, { status: { equals: "failed" } }] } }),
    ]);
    return {
      status, page, pageSize: PAGE_SIZE, total, failed,
      items: items.map((item: any) => ({
        id: item.id, channel: item.channel, status: item.status, sentAt: item.sentAt || null, error: item.errorMessage || null,
        recipient: item.recipient?.name || item.recipient?.email || null, clientRecordId: item.recipient?.clientProfile?.id || null,
        template: item.template ? { id: item.template.id, name: item.template.name, type: item.template.type } : null,
      })),
    };
  },
});

const REVIEW_FILTERS = ["pending", "approved", "all"] as const;

/** Review moderation queue with rating summary. */
export const medspaReviewBoard = graphql.field({
  type: graphql.JSON,
  args: { filter: graphql.arg({ type: graphql.String }), page: graphql.arg({ type: graphql.Int }) },
  async resolve(_source, args, context: Context) {
    const actor = requireActorPractice(
      context,
      ({ session }) => permissions.canManageCommunications({ session }) || permissions.canManagePractice({ session }),
      "Review access is not authorized",
    );
    await assertActiveActor(context);
    const sudo = context.sudo();
    const filter = REVIEW_FILTERS.includes(args.filter as any) ? args.filter as typeof REVIEW_FILTERS[number] : "pending";
    const page = Math.max(0, Math.min(Math.trunc(args.page || 0), 1000));
    const practice = { practice: { id: { equals: actor.practiceId } } };
    const where = filter === "all" ? practice : { AND: [practice, { isApproved: { equals: filter === "approved" } }] };
    const [items, total, pending, approved, ratings] = await Promise.all([
      sudo.query.Review.findMany({
        where, take: PAGE_SIZE, skip: page * PAGE_SIZE, orderBy: { createdAt: "desc" },
        query: "id rating comment isApproved createdAt client { id user { name } } service { id name } provider { id user { name } } appointment { id startTime }",
      }),
      sudo.query.Review.count({ where }),
      sudo.query.Review.count({ where: { AND: [practice, { isApproved: { equals: false } }] } }),
      sudo.query.Review.count({ where: { AND: [practice, { isApproved: { equals: true } }] } }),
      sudo.query.Review.findMany({ where: { AND: [practice, { isApproved: { equals: true } }] }, take: 1000, query: "rating" }),
    ]);
    const average = ratings.length ? ratings.reduce((sum: number, item: any) => sum + Number(item.rating || 0), 0) / ratings.length : null;
    return {
      filter, page, pageSize: PAGE_SIZE, total,
      counts: { pending, approved, all: pending + approved },
      averageRating: average === null ? null : Math.round(average * 10) / 10,
      items: items.map((item: any) => ({
        id: item.id, rating: item.rating, comment: item.comment || "", isApproved: item.isApproved === true, createdAt: item.createdAt,
        client: item.client ? { id: item.client.id, name: item.client.user?.name || null } : null,
        service: item.service ? { id: item.service.id, name: item.service.name } : null,
        provider: item.provider ? { id: item.provider.id, name: item.provider.user?.name || null } : null,
        appointment: item.appointment ? { id: item.appointment.id, startTime: item.appointment.startTime } : null,
      })),
    };
  },
});
