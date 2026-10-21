export type DomainEventReplayIdentity = {
  eventType: string
  eventVersion: number
  aggregateType: string
  aggregateId: string
  operation: "create" | "update" | "delete"
  locationId?: string | null
  payloadHash: string
  practiceId: string
}

export type ExistingDomainEventReplayIdentity = Omit<DomainEventReplayIdentity, "practiceId"> & {
  practiceId?: string | null
}

/** Replays may repair only legacy scope; every immutable event identity component must match. */
export function assertDomainEventReplaySafe(
  existing: ExistingDomainEventReplayIdentity,
  incoming: DomainEventReplayIdentity,
): { repairPractice: boolean } {
  if (!incoming.practiceId?.trim()) throw new Error("Domain event practice attribution is required")

  const sameIdentity = existing.eventType === incoming.eventType
    && existing.eventVersion === incoming.eventVersion
    && existing.aggregateType === incoming.aggregateType
    && existing.aggregateId === incoming.aggregateId
    && existing.operation === incoming.operation
    && (existing.locationId || null) === (incoming.locationId || null)
    && existing.payloadHash === incoming.payloadHash

  if (!sameIdentity) throw new Error("Domain event key was reused with different immutable evidence")
  if (existing.practiceId && existing.practiceId !== incoming.practiceId) {
    throw new Error("Domain event key was reused across practice ownership")
  }
  return { repairPractice: !existing.practiceId }
}
