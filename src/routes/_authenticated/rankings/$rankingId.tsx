import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ChallengeHistoryList } from "../../../components/ChallengeHistoryList";

export const Route = createFileRoute("/_authenticated/rankings/$rankingId")({
  component: RankingDetailPage,
});

function RankingDetailPage() {
  const { rankingId } = Route.useParams();
  const typedRankingId = rankingId as Id<"rankings">;
  const ranking = useQuery(api.rankings.getById, {
    rankingId: typedRankingId,
  });
  const positions = useQuery(api.rankingParticipation.getPositions, {
    rankingId: typedRankingId,
  });
  const profile = useQuery(api.playerProfiles.getMyProfile);
  const activeChallenge = useQuery(api.challenges.getActiveForPlayer, {
    rankingId: typedRankingId,
  });
  const activeChallenges = useQuery(api.challenges.getForRanking, {
    rankingId: typedRankingId,
  });

  if (ranking === undefined) {
    return (
      <div className="mx-auto w-full max-w-3xl border border-brand-200 bg-white p-6 text-sm text-ink-700 shadow-sm">
        Wird geladen...
      </div>
    );
  }

  if (ranking === null) {
    return (
      <div className="mx-auto w-full max-w-3xl border border-brand-200 bg-white p-8 text-center shadow-sm">
        <p className="text-ink-700">Rangliste nicht gefunden.</p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline"
        >
          Zurueck zur Uebersicht
        </Link>
      </div>
    );
  }

  const badges: string[] = [];
  if (ranking.genderFilter === "male") badges.push("Herren");
  else if (ranking.genderFilter === "female") badges.push("Damen");
  else badges.push("Offen");

  if (ranking.minAge != null && ranking.maxAge != null) {
    badges.push(`${ranking.minAge}–${ranking.maxAge} Jahre`);
  } else if (ranking.minAge != null) {
    badges.push(`Ab ${ranking.minAge} Jahre`);
  } else if (ranking.maxAge != null) {
    badges.push(`Bis ${ranking.maxAge} Jahre`);
  } else {
    badges.push("Alle Altersklassen");
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <Link
        to="/"
        className="hidden text-sm font-semibold text-brand-700 hover:underline sm:inline-block"
      >
        ← Alle Ranglisten
      </Link>

      <div className="space-y-2 sm:border sm:border-brand-200 sm:bg-white sm:p-7 sm:shadow-sm">
        <h1 className="font-display text-2xl text-ink-950 sm:text-3xl">
          {ranking.name}
        </h1>
        {ranking.description && (
          <p className="text-sm text-ink-700 sm:text-base">
            {ranking.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {badges.map((badge) => (
            <span
              key={badge}
              className="bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700"
            >
              {badge}
            </span>
          ))}
          {!ranking.isActive && (
            <span className="bg-ink-700/10 px-2 py-0.5 text-xs font-semibold text-ink-700">
              Inaktiv
            </span>
          )}
        </div>

        <div className="pt-4">
          <Pyramid
            positions={positions}
            currentPlayerId={profile?._id}
            activeChallenge={activeChallenge}
            activeChallenges={activeChallenges}
            rankingId={typedRankingId}
          />
        </div>

        <div className="pt-2">
          <JoinLeaveButton
            rankingId={typedRankingId}
            ranking={ranking}
            positions={positions}
            profile={profile}
          />
        </div>
      </div>

      <ChallengeHistory rankingId={typedRankingId} />
    </section>
  );
}

type PositionsData = { players: { playerId: Id<"players">; firstName: string; lastName: string; rank: number }[] };
type ProfileData = { _id: Id<"players">; gender: "male" | "female"; yearOfBirth: number } | null | undefined;
type RankingData = { genderFilter?: string; minAge?: number; maxAge?: number };

function getIneligibilityReason(ranking: RankingData, profile: { gender: "male" | "female"; yearOfBirth: number }): string | null {
  if (ranking.genderFilter !== undefined && ranking.genderFilter !== profile.gender) {
    const label = ranking.genderFilter === "male" ? "Herren" : "Damen";
    return `Diese Rangliste ist nur fuer ${label}.`;
  }
  const currentYear = new Date().getFullYear();
  const playerAge = currentYear - profile.yearOfBirth;
  if (ranking.minAge !== undefined && playerAge < ranking.minAge) {
    return `Du musst mindestens ${ranking.minAge} Jahre alt sein.`;
  }
  if (ranking.maxAge !== undefined && playerAge > ranking.maxAge) {
    return `Du darfst hoechstens ${ranking.maxAge} Jahre alt sein.`;
  }
  return null;
}

function JoinLeaveButton({
  rankingId,
  ranking,
  positions,
  profile,
}: {
  rankingId: Id<"rankings">;
  ranking: RankingData;
  positions: PositionsData | undefined;
  profile: ProfileData;
}) {
  const joinRanking = useMutation(api.rankingParticipation.join);
  const leaveRanking = useMutation(api.rankingParticipation.leave);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Still loading data
  if (positions === undefined || profile === undefined) {
    return null;
  }

  // No profile yet — can't join
  if (profile === null) {
    return (
      <p className="text-sm text-ink-700">
        Bitte vervollstaendige zuerst dein Profil, um einer Rangliste beizutreten.
      </p>
    );
  }

  const isInRanking = positions.players.some((p) => p.playerId === profile._id);

  // Check eligibility only when not already in the ranking
  if (!isInRanking) {
    const reason = getIneligibilityReason(ranking, profile);
    if (reason !== null) {
      return (
        <p className="text-sm text-ink-700">{reason}</p>
      );
    }
  }

  const handleAction = (action: "join" | "leave") => {
    setErrorMessage(null);
    setIsLoading(true);
    const mutation = action === "join" ? joinRanking : leaveRanking;
    void mutation({ rankingId })
      .then(() => {
        setShowLeaveConfirm(false);
      })
      .catch((error: Error) => {
        setErrorMessage(error.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className="space-y-2">
      {isInRanking ? (
        showLeaveConfirm ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-700">Wirklich verlassen?</span>
            <button
              onClick={() => handleAction("leave")}
              disabled={isLoading}
              className="border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 active:bg-red-800 disabled:opacity-50"
            >
              {isLoading ? "Wird verarbeitet..." : "Ja, verlassen"}
            </button>
            <button
              onClick={() => setShowLeaveConfirm(false)}
              disabled={isLoading}
              className="border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 active:bg-brand-100"
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 active:bg-red-100"
          >
            Rangliste verlassen
          </button>
        )
      ) : (
        <button
          onClick={() => handleAction("join")}
          disabled={isLoading}
          className="border border-brand-600 bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50"
        >
          {isLoading ? "Wird verarbeitet..." : "Rangliste beitreten"}
        </button>
      )}
      {errorMessage && (
        <p className="text-sm font-medium text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}

// ── Pyramid helpers ──────────────────────────────────────────────────

type PlayerEntry = { playerId: Id<"players">; firstName: string; lastName: string; rank: number };

/**
 * Converts a flat list of ranked players into pyramid rows.
 * Row 1 has 1 slot, row 2 has 2, row 3 has 3, etc.
 */
function buildPyramidRows(players: PlayerEntry[]): PlayerEntry[][] {
  const maxRowSize = 5;
  const rows: PlayerEntry[][] = [];
  let index = 0;
  let rowSize = 1;
  while (index < players.length) {
    const size = Math.min(rowSize, maxRowSize);
    rows.push(players.slice(index, index + size));
    index += size;
    if (rowSize < maxRowSize) rowSize++;
  }
  return rows;
}

/**
 * Returns the set of playerIds that the current player can challenge.
 * Rules: left neighbor on same row, all players from same column index
 * onward in the row above.
 */
function getChallengeableIds(rows: PlayerEntry[][], currentPlayerId: Id<"players"> | undefined): Set<string> {
  const ids = new Set<string>();
  if (!currentPlayerId) return ids;

  for (let r = 0; r < rows.length; r++) {
    const col = rows[r].findIndex((p) => p.playerId === currentPlayerId);
    if (col === -1) continue;

    // All players to the left on same row
    for (let c = 0; c < col; c++) {
      ids.add(rows[r][c].playerId);
    }
    // All players from same column index onward in row above
    if (r > 0) {
      for (let c = col; c < rows[r - 1].length; c++) {
        ids.add(rows[r - 1][c].playerId);
      }
    }
    break;
  }
  return ids;
}

function Pyramid({
  positions,
  currentPlayerId,
  activeChallenge,
  activeChallenges,
  rankingId,
}: {
  positions: PositionsData | undefined;
  currentPlayerId: Id<"players"> | undefined;
  activeChallenge: {
    _id: Id<"challenges">;
    challengerId: Id<"players">;
    challengedId: Id<"players">;
    status: string;
    role: "challenger" | "challenged";
    opponentName: string;
    reportedBy?: Id<"players">;
    reportedResult?: {
      winnerId: Id<"players">;
      loserId: Id<"players">;
      sets: { winnerScore: number; loserScore: number; isTiebreak: boolean }[];
      datePlayed: string;
      isWalkover: boolean;
    };
    counterReportedBy?: Id<"players">;
    counterResult?: {
      winnerId: Id<"players">;
      loserId: Id<"players">;
      sets: { winnerScore: number; loserScore: number; isTiebreak: boolean }[];
      datePlayed: string;
      isWalkover: boolean;
    };
  } | null | undefined;
  activeChallenges: { challengerId: Id<"players">; challengedId: Id<"players">; challengerName: string; challengedName: string }[] | undefined;
  rankingId: Id<"rankings">;
}) {
  const createChallenge = useMutation(api.challenges.create);
  const forfeitChallenge = useMutation(api.challenges.forfeit);
  const confirmResultMutation = useMutation(api.challenges.confirmResult);
  const escalateToAdminMutation = useMutation(api.challenges.escalateToAdmin);
  const [confirmTarget, setConfirmTarget] = useState<PlayerEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [isForfeiting, setIsForfeiting] = useState(false);
  const [isConfirmingResult, setIsConfirmingResult] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (positions === undefined) {
    return (
      <div className="border border-brand-200 bg-brand-50 p-6 text-center">
        <p className="text-sm text-ink-700">Pyramide wird geladen...</p>
      </div>
    );
  }

  if (positions.players.length === 0) {
    return (
      <div className="border border-brand-200 bg-brand-50 p-6 text-center">
        <p className="text-sm text-ink-700">
          Noch keine Spieler in dieser Rangliste.
        </p>
      </div>
    );
  }

  const rows = buildPyramidRows(positions.players);

  // Only show challengeable highlights when the player has no active challenge
  const hasActiveChallenge = activeChallenge != null;
  const challengeableIds = hasActiveChallenge
    ? new Set<string>()
    : getChallengeableIds(rows, currentPlayerId);

  // Build set of player IDs currently involved in any active challenge
  const playersInChallenge = new Set<string>();
  if (activeChallenges) {
    for (const c of activeChallenges) {
      playersInChallenge.add(c.challengerId);
      playersInChallenge.add(c.challengedId);
    }
  }

  const handleChallengeClick = (player: PlayerEntry) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setConfirmTarget(player);
  };

  const handleConfirm = () => {
    if (!confirmTarget) return;
    setIsCreating(true);
    setErrorMessage(null);
    void createChallenge({
      rankingId,
      challengedId: confirmTarget.playerId,
    })
      .then(() => {
        setSuccessMessage(
          `Herausforderung an ${confirmTarget.firstName} ${confirmTarget.lastName} gesendet!`,
        );
        setConfirmTarget(null);
      })
      .catch((error: Error) => {
        setErrorMessage(error.message);
        setConfirmTarget(null);
      })
      .finally(() => {
        setIsCreating(false);
      });
  };

  return (
    <div className="space-y-2">
      {/* Active challenge banner */}
      {activeChallenge && (
        <div className="border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            {activeChallenge.role === "challenger"
              ? `Du hast ${activeChallenge.opponentName} herausgefordert.`
              : `${activeChallenge.opponentName} hat dich herausgefordert.`}
          </p>
          <div className="mt-2">
            {activeChallenge.status === "disputed" ? (
              <p className="text-sm text-amber-700">
                Ergebnis wird vom Admin geprueft.
              </p>
            ) : activeChallenge.status === "result_reported" ? (
              (() => {
                const isReporter = currentPlayerId === activeChallenge.reportedBy;
                const hasCounter = activeChallenge.counterResult != null;

                // State 1: Reporter, no counter → waiting
                if (isReporter && !hasCounter) {
                  return (
                    <p className="text-sm text-amber-700">
                      Ergebnis gemeldet — warte auf Bestaetigung von{" "}
                      <span className="font-semibold">{activeChallenge.opponentName}</span>.
                    </p>
                  );
                }

                // State 2: Non-reporter, no counter → show result + confirm/reject
                if (!isReporter && !hasCounter && activeChallenge.reportedResult) {
                  const r = activeChallenge.reportedResult;
                  const isCurrentWinner = r.winnerId === currentPlayerId;
                  return (
                    <div className="space-y-2">
                      <p className="text-sm text-amber-700">
                        {activeChallenge.opponentName} hat folgendes Ergebnis gemeldet:
                      </p>
                      <p className="text-sm font-medium text-amber-900">
                        {r.isWalkover
                          ? `Walkover — ${isCurrentWinner ? "Du gewinnst" : `${activeChallenge.opponentName} gewinnt`}`
                          : r.sets.map((s) => `${s.winnerScore}:${s.loserScore}`).join(", ") +
                            ` — ${isCurrentWinner ? "Du gewinnst" : `${activeChallenge.opponentName} gewinnt`}`}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setIsConfirmingResult(true);
                            setErrorMessage(null);
                            void confirmResultMutation({ challengeId: activeChallenge._id })
                              .then(() => setSuccessMessage("Ergebnis bestaetigt."))
                              .catch((e: Error) => setErrorMessage(e.message))
                              .finally(() => setIsConfirmingResult(false));
                          }}
                          disabled={isConfirmingResult}
                          className="border border-green-600 bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
                        >
                          {isConfirmingResult ? "Wird bestaetigt..." : "Bestaetigen"}
                        </button>
                        <Link
                          to="/rankings/$rankingId/report"
                          params={{ rankingId }}
                          className="border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 active:bg-red-100"
                        >
                          Ablehnen & eigenes Ergebnis melden
                        </Link>
                      </div>
                    </div>
                  );
                }

                // State 3: Original reporter, counter exists → show counter + confirm/escalate
                if (isReporter && hasCounter && activeChallenge.counterResult) {
                  const cr = activeChallenge.counterResult;
                  const isCurrentWinner = cr.winnerId === currentPlayerId;
                  return (
                    <div className="space-y-2">
                      <p className="text-sm text-amber-700">
                        {activeChallenge.opponentName} hat ein anderes Ergebnis gemeldet:
                      </p>
                      <p className="text-sm font-medium text-amber-900">
                        {cr.isWalkover
                          ? `Walkover — ${isCurrentWinner ? "Du gewinnst" : `${activeChallenge.opponentName} gewinnt`}`
                          : cr.sets.map((s) => `${s.winnerScore}:${s.loserScore}`).join(", ") +
                            ` — ${isCurrentWinner ? "Du gewinnst" : `${activeChallenge.opponentName} gewinnt`}`}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setIsConfirmingResult(true);
                            setErrorMessage(null);
                            void confirmResultMutation({ challengeId: activeChallenge._id })
                              .then(() => setSuccessMessage("Gegenergebnis bestaetigt."))
                              .catch((e: Error) => setErrorMessage(e.message))
                              .finally(() => setIsConfirmingResult(false));
                          }}
                          disabled={isConfirmingResult}
                          className="border border-green-600 bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
                        >
                          {isConfirmingResult ? "Wird bestaetigt..." : "Akzeptieren"}
                        </button>
                        <button
                          onClick={() => {
                            setIsEscalating(true);
                            setErrorMessage(null);
                            void escalateToAdminMutation({ challengeId: activeChallenge._id })
                              .then(() => setSuccessMessage("An Admin eskaliert."))
                              .catch((e: Error) => setErrorMessage(e.message))
                              .finally(() => setIsEscalating(false));
                          }}
                          disabled={isEscalating}
                          className="border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 active:bg-red-100 disabled:opacity-50"
                        >
                          {isEscalating ? "Wird eskaliert..." : "An Admin eskalieren"}
                        </button>
                      </div>
                    </div>
                  );
                }

                // State 4: Counter-reporter, counter exists → waiting
                if (!isReporter && hasCounter) {
                  return (
                    <p className="text-sm text-amber-700">
                      Dein Ergebnis wurde gemeldet — warte auf Reaktion von{" "}
                      <span className="font-semibold">{activeChallenge.opponentName}</span>.
                    </p>
                  );
                }

                return null;
              })()
            ) : showForfeitConfirm ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700">
                  Willst du wirklich aufgeben? Dies zaehlt als Niederlage.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsForfeiting(true);
                      setErrorMessage(null);
                      void forfeitChallenge({ challengeId: activeChallenge._id })
                        .then(() => {
                          setSuccessMessage("Herausforderung aufgegeben.");
                          setShowForfeitConfirm(false);
                        })
                        .catch((error: Error) => {
                          setErrorMessage(error.message);
                        })
                        .finally(() => {
                          setIsForfeiting(false);
                        });
                    }}
                    disabled={isForfeiting}
                    className="border border-red-600 bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 active:bg-red-800 disabled:opacity-50"
                  >
                    {isForfeiting ? "Wird verarbeitet..." : "Ja, aufgeben"}
                  </button>
                  <button
                    onClick={() => setShowForfeitConfirm(false)}
                    disabled={isForfeiting}
                    className="border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 active:bg-brand-100"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/rankings/$rankingId/report"
                  params={{ rankingId }}
                  className="border border-brand-600 bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:bg-brand-800"
                >
                  Ergebnis melden
                </Link>
                <button
                  onClick={() => setShowForfeitConfirm(true)}
                  className="border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 active:bg-red-100"
                >
                  Aufgeben
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success / error feedback */}
      {successMessage && (
        <div className="border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmTarget && (
        <div className="border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            Moechtest du{" "}
            <span className="font-semibold">
              {confirmTarget.firstName} {confirmTarget.lastName}
            </span>{" "}
            herausfordern?
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={isCreating}
              className="border border-amber-500 bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50"
            >
              {isCreating ? "Wird gesendet..." : "Ja, herausfordern"}
            </button>
            <button
              onClick={() => setConfirmTarget(null)}
              disabled={isCreating}
              className="border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 active:bg-brand-100"
            >
              Nein
            </button>
            <Link
              key={confirmTarget.playerId}
              to="/players/$playerId"
              params={{ playerId: confirmTarget.playerId }}
            >
              <button
                disabled={isCreating}
                className="border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 active:bg-brand-100"
              >
                Profil
              </button>
            </Link>            
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex justify-center gap-1 sm:gap-2"
          >
            {row.map((player) => {
              const isCurrentPlayer = player.playerId === currentPlayerId;
              const isChallengeable = challengeableIds.has(player.playerId);
              const isInChallenge = playersInChallenge.has(player.playerId) && !isCurrentPlayer;

              const card = (
                <div
                  className={`relative flex min-w-[4rem] flex-col items-center overflow-hidden border px-2 py-2 text-center transition sm:min-w-[4.5rem] ${
                    isCurrentPlayer
                      ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                      : isChallengeable
                        ? "cursor-pointer border-amber-400 bg-amber-50 ring-2 ring-amber-200 active:scale-95"
                        : isInChallenge
                          ? "border-orange-300 bg-orange-50"
                          : "border-brand-200 bg-white"
                  }`}
                >
                  {isChallengeable && (
                    <span className="absolute right-0.5 top-0.5 text-[0.5rem] leading-none text-amber-500" title="Herausfordern moeglich">⚔️</span>
                  )}
                  {isInChallenge && (
                    <span className="absolute left-0.5 top-0.5 text-[0.5rem] leading-none text-orange-500" title="In aktiver Herausforderung">🔒</span>
                  )}
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-3xl font-bold text-brand-500/[0.5]">
                    {player.rank}
                  </span>
                  <span className="relative text-xs font-semibold text-ink-950">
                    {player.firstName}
                  </span>
                  <span className="relative text-[0.65rem] leading-tight text-ink-700">
                    {player.lastName}
                  </span>
                </div>
              );

              // Challengeable players get a click handler instead of a link
              if (isChallengeable) {
                return (
                  <button
                    key={player.playerId}
                    onClick={() => handleChallengeClick(player)}
                    className="appearance-none"
                  >
                    {card}
                  </button>
                );
              }

              return (
                <Link
                  key={player.playerId}
                  to="/players/$playerId"
                  params={{ playerId: player.playerId }}
                >
                  {card}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChallengeHistory({ rankingId }: { rankingId: Id<"rankings"> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.challenges.getHistoryForRanking,
    { rankingId },
    { initialNumItems: 10 },
  );

  return (
    <div className="space-y-3 sm:border sm:border-brand-200 sm:bg-white sm:p-7 sm:shadow-sm">
      <h2 className="font-display text-lg text-ink-950">Herausforderungen</h2>
      <ChallengeHistoryList
        challenges={results}
        loadMore={loadMore}
        hasMore={status === "CanLoadMore"}
        isLoading={status === "LoadingFirstPage"}
      />
    </div>
  );
}
