export const REVIEW_FILTERS = ['pending', 'approved', 'all'] as const;
export type ReviewFilter = typeof REVIEW_FILTERS[number];

export interface ReviewView {
  id: string; rating: number; comment: string; isApproved: boolean; createdAt: string;
  client: { id: string; name: string | null } | null;
  service: { id: string; name: string } | null;
  provider: { id: string; name: string | null } | null;
  appointment: { id: string; startTime: string } | null;
}

export interface ReviewBoard {
  filter: ReviewFilter; page: number; pageSize: number; total: number;
  counts: Record<ReviewFilter, number>; averageRating: number | null; items: ReviewView[];
}

export type ModerationResult = { success: boolean; error?: string | null };
