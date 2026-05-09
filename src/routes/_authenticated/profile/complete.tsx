import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  ProfileCompletionForm,
  type ProfilePrefillValues,
  type ProfileSaveData,
} from "@/features/auth/ProfileCompletionForm";
import type { Id } from "../../../../convex/_generated/dataModel";

type ProfileCompleteSearch = {
  playerId?: string;
};

export const Route = createFileRoute("/_authenticated/profile/complete")({
  validateSearch: (search: Record<string, unknown>): ProfileCompleteSearch => ({
    playerId: typeof search.playerId === "string" ? search.playerId : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (!context.auth.isLoading && !context.auth.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: ProfileCompletePage,
});

function ProfileCompletePage() {
  const { playerId } = Route.useSearch();

  if (playerId) {
    return <AdminEditProfile playerId={playerId as Id<"players">} />;
  }

  return <OwnProfileComplete />;
}

function AdminEditProfile({ playerId }: { playerId: Id<"players"> }) {
  const player = useQuery(api.playerProfiles.getById, { playerId });
  const roles = useQuery(api.roles.getMyRoles);
  const isAdmin = roles?.some((r) => r.role === "admin") ?? false;
  const adminUpdate = useMutation(api.playerProfiles.adminUpdateProfile);
  const navigate = useNavigate();

  if (player === undefined || roles === undefined) {
    return (
      <div className="mx-auto w-full max-w-3xl border border-brand-200 bg-white p-6 text-sm text-ink-700 shadow-sm">
        Profildaten werden geladen...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-3xl border border-brand-200 bg-white p-8 text-center shadow-sm">
        <p className="text-ink-700">Keine Berechtigung.</p>
      </div>
    );
  }

  if (player === null) {
    return (
      <div className="mx-auto w-full max-w-3xl border border-brand-200 bg-white p-8 text-center shadow-sm">
        <p className="text-ink-700">Spieler nicht gefunden.</p>
      </div>
    );
  }

  const initialProfile: ProfilePrefillValues = {
    firstName: player.firstName,
    lastName: player.lastName,
    email: player.email,
    phone: player.phone ?? "",
    yearOfBirth: String(player.yearOfBirth),
    gender: player.gender,
    profilePictureUrl: player.profilePictureUrl ?? "",
  };

  const handleSave = async (data: ProfileSaveData) => {
    await adminUpdate({ playerId, ...data });
  };

  return (
    <ProfileCompletionForm
      initialProfile={initialProfile}
      onComplete={() =>
        void navigate({
          to: "/players/$playerId",
          params: { playerId },
        })
      }
      onSave={handleSave}
      title={`${player.firstName} ${player.lastName} bearbeiten`}
      subtitle="Spielerprofil als Admin bearbeiten."
      submitLabel="Aenderungen speichern"
    />
  );
}

function OwnProfileComplete() {
  const profilePrefill = useQuery(
    api.playerProfiles.getProfileCompletionPrefill,
    {},
  );
  const navigate = useNavigate();

  if (profilePrefill === undefined) {
    return (
      <div className="mx-auto w-full max-w-3xl border border-brand-200 bg-white p-6 text-sm text-ink-700 shadow-sm">
        Profildaten werden geladen...
      </div>
    );
  }

  const initialProfile: ProfilePrefillValues =
    profilePrefill === null
      ? {
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          yearOfBirth: "",
          gender: "",
          profilePictureUrl: "",
        }
      : {
          firstName: profilePrefill.firstName,
          lastName: profilePrefill.lastName,
          email: profilePrefill.email,
          phone: profilePrefill.phone,
          yearOfBirth:
            profilePrefill.yearOfBirth === null
              ? ""
              : String(profilePrefill.yearOfBirth),
          gender: profilePrefill.gender ?? "",
          profilePictureUrl: profilePrefill.profilePictureUrl,
        };

  return (
    <ProfileCompletionForm
      initialProfile={initialProfile}
      onComplete={() => void navigate({ to: "/" })}
    />
  );
}
