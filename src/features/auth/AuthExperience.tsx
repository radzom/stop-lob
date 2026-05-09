import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

type AuthCardProps = {
  title: string;
  subtitle: string;
  submitLabel: string;
  switchLabel: string;
  switchAction: string;
  switchTo: "/login" | "/register";
  flow: "signIn" | "signUp";
};

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden md:border md:border-brand-200 md:bg-white md:shadow-sm">
      <div className="auth-accent-glow hidden md:block" aria-hidden="true" />
      <div className="grid md:grid-cols-[1.1fr_1fr]">
        <aside className="hidden min-h-[30rem] border-r border-brand-100 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 p-8 text-white md:flex md:flex-col md:justify-between lg:p-10">
          <div className="space-y-5">
            <img
              src="/logo-3b-pyramid-gray.svg"
              alt="Stop & Lob"
              className="h-12 w-12 bg-white/90 p-1.5"
            />
            <p className="font-display text-3xl leading-tight">
              Stop & Lob
            </p>
            <p className="max-w-sm text-sm text-brand-50/90 lg:text-base">
              Organize matches, challenge nearby players, and climb your
              ranking with transparent results.
            </p>
          </div>
          <div className="space-y-3 text-sm text-brand-100/90">
            <p>Built for mobile first.</p>
            <p>Fast updates with Convex realtime backend.</p>
          </div>
        </aside>

        <div className="auth-grid-bg p-0 sm:p-7 md:p-8 lg:p-10">
          <div className="mx-auto max-w-md space-y-6">
            <div className="space-y-3 md:hidden">
              <img
                src="/logo-3b-pyramid-gray.svg"
                alt="Club logo"
                className="h-12 w-12 border border-brand-200 bg-white p-1.5"
              />
              <h1 className="font-display text-3xl text-ink-950">
                Stop & Lob
              </h1>
            </div>

            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export function AuthCard({
  title,
  subtitle,
  submitLabel,
  switchLabel,
  switchAction,
  switchTo,
  flow,
}: AuthCardProps) {
  const { signIn } = useAuthActions();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-5 sm:border sm:border-brand-100 sm:bg-white/95 sm:p-6 sm:shadow-sm sm:backdrop-blur">
      <div className="space-y-2">
        <h2 className="font-display text-2xl text-ink-950">{title}</h2>
        <p className="text-sm text-ink-700">{subtitle}</p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setPending(true);

          const formData = new FormData(event.currentTarget);
          formData.set("flow", flow);

          void signIn("password", formData)
            .catch((authError: Error) => {
              setError(authError.message);
            })
            .finally(() => {
              setPending(false);
            });
        }}
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-ink-900">Email</span>
          <input
            className="w-full border border-brand-200 bg-white px-3.5 py-3 text-base text-ink-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            type="email"
            name="email"
            placeholder="you@club.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-ink-900">Password</span>
          <input
            className="w-full border border-brand-200 bg-white px-3.5 py-3 text-base text-ink-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            type="password"
            name="password"
            placeholder="At least 8 characters"
            autoComplete={flow === "signIn" ? "current-password" : "new-password"}
            required
          />
        </label>

        <button
          className="inline-flex w-full items-center justify-center bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={pending}
        >
          {pending ? "Please wait..." : submitLabel}
        </button>

        <p className="text-sm text-ink-700">
          {switchLabel}{" "}
          <Link
            to={switchTo}
            className="font-semibold text-brand-800 underline decoration-brand-300 underline-offset-4 transition hover:text-brand-900"
          >
            {switchAction}
          </Link>
        </p>

        {error && (
          <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
