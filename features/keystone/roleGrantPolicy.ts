export const capabilityKeys = [
  "canManagePeople",
  "canManageRoles",
  "canAccessDashboard",
  "canManageOnboarding",
  "canManagePractice",
  "canSchedule",
  "canReadClients",
  "canManageClinical",
  "canManageSensitiveRecords",
  "canManageInventory",
  "canManageFinance",
  "canManageCommunications",
  "canViewReports",
  "canManageIntegrations",
] as const;

export type CapabilityKey = typeof capabilityKeys[number];
export type CapabilitySet = Partial<Record<CapabilityKey, boolean | null | undefined>>;

/** A role manager may delegate only capabilities they personally hold. */
export function capabilitiesWithinGrantAuthority(
  requested: CapabilitySet,
  actor: CapabilitySet | null | undefined,
): boolean {
  if (!actor) return false;
  const ownerGated = new Set<CapabilityKey>([
    "canManageRoles",
    "canManagePractice",
    "canManageClinical",
    "canManageSensitiveRecords",
    "canManageFinance",
    "canManageIntegrations",
  ]);
  return capabilityKeys.every((key) => {
    if (requested[key] !== true) return true;
    if (actor[key] !== true) return false;
    return !ownerGated.has(key) || actor.canManagePractice === true;
  });
}

export function hasRoleAssignmentChange(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  return Object.prototype.hasOwnProperty.call(data, "role");
}
