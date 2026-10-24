export interface IntegrationProvider { id: string; name: string; code: string; adapter: string; isInstalled: boolean; isDefault: boolean }
export interface IntegrationEvent { id: string; eventType: string; aggregateType: string | null; status: string; attempts: number | null; occurredAt: string | null; lastError: string | null }
export interface IntegrationWebhook { id: string; type: string | null; status: string; processedAt: string | null; provider: { name: string } | null }
export type IntegrationsRead =
  | { status: 'loaded'; providers: IntegrationProvider[]; events: IntegrationEvent[]; eventCounts: { pending: number; deadLetter: number; delivered: number }; webhooks: IntegrationWebhook[]; email: { configured: boolean } }
  | { status: 'unavailable' };
