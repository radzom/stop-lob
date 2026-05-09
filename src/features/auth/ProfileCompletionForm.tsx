import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export type ProfilePrefillValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  yearOfBirth: string;
  gender: "male" | "female" | "";
  profilePictureUrl: string;
};

export type ProfileSaveData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  yearOfBirth: number;
  gender: "male" | "female";
  profilePictureUrl?: string;
};

type ProfileCompletionFormProps = {
  initialProfile: ProfilePrefillValues | null;
  onComplete: () => void;
  onSave?: (data: ProfileSaveData) => Promise<unknown>;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
};

export function ProfileCompletionForm({
  initialProfile,
  onComplete,
  onSave,
  title = "Profil vervollstaendigen",
  subtitle = "Ein letzter Schritt nach der Registrierung: Bitte ergaenze deine Spielerdaten.",
  submitLabel = "Profil abschliessen",
}: ProfileCompletionFormProps) {
  const upsertMyProfile = useMutation(api.playerProfiles.upsertMyProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <section className="mx-auto w-full max-w-3xl border border-brand-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-5 space-y-2">
        <h1 className="font-display text-3xl text-ink-950">{title}</h1>
        <p className="text-sm text-ink-700 sm:text-base">
          {subtitle}
        </p>
      </div>

      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setErrorMessage(null);
          setIsSubmitting(true);

          const formData = new FormData(event.currentTarget);
          const firstName = getRequiredTextField(formData, "firstName");
          const lastName = getRequiredTextField(formData, "lastName");
          const email = getRequiredTextField(formData, "email");
          const phone = getRequiredTextField(formData, "phone");
          const yearValue = getRequiredTextField(formData, "yearOfBirth");
          const genderValue = getRequiredTextField(formData, "gender");
          const pictureValue = getOptionalTextField(formData, "profilePictureUrl");

          const yearOfBirth = Number(yearValue);
          const currentYear = new Date().getFullYear();

          if (!Number.isFinite(yearOfBirth) || yearOfBirth < 1940 || yearOfBirth > currentYear) {
            setIsSubmitting(false);
            setErrorMessage("Bitte gib ein gueltiges Geburtsjahr ein.");
            return;
          }

          if (genderValue !== "male" && genderValue !== "female") {
            setIsSubmitting(false);
            setErrorMessage("Bitte waehle ein gueltiges Geschlecht aus.");
            return;
          }

          const saveData: ProfileSaveData = {
            firstName,
            lastName,
            email,
            phone,
            yearOfBirth,
            gender: genderValue,
            profilePictureUrl: pictureValue === "" ? undefined : pictureValue,
          };

          const saveFn = onSave
            ? () => onSave(saveData)
            : () => upsertMyProfile(saveData);

          void saveFn()
            .then(() => {
              onComplete();
            })
            .catch((error: Error) => {
              setErrorMessage(error.message);
            })
            .finally(() => {
              setIsSubmitting(false);
            });
        }}
      >
        <label className="space-y-1.5 sm:col-span-1">
          <span className="text-sm font-semibold text-ink-900">Vorname</span>
          <input
            name="firstName"
            type="text"
            required
            defaultValue={initialProfile?.firstName ?? ""}
            className="w-full border border-brand-200 bg-white px-3.5 py-3 text-base text-ink-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            placeholder="Max"
          />
        </label>

        <label className="space-y-1.5 sm:col-span-1">
          <span className="text-sm font-semibold text-ink-900">Nachname</span>
          <input
            name="lastName"
            type="text"
            required
            defaultValue={initialProfile?.lastName ?? ""}
            className="w-full border border-brand-200 bg-white px-3.5 py-3 text-base text-ink-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            placeholder="Mustermann"
          />
        </label>

        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-sm font-semibold text-ink-900">E-Mail</span>
          <input
            name="email"
            type="email"
            required
            defaultValue={initialProfile?.email ?? ""}
            className="w-full border border-brand-200 bg-white px-3.5 py-3 text-base text-ink-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            placeholder="name@verein.de"
          />
        </label>

        <label className="space-y-1.5 sm:col-span-1">
          <span className="text-sm font-semibold text-ink-900">Telefon</span>
          <input
            name="phone"
            type="tel"
            defaultValue={initialProfile?.phone ?? ""}
            className="w-full border border-brand-200 bg-white px-3.5 py-3 text-base text-ink-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            placeholder="+49 ..."
          />
        </label>

        <label className="space-y-1.5 sm:col-span-1">
          <span className="text-sm font-semibold text-ink-900">Geburtsjahr</span>
          <input
            name="yearOfBirth"
            type="number"
            min={1940}
            max={new Date().getFullYear()}
            required
            defaultValue={initialProfile?.yearOfBirth ?? ""}
            className="w-full border border-brand-200 bg-white px-3.5 py-3 text-base text-ink-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            placeholder="1992"
          />
        </label>

        <label className="space-y-1.5 sm:col-span-1">
          <span className="text-sm font-semibold text-ink-900">Geschlecht</span>
          <select
            name="gender"
            required
            defaultValue={initialProfile?.gender ?? ""}
            className="w-full border border-brand-200 bg-white px-3.5 py-3 text-base text-ink-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          >
            <option value="" disabled>
              Bitte waehlen
            </option>
            <option value="male">Maennlich</option>
            <option value="female">Weiblich</option>
          </select>
        </label>

        <label className="space-y-1.5 sm:col-span-1">
          <span className="text-sm font-semibold text-ink-900">
            Profilbild (URL, optional)
          </span>
          <input
            name="profilePictureUrl"
            type="url"
            defaultValue={initialProfile?.profilePictureUrl ?? ""}
            className="w-full border border-brand-200 bg-white px-3.5 py-3 text-base text-ink-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            placeholder="https://..."
          />
        </label>

        <div className="sm:col-span-2 mt-2 flex flex-col gap-2">
          <button
            className="inline-flex w-full items-center justify-center bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Speichere..." : submitLabel}
          </button>
          {errorMessage && (
            <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

function getRequiredTextField(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function getOptionalTextField(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}
