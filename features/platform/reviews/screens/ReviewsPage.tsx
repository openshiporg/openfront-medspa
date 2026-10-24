import Link from 'next/link';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState, ErrorState, MetricStrip, PageHeader, PillLink, PlatformPage, SegmentTabs, TitleStatus, Track } from '@/features/platform/components/medspa-ui';
import { pillClass, trackClass } from '@/features/platform/components/pill';
import { PracticeSetupState } from '@/features/platform/components/PracticeSetupState';
import { hasPracticeSetup } from '@/features/platform/lib/practiceSetup';
import { getReviewBoard } from '../actions/reviews';
import { ReviewModeration } from '../components/ReviewModeration';
import { REVIEW_FILTERS, type ReviewFilter } from '../types';

const BASE = '/dashboard/platform/reviews';
const filterLabels: Record<ReviewFilter, string> = { pending: 'To review', approved: 'Published', all: 'All' };

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} of 5`}>
      {[1, 2, 3, 4, 5].map((value) => <Star key={value} aria-hidden="true" className={cn('size-3.5', value <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')} />)}
    </span>
  );
}

export async function ReviewsPage({ searchParams }: { searchParams?: Promise<{ filter?: string; page?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const filter: ReviewFilter = REVIEW_FILTERS.includes(params.filter as ReviewFilter) ? params.filter as ReviewFilter : 'pending';
  const page = Math.max(0, Number.parseInt(params.page || '0', 10) || 0);
  const board = await getReviewBoard(filter, page);
  const practiceReady = board ? true : await hasPracticeSetup();
  const href = (next: { filter?: ReviewFilter; page?: number }) => {
    const query = new URLSearchParams();
    const nextFilter = next.filter ?? filter;
    if (nextFilter !== 'pending') query.set('filter', nextFilter);
    if (next.page) query.set('page', String(next.page));
    const value = query.toString();
    return `${BASE}${value ? `?${value}` : ''}`;
  };
  const lastPage = board ? Math.max(0, Math.ceil(board.total / board.pageSize) - 1) : 0;

  return (
    <PlatformPage breadcrumbs={[{ label: 'Reviews' }]}>
      <PageHeader
        title="Reviews"
        icon={Star}
        status={board?.counts.pending ? <TitleStatus tone="amber">{board.counts.pending} to review</TitleStatus> : null}
      />
      {practiceReady === false ? <PracticeSetupState /> : !board ? (
        <ErrorState id="reviews-unavailable" title="Reviews unavailable" message="Reviews could not be loaded for your role." action={<Track><PillLink href={href({})}>Retry</PillLink></Track>} />
      ) : (
        <>
          <MetricStrip items={[
            { label: 'To review', value: board.counts.pending, tone: board.counts.pending ? 'amber' : undefined, href: href({ filter: 'pending', page: 0 }) },
            { label: 'Published', value: board.counts.approved, tone: 'emerald', href: href({ filter: 'approved', page: 0 }) },
            { label: 'Average rating', value: board.averageRating === null ? '—' : `${board.averageRating.toFixed(1)} / 5` },
          ]} />
          <SegmentTabs label="Review filters" active={filter} tabs={REVIEW_FILTERS.map((value) => ({ value, label: filterLabels[value], href: href({ filter: value, page: 0 }), count: board.counts[value] }))} />
          {board.items.length === 0 ? <EmptyState icon={Star} title={filter === 'pending' ? 'Nothing to review' : 'No reviews'} /> : (
            <section aria-label="Reviews" className="grid gap-3">
              {board.items.map((review) => (
                <article key={review.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-background p-4 md:flex-row md:items-start md:justify-between md:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                      {review.client
                        ? <Link href={`/dashboard/platform/clients/${review.client.id}`} className="truncate text-sm font-semibold hover:underline">{review.client.name || 'Client'}</Link>
                        : <span className="text-sm font-semibold">Client</span>}
                      <Stars rating={review.rating} />
                      <TitleStatus tone={review.isApproved ? 'emerald' : 'amber'}>{review.isApproved ? 'Published' : 'To review'}</TitleStatus>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[review.service?.name, review.provider?.name, new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })].filter(Boolean).join(' · ')}
                    </p>
                    {review.comment ? <p className="mt-2 whitespace-pre-wrap text-sm">{review.comment}</p> : <p className="mt-2 text-sm text-muted-foreground">No comment</p>}
                    {review.appointment ? <Link href={`/dashboard/platform/appointments/${review.appointment.id}`} className="mt-2 inline-block text-xs font-medium hover:underline">Appointment</Link> : null}
                  </div>
                  <ReviewModeration reviewId={review.id} isApproved={review.isApproved} />
                </article>
              ))}
            </section>
          )}
          {lastPage > 0 ? (
            <nav aria-label="Review pages" className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span className="tabular-nums">Page {page + 1} of {lastPage + 1}</span>
              <div className={trackClass}>
                {page > 0 ? <Link href={href({ page: page - 1 })} className={pillClass('quiet', 'sm')}><ChevronLeft />Previous</Link> : null}
                {page < lastPage ? <Link href={href({ page: page + 1 })} className={pillClass('raised', 'sm')}>Next<ChevronRight /></Link> : null}
              </div>
            </nav>
          ) : null}
        </>
      )}
    </PlatformPage>
  );
}
