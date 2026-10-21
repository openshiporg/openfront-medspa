export const ONBOARDING_IMAGE_LOOKUP_LIMIT = 500;
export const ONBOARDING_IMAGE_LOOKUP_TAKE = ONBOARDING_IMAGE_LOOKUP_LIMIT + 1;

export type ImageCandidateLookup =
  | { status: "ready"; ids: string[] }
  | { status: "overflow"; limit: number };

export type ImageMatchLookup =
  | { status: "found"; id: string }
  | { status: "missing" }
  | { status: "ambiguous" }
  | { status: "path-conflict" };

type FindMany = (args: any) => Promise<unknown>;

function requirePracticeId(practiceId: string | null | undefined): string {
  if (typeof practiceId !== "string" || !practiceId.trim()) {
    throw new Error("Onboarding image lookup requires an established practice scope");
  }
  return practiceId;
}

function validateCandidates(candidateIds: string[]): Set<string> {
  if (candidateIds.length > ONBOARDING_IMAGE_LOOKUP_LIMIT) {
    throw new Error("Onboarding image candidate set exceeded its safe bound");
  }
  const ids = new Set<string>();
  for (const id of candidateIds) {
    if (typeof id !== "string" || !id || ids.has(id)) {
      throw new Error("Onboarding image candidate set is malformed");
    }
    ids.add(id);
  }
  return ids;
}

export async function loadScopedOnboardingImageIds(
  practiceId: string | null | undefined,
  findMany: FindMany,
): Promise<ImageCandidateLookup> {
  const scopedPracticeId = requirePracticeId(practiceId);
  const rows = await findMany({
    where: { practice: { id: { equals: scopedPracticeId } } },
    take: ONBOARDING_IMAGE_LOOKUP_TAKE,
    orderBy: { id: "asc" },
    query: "id practice { id }",
  });

  if (!Array.isArray(rows)) throw new Error("Onboarding image lookup returned an invalid result");
  if (rows.length > ONBOARDING_IMAGE_LOOKUP_LIMIT) {
    return { status: "overflow", limit: ONBOARDING_IMAGE_LOOKUP_LIMIT };
  }

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("Onboarding image lookup returned a malformed row");
    }
    const image = row as { id?: unknown; practice?: { id?: unknown } | null };
    if (
      typeof image.id !== "string" || !image.id || seen.has(image.id)
      || image.practice?.id !== scopedPracticeId
    ) {
      throw new Error("Onboarding image lookup returned a row outside its practice scope");
    }
    seen.add(image.id);
    ids.push(image.id);
  }

  return { status: "ready", ids };
}

// Prisma's JSON-path filter is used only after Keystone has returned a bounded,
// tenant-scoped ID set. The projection excludes metadata so arbitrary JSON is not
// copied into application memory during seed-key resolution.
async function findScopedImage(
  practiceId: string,
  candidateIds: string[],
  findMany: FindMany,
  predicate: Record<string, unknown>,
): Promise<ImageMatchLookup> {
  const scopedPracticeId = requirePracticeId(practiceId);
  const candidateSet = validateCandidates(candidateIds);
  if (!candidateSet.size) return { status: "missing" };

  const rows = await findMany({
    where: {
      id: { in: [...candidateSet] },
      practiceId: scopedPracticeId,
      ...predicate,
    },
    take: 2,
    orderBy: { id: "asc" },
    select: { id: true, practiceId: true },
  });
  if (!Array.isArray(rows)) throw new Error("Onboarding image identity lookup returned an invalid result");
  if (rows.length > 1) return { status: "ambiguous" };
  if (!rows.length) return { status: "missing" };

  const row = rows[0] as { id?: unknown; practiceId?: unknown } | null;
  if (
    !row || typeof row.id !== "string" || !candidateSet.has(row.id)
    || row.practiceId !== scopedPracticeId
  ) {
    throw new Error("Onboarding image identity lookup escaped its practice scope");
  }
  return { status: "found", id: row.id };
}

export async function resolveScopedOnboardingImage(
  practiceId: string | null | undefined,
  candidateIds: string[],
  seedKey: string | null,
  imagePath: string,
  findMany: FindMany,
): Promise<ImageMatchLookup> {
  const scopedPracticeId = requirePracticeId(practiceId);
  if (typeof imagePath !== "string" || !imagePath) {
    throw new Error("Onboarding image path is invalid");
  }
  if (seedKey !== null && (typeof seedKey !== "string" || !seedKey.trim() || seedKey.length > 256)) {
    throw new Error("Onboarding image seed key is invalid or exceeds the safe bound");
  }

  if (seedKey) {
    const seeded = await findScopedImage(
      scopedPracticeId,
      candidateIds,
      findMany,
      { metadata: { path: ["seedKey"], equals: seedKey } },
    );
    if (seeded.status !== "missing") return seeded;
  }

  const samePath = await findScopedImage(
    scopedPracticeId,
    candidateIds,
    findMany,
    { imagePath },
  );
  if (samePath.status === "found" && seedKey) return { status: "path-conflict" };
  return samePath;
}
