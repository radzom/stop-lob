import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const Route = createFileRoute(
  "/_authenticated/rankings/$rankingId_/report",
)({
  component: ReportResultPage,
});

type SetScore = {
  player1Score: string;
  player2Score: string;
};

function ReportResultPage() {
  const { rankingId } = Route.useParams();
  const typedRankingId = rankingId as Id<"rankings">;
  const navigate = useNavigate();

  const activeChallenge = useQuery(api.challenges.getActiveForPlayer, {
    rankingId: typedRankingId,
  });
  const reportResult = useMutation(api.challenges.reportResult);
  const disputeResult = useMutation(api.challenges.disputeResult);

  const [isWalkover, setIsWalkover] = useState(false);
  const [winnerId, setWinnerId] = useState<string>("");
  const [datePlayed, setDatePlayed] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [sets, setSets] = useState<SetScore[]>([
    { player1Score: "", player2Score: "" },
    { player1Score: "", player2Score: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Loading
  if (activeChallenge === undefined) {
    return (
      <div className="mx-auto w-full max-w-lg border border-brand-200 bg-white p-6 text-sm text-ink-700 shadow-sm">
        Wird geladen...
      </div>
    );
  }

  // Determine if this is a dispute flow
  const isDisputeMode =
    activeChallenge !== null &&
    activeChallenge !== undefined &&
    activeChallenge.status === "result_reported" &&
    activeChallenge.counterResult == null &&
    activeChallenge.reportedBy !== (
      activeChallenge.role === "challenger"
        ? activeChallenge.challengerId
        : activeChallenge.challengedId
    );

  // No active challenge or not in a valid state
  if (
    activeChallenge === null ||
    (activeChallenge.status !== "pending" && !isDisputeMode)
  ) {
    return (
      <div className="mx-auto w-full max-w-lg border border-brand-200 bg-white p-8 text-center shadow-sm">
        <p className="text-ink-700">
          Keine offene Herausforderung fuer diese Rangliste gefunden.
        </p>
        <Link
          to="/rankings/$rankingId"
          params={{ rankingId }}
          className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline"
        >
          Zurueck zur Rangliste
        </Link>
      </div>
    );
  }

  const challengerId = activeChallenge.challengerId;
  const challengedId = activeChallenge.challengedId;

  // Determine player names based on role
  const challengerName =
    activeChallenge.role === "challenger"
      ? "Du"
      : activeChallenge.opponentName;
  const challengedName =
    activeChallenge.role === "challenged"
      ? "Du"
      : activeChallenge.opponentName;

  // Auto-determine winner from set scores (for normal matches)
  const computeWinnerFromSets = (): string | null => {
    let p1Wins = 0;
    let p2Wins = 0;
    for (const set of sets) {
      const s1 = parseInt(set.player1Score, 10);
      const s2 = parseInt(set.player2Score, 10);
      if (isNaN(s1) || isNaN(s2)) return null;
      if (s1 > s2) p1Wins++;
      else if (s2 > s1) p2Wins++;
    }
    if (p1Wins >= 2) return challengerId;
    if (p2Wins >= 2) return challengedId;
    return null;
  };

  // Check if we need a 3rd set
  const needsThirdSet = (): boolean => {
    if (sets.length < 2) return false;
    const s1a = parseInt(sets[0].player1Score, 10);
    const s1b = parseInt(sets[0].player2Score, 10);
    const s2a = parseInt(sets[1].player1Score, 10);
    const s2b = parseInt(sets[1].player2Score, 10);
    if (isNaN(s1a) || isNaN(s1b) || isNaN(s2a) || isNaN(s2b)) return false;
    const p1First = s1a > s1b ? 1 : 0;
    const p1Second = s2a > s2b ? 1 : 0;
    return p1First + p1Second === 1; // 1-1 in sets
  };

  const updateSet = (index: number, field: "player1Score" | "player2Score", value: string) => {
    const updated = [...sets];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-add/remove 3rd set
    if (index <= 1) {
      const s1a = parseInt(updated[0].player1Score, 10);
      const s1b = parseInt(updated[0].player2Score, 10);
      const s2a = parseInt(updated[1]?.player1Score ?? "", 10);
      const s2b = parseInt(updated[1]?.player2Score ?? "", 10);

      if (
        !isNaN(s1a) && !isNaN(s1b) && !isNaN(s2a) && !isNaN(s2b) &&
        ((s1a > s1b && s2b > s2a) || (s1b > s1a && s2a > s2b))
      ) {
        // 1-1 → need 3rd set
        if (updated.length < 3) {
          updated.push({ player1Score: "", player2Score: "" });
        }
      } else if (updated.length === 3) {
        // Not 1-1 → remove 3rd set
        updated.pop();
      }
    }

    setSets(updated);
  };

  const handleSubmit = () => {
    setErrorMessage(null);

    // Build sets array for the mutation
    const resolvedWinnerId = isWalkover ? winnerId : computeWinnerFromSets();
    if (!resolvedWinnerId) {
      setErrorMessage("Bitte alle Satzergebnisse eintragen.");
      return;
    }

    const typedWinnerId = resolvedWinnerId as Id<"players">;
    const setsToSubmit = [];

    for (let i = 0; i < sets.length; i++) {
      const s1 = parseInt(sets[i].player1Score, 10);
      const s2 = parseInt(sets[i].player2Score, 10);
      if (isNaN(s1) || isNaN(s2)) {
        if (isWalkover) break; // Partial sets OK for walkover
        setErrorMessage(`Bitte Ergebnis fuer Satz ${i + 1} eintragen.`);
        return;
      }
      // winnerScore/loserScore are from the match winner's perspective
      const isThirdSetTiebreak = i === 2;
      const matchWinnerIsPlayer1 = typedWinnerId === challengerId;
      setsToSubmit.push({
        winnerScore: matchWinnerIsPlayer1 ? s1 : s2,
        loserScore: matchWinnerIsPlayer1 ? s2 : s1,
        isTiebreak: isThirdSetTiebreak,
      });
    }

    setIsSubmitting(true);
    const mutationArgs = {
      challengeId: activeChallenge._id,
      winnerId: typedWinnerId,
      sets: setsToSubmit,
      datePlayed,
      isWalkover,
    };
    void (isDisputeMode ? disputeResult(mutationArgs) : reportResult(mutationArgs))
      .then(() => {
        void navigate({
          to: "/rankings/$rankingId",
          params: { rankingId },
        });
      })
      .catch((error: Error) => {
        setErrorMessage(error.message);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <section className="mx-auto w-full max-w-lg space-y-5">
      <Link
        to="/rankings/$rankingId"
        params={{ rankingId }}
        className="hidden text-sm font-semibold text-brand-700 hover:underline sm:inline-block"
      >
        ← Zurueck zur Rangliste
      </Link>

      <div className="space-y-5 sm:border sm:border-brand-200 sm:bg-white sm:p-7 sm:shadow-sm">
        <h1 className="font-display text-2xl text-ink-950">
          {isDisputeMode ? "Eigenes Ergebnis melden" : "Ergebnis melden"}
        </h1>
        {isDisputeMode && (
          <p className="text-sm text-amber-700">
            Du bist mit dem gemeldeten Ergebnis nicht einverstanden. Melde hier dein Ergebnis.
          </p>
        )}

        <p className="text-sm text-ink-700">
          {challengerName}{" "}
          <span className="font-semibold text-ink-950">vs</span>{" "}
          {challengedName}
        </p>

        {/* Date played */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-950">
            Spieldatum
          </label>
          <input
            type="date"
            value={datePlayed}
            onChange={(e) => setDatePlayed(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full border border-brand-200 px-3 py-2 text-sm text-ink-950 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>

        {/* Walkover checkbox */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isWalkover}
            onChange={(e) => {
              setIsWalkover(e.target.checked);
              if (!e.target.checked) setWinnerId("");
            }}
            className="h-4 w-4 border-brand-300 accent-brand-500"
          />
          <span className="text-sm font-semibold text-ink-950">Walkover</span>
        </label>

        {/* Walkover: winner selection */}
        {isWalkover && (
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink-950">
              Gewinner
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm text-ink-950">
                <input
                  type="radio"
                  name="winner"
                  value={challengerId}
                  checked={winnerId === challengerId}
                  onChange={(e) => setWinnerId(e.target.value)}
                  className="accent-brand-500"
                />
                {challengerName}
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-950">
                <input
                  type="radio"
                  name="winner"
                  value={challengedId}
                  checked={winnerId === challengedId}
                  onChange={(e) => setWinnerId(e.target.value)}
                  className="accent-brand-500"
                />
                {challengedName}
              </label>
            </div>
          </div>
        )}

        {/* Set scores */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-950">
            {isWalkover ? "Saetze (optional)" : "Saetze"}
          </label>

          {/* Column headers */}
          <div className="mb-1 grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 text-xs font-semibold text-ink-700">
            <span />
            <span className="text-center">{challengerName}</span>
            <span />
            <span className="text-center">{challengedName}</span>
          </div>

          <div className="space-y-2">
            {sets.map((set, i) => (
              <div
                key={i}
                className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2"
              >
                <span className="text-xs font-semibold text-ink-700">
                  {i === 2 && !isWalkover ? "TB" : `S${i + 1}`}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max={i === 2 ? "99" : "7"}
                  value={set.player1Score}
                  onChange={(e) => updateSet(i, "player1Score", e.target.value)}
                  className="w-full border border-brand-200 px-3 py-2 text-center text-sm text-ink-950 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="0"
                />
                <span className="text-sm font-semibold text-ink-500">:</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max={i === 2 ? "99" : "7"}
                  value={set.player2Score}
                  onChange={(e) => updateSet(i, "player2Score", e.target.value)}
                  className="w-full border border-brand-200 px-3 py-2 text-center text-sm text-ink-950 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="border border-brand-600 bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50"
          >
            {isSubmitting ? "Wird gesendet..." : "Ergebnis melden"}
          </button>
          <Link
            to="/rankings/$rankingId"
            params={{ rankingId }}
            className="border border-brand-200 bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 active:bg-brand-100"
          >
            Abbrechen
          </Link>
        </div>
      </div>
    </section>
  );
}
