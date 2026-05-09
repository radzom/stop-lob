import { ChallengeCard } from "./ChallengeCard";
import type { ChallengeWithNames } from "./ChallengeCard";

export function ChallengeHistoryList({
  challenges,
  showRanking = false,
  loadMore,
  hasMore = false,
  isLoading = false,
}: {
  challenges: ChallengeWithNames[];
  showRanking?: boolean;
  loadMore?: (numItems: number) => void;
  hasMore?: boolean;
  isLoading?: boolean;
}) {
  if (challenges.length === 0 && !isLoading) {
    return (
      <div className="border border-brand-200 bg-brand-50 p-6 text-center">
        <p className="text-sm text-ink-500">Keine Herausforderungen</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {challenges.map((challenge) => (
        <ChallengeCard
          key={challenge._id}
          challenge={challenge}
          showRanking={showRanking}
        />
      ))}
      {hasMore && loadMore && (
        <button
          type="button"
          onClick={() => loadMore(10)}
          className="w-full border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 active:bg-brand-100"
        >
          Mehr laden
        </button>
      )}
    </div>
  );
}
