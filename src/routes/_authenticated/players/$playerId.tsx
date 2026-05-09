import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ChallengeHistoryList } from "../../../components/ChallengeHistoryList";

export const Route = createFileRoute("/_authenticated/players/$playerId")({
  component: PlayerDetailPage,
});

function PlayerDetailPage() {
  const { playerId } = Route.useParams();
  const typedPlayerId = playerId as Id<"players">;
  const player = useQuery(api.playerProfiles.getById, {
    playerId: typedPlayerId,
  });
  const rankings = useQuery(api.rankingParticipation.getRankingsForPlayer, {
    playerId: typedPlayerId,
  });
  const myProfile = useQuery(api.playerProfiles.getMyProfile);
  const roles = useQuery(api.roles.getMyRoles);
  const isAdmin = roles?.some((r) => r.role === "admin") ?? false;
  const isOwnProfile = myProfile?._id === typedPlayerId;

  if (player === undefined) {
    return (
      <div className="mx-auto w-full max-w-3xl text-sm text-ink-700">
        Wird geladen...
      </div>
    );
  }

  if (player === null) {
    return (
      <div className="mx-auto w-full max-w-3xl border border-brand-200 bg-white p-8 text-center shadow-sm">
        <p className="text-ink-700">Spieler nicht gefunden.</p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline"
        >
          Zurueck zur Uebersicht
        </Link>
      </div>
    );
  }

  const genderLabel = player.gender === "male" ? "Maennlich" : "Weiblich";

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <Link
        to="/"
        className="hidden text-sm font-semibold text-brand-700 hover:underline sm:inline-block"
      >
        ← Zurueck
      </Link>

      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-2xl text-ink-950 sm:text-3xl">
          <span>{player.firstName}</span>{" "}
          <span className="block sm:inline">{player.lastName}</span>
        </h1>
        <ProfilePicture
          url={player.profilePictureUrl}
          name={`${player.firstName} ${player.lastName}`}
          canEdit={isOwnProfile}
        />
      </div>

      <div className="border border-brand-200 bg-white p-5 shadow-sm sm:p-7">
        <dl className="space-y-3 text-sm">
          <EditableField
            label="E-Mail"
            value={player.email}
            field="email"
            type="email"
            canEdit={isOwnProfile}
          />
          <EditableField
            label="Telefon"
            value={player.phone ?? ""}
            field="phone"
            type="tel"
            canEdit={isOwnProfile}
          />
          <div className="flex justify-between">
            <dt className="font-semibold text-ink-700">Jahrgang</dt>
            <dd className="text-ink-950">{player.yearOfBirth}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-semibold text-ink-700">Geschlecht</dt>
            <dd className="text-ink-950">{genderLabel}</dd>
          </div>
        </dl>
      </div>

      {isAdmin && !isOwnProfile && (
        <Link
          to="/profile/complete"
          search={{ playerId }}
          className="inline-block border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 active:bg-brand-100"
        >
          Profil bearbeiten
        </Link>
      )}

      <div className="space-y-3">
        <h2 className="font-display text-lg text-ink-950">Ranglisten</h2>
        {rankings === undefined && (
          <p className="text-sm text-ink-700">Wird geladen...</p>
        )}
        {rankings !== undefined && rankings.length === 0 && (
          <div className="border border-brand-200 bg-brand-50 p-5 text-center">
            <p className="text-sm text-ink-700">
              Noch in keiner Rangliste eingetragen.
            </p>
          </div>
        )}
        {rankings !== undefined && rankings.length > 0 && (
          <div className="grid gap-3">
            {rankings.map((r) => (
              <Link
                key={r.rankingId}
                to="/rankings/$rankingId"
                params={{ rankingId: r.rankingId }}
                className="flex items-center justify-between border border-brand-200 bg-white p-4 transition hover:border-brand-500 active:border-brand-600 active:bg-brand-50"
              >
                <span className="text-sm font-semibold text-ink-950">
                  {r.rankingName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    Rang {r.rank}
                  </span>
                  {!r.isActive && (
                    <span className="bg-ink-700/10 px-2 py-0.5 text-xs font-semibold text-ink-700">
                      Inaktiv
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ChallengeHistory playerId={typedPlayerId} />
    </section>
  );
}

// ── Inline-editable field ────────────────────────────────────────────

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-3.5 w-3.5"}
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function EditableField({
  label,
  value,
  field,
  type,
  canEdit,
}: {
  label: string;
  value: string;
  field: "email" | "phone" | "profilePictureUrl";
  type: string;
  canEdit: boolean;
}) {
  const updateContact = useMutation(api.playerProfiles.updateMyContactInfo);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    void updateContact({ [field]: editValue })
      .then(() => setIsEditing(false))
      .catch(() => setEditValue(value))
      .finally(() => setIsSaving(false));
  };

  if (!value && !canEdit) return null;

  if (isEditing) {
    return (
      <div className="space-y-1.5">
        <dt className="font-semibold text-ink-700">{label}</dt>
        <div className="flex gap-2">
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setEditValue(value);
                setIsEditing(false);
              }
            }}
            className="flex-1 border border-brand-200 px-2.5 py-1 text-sm text-ink-950 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            disabled={isSaving}
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50"
          >
            OK
          </button>
          <button
            onClick={() => {
              setEditValue(value);
              setIsEditing(false);
            }}
            disabled={isSaving}
            className="border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 active:bg-brand-100"
          >
            X
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between">
      <dt className="font-semibold text-ink-700">{label}</dt>
      <dd className="flex items-center gap-1.5 text-ink-950">
        {value || <span className="text-ink-500">—</span>}
        {canEdit && (
          <button
            onClick={() => {
              setEditValue(value);
              setIsEditing(true);
            }}
            className="rounded-md border border-ink-200 bg-white p-1 text-ink-400 transition hover:border-brand-300 hover:text-brand-600"
            title={`${label} bearbeiten`}
          >
            <PencilIcon />
          </button>
        )}
      </dd>
    </div>
  );
}

// ── Profile picture ──────────────────────────────────────────────────

function ProfilePicture({
  url,
  name,
  canEdit,
}: {
  url?: string;
  name: string;
  canEdit: boolean;
}) {
  const updateContact = useMutation(api.playerProfiles.updateMyContactInfo);
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(url ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSave = () => {
    setIsSaving(true);
    void updateContact({ profilePictureUrl: editUrl })
      .then(() => setIsEditing(false))
      .catch(() => setEditUrl(url ?? ""))
      .finally(() => setIsSaving(false));
  };

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <button
        onClick={canEdit ? () => { setEditUrl(url ?? ""); setIsEditing(true); } : undefined}
        className={`relative h-16 w-16 overflow-hidden border-2 border-brand-200 ${canEdit ? "cursor-pointer transition hover:border-brand-500" : "cursor-default"}`}
        title={canEdit ? "Profilbild aendern" : undefined}
        type="button"
      >
        {url ? (
          <img src={url} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-brand-100 font-display text-lg font-bold text-brand-600">
            {initials}
          </span>
        )}
        {canEdit && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/30">
            <PencilIcon className="h-4 w-4 text-white opacity-0 transition group-hover:opacity-100" />
          </span>
        )}
      </button>
      {isEditing && (
        <div className="w-48 space-y-1.5">
          <input
            type="url"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="https://..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setIsEditing(false);
            }}
            className="w-full border border-brand-200 px-2.5 py-1 text-xs text-ink-950 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            disabled={isSaving}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50"
            >
              OK
            </button>
            <button
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className="border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 active:bg-brand-100"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChallengeHistory({ playerId }: { playerId: Id<"players"> }) {
  const challenges = useQuery(api.challenges.getHistoryForPlayer, {
    playerId,
  });

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg text-ink-950">
        Herausforderungen
      </h2>
      {challenges === undefined ? (
        <p className="text-sm text-ink-700">Wird geladen...</p>
      ) : (
        <ChallengeHistoryList
          challenges={challenges}
          showRanking
        />
      )}
    </div>
  );
}
