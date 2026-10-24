'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type { ModerationResult, ReviewBoard, ReviewFilter } from '../types';

export async function getReviewBoard(filter: ReviewFilter, page: number): Promise<ReviewBoard | null> {
  const response = await keystoneClient<{ medspaReviewBoard: ReviewBoard }>(`
    query ReviewBoard($filter: String, $page: Int) { medspaReviewBoard(filter: $filter, page: $page) }
  `, { filter, page }, { cache: 'no-store' }).catch(() => null);
  return response?.success ? response.data.medspaReviewBoard : null;
}

export async function setReviewApproval(reviewId: string, isApproved: boolean, idempotencyKey: string): Promise<ModerationResult> {
  const response = await keystoneClient<{ moderateReview: ModerationResult }>(`
    mutation ModerateReview($reviewId: ID!, $isApproved: Boolean!, $idempotencyKey: String!) {
      moderateReview(reviewId: $reviewId, isApproved: $isApproved, idempotencyKey: $idempotencyKey) { success error }
    }
  `, { reviewId, isApproved, idempotencyKey });
  if (!response.success) return { success: false, error: 'Not updated. Try again.' };
  if (response.data.moderateReview.success) {
    revalidatePath('/dashboard/platform/reviews');
    revalidatePath('/reviews');
  }
  return response.data.moderateReview;
}
