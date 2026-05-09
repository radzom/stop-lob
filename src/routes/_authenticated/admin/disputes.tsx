import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const Route = createFileRoute("/_authenticated/admin/disputes")({
  component: AdminDisputesPage,
});

type SetScore = {
  winnerScore: number;
  loserScore: number;
  isTiebreak: boolean;
};

type ResultSummary = {
  winnerId: Id<"players">;
  loserId: Id<"players">;
  sets: SetScore[];
  datePlayed: string;
  isWalkover: boolean;
};

function formatResult(
  result: ResultSummary,
  reporterName: string,
  winnerName: string,
  loserName: string,
) {
  if (result.isWalkover) {
    return `Walkover — ${winnerName} gewinnt`;
  }
  const setsStr = result.sets
    .map((s) => `${s.winnerScore}:${s.loserScore}`)
    .join(", ");
  return `${setsStr} — ${winnerName} gewinnt`;
}

function AdminDisputesPage() {
  const disputes = useQuery(api.challenges.getDisputedChallenges);
  const resolveChallenge = useMutation(api.challenges.adminResolveChallenge);
  const [confirmingId, setConfirmingId] = useState<{
    challengeId: Id<"challenges">;
    choice: "reported" | "counter";
    reporterName: string;
  } | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (disputes === undefined) {
    return (
      <div className="mx-auto w-full max-w-2xl p-4">
        <p className="text-sm text-ink-700">Wird geladen...</p>
      </div>
    );
  }

  const handleResolve = () => {
    if (!confirmingId) return;
    setIsResolving(true);
    setErrorMessage(null);
    void resolveChallenge({
      challengeId: confirmingId.challengeId,
      chosenResult: confirmingId.choice,
    })
      .then(() => {
        setSuccessMessage("Streitfall erfolgreich aufgeloest.");
        setConfirmingId(null);
      })
      .catch((error: Error) => {
        setErrorMessage(error.message);
        setConfirmingId(null);
      })
      .finally(() => {
        setIsResolving(false);
      });
  };

  return (
    <section className="mx-auto w-full max-w-2xl space-y-5 px-4 pb-24">
      <Link
        to="/"
        className="hidden text-sm font-semibold text-brand-700 hover:underline sm:inline-block"
      >
        ← Zurueck
      </Link>

      <h1 className="font-display text-2xl text-ink-950">
        Offene Streitfaelle
      </h1>

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
      {confirmingId && (
        <div className="border border-amber-300 bg-amber-50 px-4 py-4 space-y-3">
          <p className="text-sm font-medium text-amber-900">
            Ergebnis von <span className="font-bold">{confirmingId.reporterName}</span> uebernehmen?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleResolve}
              disabled={isResolving}
              className="border border-brand-600 bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50"
            >
              {isResolving ? "Wird verarbeitet..." : "Bestaetigen"}
            </button>
            <button
              onClick={() => setConfirmingId(null)}
              disabled={isResolving}
              className="border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 active:bg-brand-100"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {disputes.length === 0 ? (
        <div className="border border-brand-200 bg-brand-50 p-6 text-center">
          <p className="text-sm text-ink-700">
            Keine offenen Streitfaelle vorhanden.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => {
            const reportedResult = dispute.reportedResult;
            const counterResult = dispute.counterResult;
            if (!reportedResult || !counterResult) return null;

            // Determine winner/loser names for each result
            const getWinnerName = (result: ResultSummary) =>
              result.winnerId === dispute.challengerId
                ? dispute.challengerName
                : dispute.challengedName;
            const getLoserName = (result: ResultSummary) =>
              result.loserId === dispute.challengerId
                ? dispute.challengerName
                : dispute.challengedName;

            return (
              <div
                key={dispute._id}
                className="border border-brand-200 bg-white shadow-sm"
              >
                {/* Header */}
                <div className="border-b border-brand-100 px-4 py-3">
                  <p className="text-xs font-medium text-ink-500">
                    {dispute.rankingName}
                  </p>
                  <p className="text-sm font-semibold text-ink-900">
                    {dispute.challengerName}{" "}
                    <span className="font-normal text-ink-500">vs</span>{" "}
                    {dispute.challengedName}
                  </p>
                </div>

                {/* Side-by-side results */}
                <div className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 divide-brand-100">
                  {/* Reporter's result */}
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                      Ergebnis von {dispute.reporterName}
                    </p>
                    <p className="text-sm text-ink-900">
                      {formatResult(
                        reportedResult,
                        dispute.reporterName,
                        getWinnerName(reportedResult),
                        getLoserName(reportedResult),
                      )}
                    </p>
                    <p className="text-xs text-ink-500">
                      Gespielt am {reportedResult.datePlayed}
                    </p>
                    <button
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setConfirmingId({
                          challengeId: dispute._id,
                          choice: "reported",
                          reporterName: dispute.reporterName,
                        });
                      }}
                      className="mt-1 w-full border border-brand-600 bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:bg-brand-800"
                    >
                      Dieses Ergebnis uebernehmen
                    </button>
                  </div>

                  {/* Counter-reporter's result */}
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                      Ergebnis von {dispute.counterReporterName}
                    </p>
                    <p className="text-sm text-ink-900">
                      {formatResult(
                        counterResult,
                        dispute.counterReporterName,
                        getWinnerName(counterResult),
                        getLoserName(counterResult),
                      )}
                    </p>
                    <p className="text-xs text-ink-500">
                      Gespielt am {counterResult.datePlayed}
                    </p>
                    <button
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setConfirmingId({
                          challengeId: dispute._id,
                          choice: "counter",
                          reporterName: dispute.counterReporterName,
                        });
                      }}
                      className="mt-1 w-full border border-brand-600 bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:bg-brand-800"
                    >
                      Dieses Ergebnis uebernehmen
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
