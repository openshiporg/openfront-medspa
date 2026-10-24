export const ENGAGEMENT_TABS = ['waitlist', 'templates', 'log'] as const;
export type EngagementTab = typeof ENGAGEMENT_TABS[number];

export const WAITLIST_STATUSES = ['active', 'notified', 'converted', 'removed'] as const;
export type WaitlistStatus = typeof WAITLIST_STATUSES[number];

export const MESSAGE_STATUSES = ['all', 'sent', 'delivered', 'failed'] as const;
export type MessageStatus = typeof MESSAGE_STATUSES[number];

export const TEMPLATE_TYPES = ['reminder', 'confirmation', 'marketing'] as const;
export type TemplateType = typeof TEMPLATE_TYPES[number];

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export interface WaitlistEntryView {
  id: string; status: WaitlistStatus; name: string | null; phone: string | null; email: string | null;
  clientRecordId: string | null; isGuest: boolean; service: { id: string; name: string } | null; providers: string[];
  preferredDays: string[]; preferredTimeRange: string | null; dateRangeStart: string | null; dateRangeEnd: string | null;
  notes: string | null; createdAt: string; notifiedAt: string | null; convertedAppointment: { id: string; startTime: string } | null;
}

export interface WaitlistBoard { status: WaitlistStatus; counts: Record<WaitlistStatus, number>; entries: WaitlistEntryView[] }

export interface WaitlistOptions {
  services: Array<{ id: string; name: string }>;
  providers: Array<{ id: string; name: string; serviceIds: string[] }>;
}

export interface ClientMatch { userId: string; name: string | null; email: string | null; phone: string | null }

export interface WaitlistInput {
  clientUserId: string | null; guestName: string; guestPhone: string; serviceId: string; preferredProviderIds: string[];
  preferredDays: string[]; preferredTimeRange: string; dateRangeStart: string; dateRangeEnd: string; notes: string; idempotencyKey: string;
}

export interface MessageTemplateView { id: string; name: string; type: TemplateType; content: string; variables: string[]; isActive: boolean; updatedAt: string | null }

export interface TemplateInput { id: string | null; name: string; type: TemplateType; content: string; variables: string[]; isActive: boolean }

export interface MessageLogView {
  status: MessageStatus; page: number; pageSize: number; total: number; failed: number;
  items: Array<{ id: string; channel: string; status: string; sentAt: string | null; error: string | null; recipient: string | null; clientRecordId: string | null; template: { id: string; name: string; type: string } | null }>;
}

export type ActionResult = { success: boolean; error?: string | null };
