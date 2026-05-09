import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
});

function HomePage() {
  const rankings = useQuery(api.rankings.list);
  const roles = useQuery(api.roles.getMyRoles);
  const isAdmin = roles?.some((r) => r.role === "admin") ?? false;

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink-950 sm:text-3xl">
          Ranglisten
        </h1>
        {isAdmin && (
          <Link
            to="/rankings/create"
            className="border border-brand-600 bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:bg-brand-800"
          >
            Rangliste erstellen
          </Link>
        )}
      </div>

      {rankings === undefined && (
        <p className="text-sm text-ink-700">Wird geladen...</p>
      )}

      {rankings !== undefined && rankings.length === 0 && (
        <div className="border border-brand-200 bg-white p-8 text-center shadow-sm">
          <p className="text-ink-700">Keine Ranglisten vorhanden.</p>
          {isAdmin && (
            <p className="mt-2 text-sm text-ink-700">
              Erstelle eine neue Rangliste ueber den Button oben.
            </p>
          )}
        </div>
      )}

      {rankings !== undefined && rankings.length > 0 && (
        <div className="grid gap-4">
          {rankings.map((ranking) => (
            <Link
              key={ranking._id}
              to="/rankings/$rankingId"
              params={{ rankingId: ranking._id }}
              className="block border border-brand-200 bg-white p-5 shadow-sm transition hover:border-brand-500 active:border-brand-600 active:bg-brand-50 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="font-display text-lg text-ink-950">
                    {ranking.name}
                  </h2>
                  {ranking.description && (
                    <p className="text-sm text-ink-700">
                      {ranking.description}
                    </p>
                  )}
                </div>
                {!ranking.isActive && (
                  <span className="shrink-0 bg-ink-700/10 px-2 py-0.5 text-xs font-semibold text-ink-700">
                    Inaktiv
                  </span>
                )}
              </div>
              <FilterBadges ranking={ranking} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function FilterBadges({
  ranking,
}: {
  ranking: { genderFilter?: string; minAge?: number; maxAge?: number };
}) {
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
    <div className="mt-3 flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge}
          className="bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700"
        >
          {badge}
        </span>
      ))}
    </div>
  );
}
