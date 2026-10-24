export const CLIENT_FILTERS = ['all', 'upcoming', 'followup', 'marketing'] as const;
export type ClientFilter = typeof CLIENT_FILTERS[number];

export interface ClientDirectoryItem {
  id: string;
  userId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  lastVisit: string | null;
  /** Practice-local timezone for this client's dates. */
  timezone?: string | null;
  totalVisits: number;
  lifetimeValue: number;
  marketingConsent: boolean;
  preferredProvider: string | null;
  nextAppointment: { id: string; startTime: string } | null;
  followUpDue: boolean;
}

export interface ClientDirectory { total: number; page: number; pageSize: number; items: ClientDirectoryItem[] }

export interface ClientRecord {
  client: {
    id: string; name: string | null; email: string | null; phone: string | null; dateOfBirth: string | null;
    contactPreferences: string; operationalNotes: string; firstVisit: string | null; lastVisit: string | null;
    totalVisits: number; lifetimeValue: number; marketingConsent: boolean; createdAt: string | null;
    homeLocation: { id: string; name: string } | null; preferredProvider: { id: string; name: string | null } | null;
  };
  appointments: Array<{ id: string; startTime: string; status: string; duration: number | null; provider: string | null; location: string | null; timezone: string | null; treatments: string[]; total: number }>;
  followUps: Array<{ id: string; title: string; status: string; dueAt: string; completedAt: string | null; assignedTo: string | null }>;
  waitlist: Array<{ id: string; status: string; createdAt: string; preferredTimeRange: string | null; service: string | null }>;
  packages: Array<{ id: string; name: string | null; status: string; purchasedAt: string | null; expiresAt: string | null; remaining: number }> | null;
  memberships: Array<{ id: string; name: string | null; status: string; monthlyPrice: number | null; startDate: string | null; nextBillingDate: string | null; pausedUntil: string | null }> | null;
  giftCards: Array<{ id: string; code: string | null; balance: number; initialValue: number; isActive: boolean; expiresAt: string | null; recipientName: string | null }> | null;
  notes: Array<{ id: string; type: string | null; content: string; signedAt: string | null; createdAt: string; author: string | null }> | null;
}

export interface ClientFormOptions {
  providers: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
}

export interface ClientProfileInput {
  clientId: string; name: string; phone: string; dateOfBirth: string; contactPreferences: string; operationalNotes: string;
  preferredProviderId: string; homeLocationId: string; marketingConsent: boolean; idempotencyKey: string;
}

export type WorkflowResult = { success: boolean; recordId?: string | null; error?: string | null };
