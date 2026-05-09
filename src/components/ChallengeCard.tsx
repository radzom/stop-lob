import type { Doc, Id } from "../../convex/_generated/dataModel";

type SetScore = {
  winnerScore: number;
  loserScore: number;
  isTiebreak: boolean;
};

type ReportedResult = {
  winnerId: Id<"players">;
  loserId: Id<"players">;
  sets: SetScore[];
  datePlayed: string;
  isWalkover: boolean;
};

export type ChallengeWithNames = Doc<"challenges"> & {
  challengerName: string;
  challengedName: string;
  rankingName?: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Offen",
  result_reported: "Ergebnis gemeldet",
  disputed: "Angefochten",
  completed: "Abgeschlossen",
  expired: "Abgelaufen",
  forfeited: "Aufgegeben",
  cancelled: "Abgebrochen",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  result_reported: "bg-blue-100 text-blue-800",
  disputed: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800",
  expired: "bg-ink-700/10 text-ink-700",
  forfeited: "bg-ink-700/10 text-ink-700",
  cancelled: "bg-ink-700/10 text-ink-700",
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatSetScores(
  sets: SetScore[],
  result: ReportedResult,
  challengerId: Id<"players">,
): string {
  return sets
    .map((set) => {
      // Show scores from challenger's perspective
      const challengerIsWinner = result.winnerId === challengerId;
      const challengerScore = challengerIsWinner
        ? set.winnerScore
        : set.loserScore;
      const challengedScore = challengerIsWinner
        ? set.loserScore
        : set.winnerScore;
      const suffix = set.isTiebreak ? " (TB)" : "";
      return `${challengerScore}:${challengedScore}${suffix}`;
    })
    .join(", ");
}

export function ChallengeCard({
  challenge,
  showRanking = false,
}: {
  challenge: ChallengeWithNames;
  showRanking?: boolean;
}) {
  // Pick the final/authoritative result
  const result =
    challenge.resolvedResult === "counter"
      ? challenge.counterResult
      : challenge.resolvedResult === "reported"
        ? challenge.reportedResult
        : challenge.counterResult ?? challenge.reportedResult;
  const challengerWon = result?.winnerId === challenge.challengerId;

  return (
    <div className="border border-brand-200 bg-white p-4 shadow-sm">
      {/* Header: status badge + date */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[challenge.status] ?? "bg-ink-700/10 text-ink-700"}`}
        >
          {STATUS_LABELS[challenge.status] ?? challenge.status}
        </span>
        <span className="text-xs text-ink-500">
          {formatDate(challenge.createdAt)}
        </span>
      </div>

      {/* Players */}
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span
          className={`font-semibold ${result && challengerWon ? "text-green-800" : "text-ink-950"}`}
        >
          {challenge.challengerName}
          <span className="ml-1 text-xs font-normal text-ink-500">
            #{challenge.challengerRank}
          </span>
        </span>
        <span className="text-ink-500">vs</span>
        <span
          className={`font-semibold ${result && !challengerWon ? "text-green-800" : "text-ink-950"}`}
        >
          {challenge.challengedName}
          <span className="ml-1 text-xs font-normal text-ink-500">
            #{challenge.challengedRank}
          </span>
        </span>
      </div>

      {/* Result details */}
      {result && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-700">
          {!result.isWalkover && result.sets.length > 0 && (
            <span className="font-medium">
              {formatSetScores(result.sets, result, challenge.challengerId)}
            </span>
          )}
          {result.isWalkover && (
            <span className="bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">
              Walkover
            </span>
          )}
          <span className="text-ink-500">
            am{" "}
            {new Date(result.datePlayed).toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </span>
        </div>
      )}

      {/* Forfeit info */}
      {challenge.status === "forfeited" && (
        <p className="mt-2 text-xs text-ink-500">
          Aufgegeben von{" "}
          {challenge.forfeitedBy === challenge.challengerId
            ? challenge.challengerName
            : challenge.challengedName}
        </p>
      )}

      {/* Admin resolved badge */}
      {challenge.resolvedBy && (
        <span className="mt-2 inline-block bg-brand-100 px-1.5 py-0.5 text-xs font-semibold text-brand-700">
          Admin entschieden
        </span>
      )}

      {/* Ranking name (on player page) */}
      {showRanking && challenge.rankingName && (
        <p className="mt-2 text-xs text-ink-500">
          {challenge.rankingName}
        </p>
      )}

      {/* Resolved date */}
      {challenge.resolvedAt && (
        <p className="mt-1 text-xs text-ink-500">
          Abgeschlossen am {formatDate(challenge.resolvedAt)}
        </p>
      )}
    </div>
  );
}
