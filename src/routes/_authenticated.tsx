import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const location = useLocation();
  const isOnProfileComplete = location.pathname === "/profile/complete";
  const profile = useQuery(
    api.playerProfiles.getMyProfile,
    isAuthenticated ? {} : "skip",
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({ to: "/login" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && !isOnProfileComplete && profile === null) {
      void navigate({ to: "/profile/complete" });
    }
  }, [isAuthenticated, isOnProfileComplete, profile, navigate]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-3xl border border-brand-200 bg-white p-6 text-sm text-ink-700 shadow-sm">
        Wird geladen...
      </div>
    );
  }

  if (isOnProfileComplete) {
    return <Outlet />;
  }

  if (profile === undefined || profile === null) {
    return (
      <div className="mx-auto w-full max-w-3xl border border-brand-200 bg-white p-6 text-sm text-ink-700 shadow-sm">
        Profilstatus wird geladen...
      </div>
    );
  }

  return <Outlet />;
}
