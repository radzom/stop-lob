import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { useEffect } from "react";
import { AuthLayout, AuthCard } from "@/features/auth/AuthExperience";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      void navigate({ to: "/" });
    }
  }, [isAuthenticated, navigate]);

  return (
    <AuthLayout>
      <AuthCard
        title="Willkommen zurück"
        subtitle="Melde dich an, um auf dein Ranking-Dashboard zuzugreifen."
        submitLabel="Anmelden"
        switchLabel="Noch kein Konto?"
        switchAction="Registrieren"
        switchTo="/register"
        flow="signIn"
      />
    </AuthLayout>
  );
}
