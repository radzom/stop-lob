import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const Route = createFileRoute("/_authenticated/players/")({
  component: PlayersListPage,
});

function PlayersListPage() {
  const roles = useQuery(api.roles.getMyRoles);
  const isAdmin = roles?.some((r) => r.role === "admin") ?? false;
  const players = useQuery(api.playerProfiles.listAll);
  const [search, setSearch] = useState("");

  if (roles === undefined) {
    return (
      <div className="mx-auto w-full max-w-3xl text-sm text-ink-700">
        Wird geladen...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-3xl border border-brand-200 bg-white p-8 text-center shadow-sm">
        <p className="text-ink-700">Keine Berechtigung.</p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline"
        >
          Zurueck zur Uebersicht
        </Link>
      </div>
    );
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = players?.filter((p) => {
    if (normalizedSearch === "") return true;
    return (
      p.firstName.toLowerCase().includes(normalizedSearch) ||
      p.lastName.toLowerCase().includes(normalizedSearch)
    );
  });

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <h1 className="font-display text-2xl text-ink-950 sm:text-3xl">
        Spieler
      </h1>

      <input
        type="text"
        placeholder="Name suchen..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-brand-200 bg-white px-4 py-2.5 text-sm text-ink-950 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
      />

      {filtered === undefined && (
        <p className="text-sm text-ink-700">Wird geladen...</p>
      )}

      {filtered !== undefined && filtered.length === 0 && (
        <div className="border border-brand-200 bg-white p-8 text-center shadow-sm">
          <p className="text-ink-700">
            {normalizedSearch
              ? "Keine Spieler gefunden."
              : "Keine Spieler vorhanden."}
          </p>
        </div>
      )}

      {filtered !== undefined && filtered.length > 0 && (
        <div className="divide-y divide-brand-200 overflow-hidden border border-brand-200 bg-white shadow-sm">
          {filtered.map((player) => {
            const genderLabel =
              player.gender === "male" ? "Herren" : "Damen";
            return (
              <Link
                key={player._id}
                to="/profile/complete"
                search={{ playerId: player._id }}
                className="flex items-center justify-between px-5 py-3.5 transition hover:bg-brand-50 active:bg-brand-100"
              >
                <span className="text-sm font-semibold text-ink-950">
                  {player.lastName}, {player.firstName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    {genderLabel}
                  </span>
                  <span className="text-xs text-ink-700">
                    {player.yearOfBirth}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
