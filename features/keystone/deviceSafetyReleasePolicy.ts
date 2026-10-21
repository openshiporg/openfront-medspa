export type SafetyCaseStatus = string | null | undefined;

/** Unknown or absent case states fail closed; only an explicitly closed case releases its hold. */
export function hasBlockingDeviceSafetyCase(
  recallStatuses: readonly SafetyCaseStatus[],
  incidentStatuses: readonly SafetyCaseStatus[],
) {
  return [...recallStatuses, ...incidentStatuses].some((status) => status !== "closed");
}
