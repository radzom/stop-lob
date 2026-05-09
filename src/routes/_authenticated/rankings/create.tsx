import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const Route = createFileRoute("/_authenticated/rankings/create")({
  component: CreateRankingPage,
});

function CreateRankingPage() {
  const roles = useQuery(api.roles.getMyRoles);
  const isAdmin = roles?.some((r) => r.role === "admin") ?? false;
  const createRanking = useMutation(api.rankings.create);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (roles === undefined) {
    return (
      <div className="mx-auto w-full max-w-3xl border border-brand-200 bg-white p-6 text-sm text-ink-700 shadow-sm">
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

  return (
    <section className="mx-auto w-full max-w-3xl border border-brand-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-5 space-y-2">
        <h1 className="font-display text-3xl text-ink-950">
          Rangliste erstellen
        </h1>
        <p className="text-sm text-ink-700 sm:text-base">
          Erstelle eine neue Rangliste fuer deinen Verein.
        </p>
      </div>

      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setErrorMessage(null);
          setIsSubmitting(true);

          const formData = new FormData(event.currentTarget);
          const name = (formData.get("name") as string).trim();
          const description = (formData.get("description") as string).trim();
          const genderFilter = formData.get("genderFilter") as string;
          const minAgeStr = (formData.get("minAge") as string).trim();
          const maxAgeStr = (formData.get("maxAge") as string).trim();

          if (!name) {
            setIsSubmitting(false);
            setErrorMessage("Bitte gib einen Namen ein.");
            return;
          }

          const minAge = minAgeStr ? Number(minAgeStr) : undefined;
          const maxAge = maxAgeStr ? Number(maxAgeStr) : undefined;

          if (minAge !== undefined && (!Number.isInteger(minAge) || minAge < 1)) {
            setIsSubmitting(false);
            setErrorMessage("Mindestalter muss eine positive ganze Zahl sein.");
            return;
          }
          if (maxAge !== undefined && (!Number.isInteger(maxAge) || maxAge < 1)) {
            setIsSubmitting(false);
            setErrorMessage("Hoechstalter muss eine positive ganze Zahl sein.");
            return;
          }
          if (minAge !== undefined && maxAge !== undefined && minAge > maxAge) {
            setIsSubmitting(false);
            setErrorMessage(
              "Mindestalter darf nicht groesser als Hoechstalter sein.",
            );
            return;
          }

          void createRanking({
            name,
            description: description || undefined,
            genderFilter:
              genderFilter === "male" || genderFilter === "female"
                ? genderFilter
                : undefined,
            minAge,
            maxAge,
          })
            .then(() => {
              void navigate({ to: "/" });
            })
            .catch((error: Error) => {
              setErrorMessage(error.message);
            })
            .finally(() => {
              setIsSubmitting(false);
            });
        }}
      >
        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-sm font-semibold text-ink-900">Name</span>
          <input
            name="name"
            type="text"
            required
            className="w-full border border-brand-200 bg-white px-3.5 py-3 text-base text-ink-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            placeholder="z.B. Herren Allgemein"
          />
        </label>

        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-sm font-semibold text-ink-900">
            Beschreibung
          </span>
          <textarea
            name="description"
            rows={2}
            className="w-full border border-brand-200 bg-white px-3.5 py-3 text-base text-ink-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            placeholder="Optionale Beschreibung"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-semibold text-ink-900">
            Geschlecht
          </span>
          <select
            name="genderFilter"
            defaultValue=""
            className="w-full border border-brand-200 bg-white px-3.5 py-3 text-base text-ink-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          >
            <option value="">Offen (alle)</option>
            <option value="male">Herren</option>
            <option value="female">Damen</option>
          </select>
        </label>

        <div />

        <label className="space-y-1.5">
          <span className="text-sm font-semibold text-ink-900">
            Mindestalter
          </span>
          <input
            name="minAge"
            type="number"
            min="1"
            step="1"
            className="w-full border border-brand-200 bg-white px-3.5 py-3 text-base text-ink-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            placeholder="z.B. 40"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-semibold text-ink-900">
            Hoechstalter
          </span>
          <input
            name="maxAge"
            type="number"
            min="1"
            step="1"
            className="w-full border border-brand-200 bg-white px-3.5 py-3 text-base text-ink-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            placeholder="z.B. 60"
          />
        </label>

        {errorMessage && (
          <p className="text-sm font-medium text-red-600 sm:col-span-2">
            {errorMessage}
          </p>
        )}

        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="border border-brand-600 bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50"
          >
            {isSubmitting ? "Wird erstellt..." : "Rangliste erstellen"}
          </button>
          <Link
            to="/"
            className="text-sm font-semibold text-ink-700 hover:underline"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </section>
  );
}
