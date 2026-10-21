type Target = { id?: string | null; practice?: { id?: string | null } | null; client?: { id?: string | null } | null; incident?: { id?: string | null } | null };
type LegalHoldTarget = {
  id?: string | null;
  status?: string | null;
  placedAt?: string | Date | null;
  releasedAt?: string | Date | null;
  releaseEvidenceHash?: string | null;
  releaseReason?: string | null;
  releaseAuthorityReference?: string | null;
  releasedBy?: { id?: string | null } | null;
  practice?: { id?: string | null } | null;
  client?: { id?: string | null } | null;
  asset?: { id?: string | null } | null;
  incident?: { id?: string | null } | null;
};

export const LEGAL_HOLD_LOCK_NAMESPACE = "medspa-effective-legal-hold";

export function legalHoldAppliesToAsset(hold: LegalHoldTarget, asset: Target, at = new Date()) {
  if (!asset.id || !asset.practice?.id || hold.practice?.id !== asset.practice.id) return false;
  const matchesAsset = hold.asset?.id === asset.id
    || Boolean(asset.client?.id && hold.client?.id === asset.client.id)
    || Boolean(asset.incident?.id && hold.incident?.id === asset.incident.id);
  if (!matchesAsset) return false;

  // Only an explicitly evidenced, completed release clears a hold. Missing or
  // unexpected states remain protective until an owner can reconcile them.
  if (hold.status !== "released") return true;
  const placedAt = hold.placedAt ? new Date(hold.placedAt).getTime() : NaN;
  const releasedAt = hold.releasedAt ? new Date(hold.releasedAt).getTime() : NaN;
  return !(typeof hold.releaseEvidenceHash === "string" && hold.releaseEvidenceHash.trim().length > 0
    && typeof hold.releaseReason === "string" && hold.releaseReason.trim().length > 0
    && typeof hold.releaseAuthorityReference === "string" && hold.releaseAuthorityReference.trim().length > 0
    && typeof hold.releasedBy?.id === "string" && hold.releasedBy.id.length > 0
    && Number.isFinite(placedAt) && Number.isFinite(releasedAt)
    && releasedAt >= placedAt && releasedAt <= at.getTime());
}

export function effectiveHoldsForAsset(holds: readonly LegalHoldTarget[], asset: Target, at = new Date()) {
  if (!asset.id || !asset.practice?.id) throw new Error("Asset practice scope is required to resolve legal holds");
  const matching = new Map<string, LegalHoldTarget>();
  for (const hold of holds) {
    if (!hold.id) throw new Error("Legal-hold identity is unavailable");
    if (legalHoldAppliesToAsset(hold, asset, at)) matching.set(hold.id, hold);
  }
  return [...matching.values()];
}
