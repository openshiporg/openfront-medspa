export const PRACTICE_OWNED_ONBOARDING_LISTS = [
  "Appointment",
  "Location",
  "Resource",
  "ServiceCategory",
  "MedSpaImage",
  "Service",
  "StorefrontSetting",
  "Provider",
  "ProviderSchedule",
  "PracticeMembership",
  "Client",
  "IntakeForm",
  "FormTemplate",
  "Membership",
  "ServicePackage",
  "Product",
  "MessageTemplate",
  "PaymentProvider",
  "User",
] as const;

const practiceOwnedLists = new Set<string>(PRACTICE_OWNED_ONBOARDING_LISTS);

export function hasAuthoritativeOnboardingPractice(list: string): boolean {
  return practiceOwnedLists.has(list);
}

type ReadMany = (args: any) => Promise<unknown>;
type CreateOne = (args: any) => Promise<unknown>;
type UpdateOne = (args: any) => Promise<unknown>;

function selectionWithPractice(query: string): string {
  return /\bpractice\s*\{/.test(query) ? query : `${query} practice { id }`;
}

export async function guardedOnboardingPracticeCreate({
  list,
  practiceId,
  data,
  query,
  create,
}: {
  list: string;
  practiceId: string | null | undefined;
  data: Record<string, any>;
  query: string;
  create: CreateOne;
}): Promise<any> {
  if (typeof practiceId !== "string" || !practiceId.trim()) {
    throw new Error(`Onboarding cannot create ${list} without an established practice`);
  }
  if (!practiceOwnedLists.has(list)) {
    throw new Error(`Onboarding cannot create ${list}: authoritative direct practice ownership is not configured`);
  }
  if (Object.prototype.hasOwnProperty.call(data, "practice")) {
    const relation = data.practice;
    const requestedPracticeId = relation?.connect?.id;
    const relationKeys = relation && typeof relation === "object" ? Object.keys(relation) : [];
    if (requestedPracticeId !== practiceId || relationKeys.length !== 1 || relationKeys[0] !== "connect") {
      throw new Error(`Onboarding ${list} create cannot change practice ownership`);
    }
  }

  const created = await create({
    data: { ...data, practice: { connect: { id: practiceId } } },
    query: selectionWithPractice(query),
  });
  const result = created as { id?: unknown; practice?: { id?: unknown } | null } | null;
  if (!result || typeof result.id !== "string" || !result.id || result.practice?.id !== practiceId) {
    throw new Error(`Onboarding ${list} create did not retain its practice ownership`);
  }
  return created;
}

export async function guardedOnboardingPracticeUpdate({
  list,
  id,
  practiceId,
  data,
  query,
  read,
  update,
}: {
  list: string;
  id: string;
  practiceId: string | null | undefined;
  data: Record<string, any>;
  query: string;
  read: ReadMany;
  update: UpdateOne;
}): Promise<any> {
  if (typeof practiceId !== "string" || !practiceId.trim()) {
    throw new Error(`Onboarding cannot update ${list} without an established practice`);
  }
  if (!practiceOwnedLists.has(list)) {
    throw new Error(`Onboarding cannot update ${list}: authoritative direct practice ownership is not configured`);
  }
  if (typeof id !== "string" || !id) {
    throw new Error(`Onboarding cannot update ${list} with a missing record identity`);
  }

  const rows = await read({
    where: {
      AND: [
        { id: { equals: id } },
        { practice: { id: { equals: practiceId } } },
      ],
    },
    take: 2,
    query: "id practice { id }",
  });
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(`Onboarding ${list} update target is stale, missing, or outside the established practice`);
  }
  const current = rows[0] as { id?: unknown; practice?: { id?: unknown } | null } | null;
  if (!current || current.id !== id || current.practice?.id !== practiceId) {
    throw new Error(`Onboarding ${list} update target failed its practice recheck`);
  }

  if (Object.prototype.hasOwnProperty.call(data, "practice")) {
    const requestedPracticeId = data.practice?.connect?.id;
    if (requestedPracticeId !== practiceId || data.practice?.disconnect) {
      throw new Error(`Onboarding ${list} update cannot change practice ownership`);
    }
  }

  const selection = /\bpractice\s*\{/.test(query) ? query : `${query} practice { id }`;
  const updated = await update({
    where: { id },
    data: { ...data, practice: { connect: { id: practiceId } } },
    query: selection,
  });
  const result = updated as { id?: unknown; practice?: { id?: unknown } | null } | null;
  if (!result || result.id !== id || result.practice?.id !== practiceId) {
    throw new Error(`Onboarding ${list} update did not retain its practice ownership`);
  }
  return updated;
}

export function assertOnboardingLocationPractice(
  location: unknown,
  practiceId: string | null | undefined,
  expectedLocationId?: string | null,
): asserts location is { id: string; practice: { id: string } } {
  if (typeof practiceId !== "string" || !practiceId.trim()) {
    throw new Error("Onboarding primary location check requires an established practice");
  }
  if (!location || typeof location !== "object" || Array.isArray(location)) {
    throw new Error("Onboarding primary location is missing or outside the established practice");
  }
  const candidate = location as { id?: unknown; practice?: { id?: unknown } | null };
  if (
    typeof candidate.id !== "string" || !candidate.id
    || (expectedLocationId && candidate.id !== expectedLocationId)
    || candidate.practice?.id !== practiceId
  ) {
    throw new Error("Onboarding primary location is stale or outside the established practice");
  }
}
