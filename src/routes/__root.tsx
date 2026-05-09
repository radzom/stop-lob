import { createRootRouteWithContext, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export interface RouterContext {
  auth: {
    isAuthenticated: boolean;
    isLoading: boolean;
  };
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="min-h-screen bg-page text-ink-900">
      <header className="sticky top-0 z-10 hidden border-b border-brand-200/70 bg-white/85 px-4 py-3 backdrop-blur sm:block sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo-3b-pyramid-gray.svg"
              alt="Club logo"
              className="h-8 w-8 border border-brand-200 bg-white p-1"
            />
            <p className="font-display text-base font-semibold text-ink-950 sm:text-lg">
              Stop & Lob
            </p>
          </div>
          <Link
            to="/anleitung"
            className="text-sm font-medium text-ink-500 hover:text-ink-700"
          >
            Anleitung
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-5 sm:px-6 sm:pb-8 sm:pt-8">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}

function BottomNav() {
  const { isAuthenticated } = useConvexAuth();
  const matches = useMatches();
  const roles = useQuery(api.roles.getMyRoles, isAuthenticated ? {} : "skip");
  const isAdmin = roles?.some((r) => r.role === "admin") ?? false;

  if (!isAuthenticated) return null;

  const currentPath = matches[matches.length - 1]?.pathname ?? "/";

  const isRankingsActive =
    currentPath === "/" || currentPath.startsWith("/rankings");
  const isPlayersActive = currentPath.startsWith("/players");
  const isDisputesActive = currentPath.startsWith("/admin/disputes");
  const isAnleitungActive = currentPath.startsWith("/anleitung");
  const isProfileActive = currentPath.startsWith("/profile");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-brand-200/70 bg-white/95 backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-md">
        <Link
          to="/"
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition ${
            isRankingsActive
              ? "text-brand-600"
              : "text-ink-500 hover:text-ink-700"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="m22 3.5-4 4L16 6" />
          </svg>
          Ranglisten
        </Link>
        {isAdmin && (
          <Link
            to="/players"
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition ${
              isPlayersActive
                ? "text-brand-600"
                : "text-ink-500 hover:text-ink-700"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Spieler
          </Link>
        )}
        {isAdmin && (
          <Link
            to="/admin/disputes"
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition ${
              isDisputesActive
                ? "text-brand-600"
                : "text-ink-500 hover:text-ink-700"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Streitfaelle
          </Link>
        )}
        <Link
          to="/anleitung"
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition ${
            isAnleitungActive
              ? "text-brand-600"
              : "text-ink-500 hover:text-ink-700"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Hilfe
        </Link>
        <Link
          to="/profile"
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition ${
            isProfileActive
              ? "text-brand-600"
              : "text-ink-500 hover:text-ink-700"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Profil
        </Link>
      </div>
    </nav>
  );
}
