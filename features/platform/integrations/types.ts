export interface IntegrationProvider { id: string; name: string; code: string; adapter: string; isInstalled: boolean; isDefault: boolean }
export interface IntegrationWebhook { id: string; type: string | null; status: string; processedAt: string | null; provider: { name: string } | null }
export type IntegrationsRead =
  | { status: 'loaded'; providers: IntegrationProvider[]; webhooks: IntegrationWebhook[]; email: { configured: boolean } }
  | { status: 'unavailable' };
