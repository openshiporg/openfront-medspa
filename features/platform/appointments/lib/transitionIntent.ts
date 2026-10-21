import type { AppointmentTransitionInput, AppointmentTransitionReceipt } from '../types/appointmentSchedule';

export const TRANSITION_INTENT_KEY = 'medspa.appointment-transition.v1';
export type PrivateIntentStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type TransitionIntent = { version: 1; operation: 'appointment_transition'; original: AppointmentTransitionInput; createdAt: string };

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, child]) => child !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)]));
  return value;
}
const wire = (value: unknown) => JSON.stringify(canonical(value));
function validOriginal(input: AppointmentTransitionInput) {
  const scope = input?.expectedScope;
  return scope && ['actorId', 'practiceId', 'locationId', 'clientId', 'appointmentId'].every(key => typeof scope[key as keyof typeof scope] === 'string' && scope[key as keyof typeof scope].trim())
    && ['scheduler', 'customer_cancel'].includes(scope.purpose) && scope.appointmentId === input.appointmentId
    && (scope.purpose !== 'customer_cancel' || input.status === 'cancelled')
    && ['confirmed', 'cancelled', 'no_show', 'in_progress'].includes(input.status)
    && Number.isSafeInteger(input.expectedRevision) && Number(input.expectedRevision) > 0
    && typeof input.idempotencyKey === 'string' && input.idempotencyKey.trim().length >= 12 && input.idempotencyKey.length <= 200
    && typeof input.reason === 'string' && input.reason.length <= 1000 && (input.status !== 'cancelled' || input.reason.trim());
}
export function readTransitionIntent(storage: PrivateIntentStorage): TransitionIntent | null {
  const value = storage.getItem(TRANSITION_INTENT_KEY);
  if (value === null) return null;
  let intent: TransitionIntent;
  try { intent = JSON.parse(value); } catch { throw new Error('Original intent is malformed. It remains pending; do not replace its key.'); }
  if (!intent || intent.version !== 1 || intent.operation !== 'appointment_transition' || !validOriginal(intent.original) || !Number.isFinite(Date.parse(intent.createdAt))) throw new Error('Original intent is unattributable. It remains pending; do not replace its key.');
  return intent;
}
/** The whole private scope/body/version/key must survive a storage roundtrip BEFORE I/O. */
export function retainTransitionIntent(storage: PrivateIntentStorage, original: AppointmentTransitionInput): TransitionIntent {
  if (storage.getItem(TRANSITION_INTENT_KEY) !== null) throw new Error('An original appointment command remains pending. Recover it before NEW.');
  if (!validOriginal(original)) throw new Error('Original appointment scope and command are invalid');
  const intent: TransitionIntent = JSON.parse(wire({ version: 1, operation: 'appointment_transition', original, createdAt: new Date().toISOString() }));
  const value = wire(intent);
  storage.setItem(TRANSITION_INTENT_KEY, value);
  if (storage.getItem(TRANSITION_INTENT_KEY) !== value || wire(readTransitionIntent(storage)) !== value) throw new Error('Private intent storage roundtrip failed. No NEW command may be sent.');
  return intent;
}
export async function transitionIntentRequestHash(intent: TransitionIntent): Promise<string> {
  const original = intent.original;
  const request = { appointmentId: original.appointmentId, status: original.status, reason: original.reason?.trim() || '', expectedRevision: original.expectedRevision, actorId: original.expectedScope!.actorId, expectedScope: original.expectedScope };
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(wire(request)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
/** Unknown/not-found/expired or a partial success DTO is NEVER evidence of rollback. */
export async function resolveTransitionIntent(storage: PrivateIntentStorage, intent: TransitionIntent, receipt: AppointmentTransitionReceipt | null | undefined) {
  if (!receipt || receipt.version !== 1 || !receipt.receiptId || !/^[a-f0-9]{64}$/.test(receipt.evidenceHash) || receipt.idempotencyKey !== intent.original.idempotencyKey
    || wire(receipt.scope) !== wire(intent.original.expectedScope) || receipt.status !== intent.original.status
    || receipt.fromRevision !== intent.original.expectedRevision || receipt.toRevision !== Number(intent.original.expectedRevision) + 1
    || receipt.requestHash !== await transitionIntentRequestHash(intent)) throw new Error('Original receipt is incomplete or mismatched. Keep the original command pending.');
  const stored = readTransitionIntent(storage);
  if (wire(stored) !== wire(intent)) throw new Error('Private original intent changed. Keep it pending.');
  storage.removeItem(TRANSITION_INTENT_KEY);
  if (storage.getItem(TRANSITION_INTENT_KEY) !== null) throw new Error('Private intent resolution could not be retained. NEW remains disabled.');
}
