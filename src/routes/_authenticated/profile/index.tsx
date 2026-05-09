import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../../convex/_generated/api";

export const Route = createFileRoute("/_authenticated/profile/")({
  component: ProfilePage,
});

function ProfilePage() {
  const profile = useQuery(api.playerProfiles.getMyProfile);
  const { signOut } = useAuthActions();

  if (profile === undefined) {
    return (
      <div className="mx-auto w-full max-w-3xl text-sm text-ink-700">
        Wird geladen...
      </div>
    );
  }

  if (profile === null) {
    return (
      <section className="mx-auto w-full max-w-3xl space-y-4">
        <h1 className="font-display text-2xl text-ink-950">Mein Profil</h1>
        <p className="text-sm text-ink-700">Kein Profil vorhanden.</p>
        <Link
          to="/profile/complete"
          className="inline-block border border-brand-600 bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:bg-brand-800"
        >
          Profil anlegen
        </Link>
      </section>
    );
  }

  const genderLabel = profile.gender === "male" ? "Maennlich" : "Weiblich";

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <h1 className="font-display text-2xl text-ink-950 sm:text-3xl">
        Mein Profil
      </h1>

      <div className="border border-brand-200 bg-white p-5 shadow-sm sm:p-7">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="font-semibold text-ink-700">Name</dt>
            <dd className="text-ink-950">
              {profile.firstName} {profile.lastName}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-semibold text-ink-700">E-Mail</dt>
            <dd className="text-ink-950">{profile.email}</dd>
          </div>
          {profile.phone && (
            <div className="flex justify-between">
              <dt className="font-semibold text-ink-700">Telefon</dt>
              <dd className="text-ink-950">{profile.phone}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="font-semibold text-ink-700">Jahrgang</dt>
            <dd className="text-ink-950">{profile.yearOfBirth}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-semibold text-ink-700">Geschlecht</dt>
            <dd className="text-ink-950">{genderLabel}</dd>
          </div>
        </dl>
      </div>

      <button
        onClick={() => void signOut()}
        className="w-full border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 active:bg-red-100"
      >
        Abmelden
      </button>
    </section>
  );
}
