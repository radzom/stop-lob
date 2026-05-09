import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { useEffect } from "react";
import { AuthLayout, AuthCard } from "@/features/auth/AuthExperience";

export const Route = createFileRoute("/register")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  component: RegisterPage,
});

function RegisterPage() {
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
        title="Konto erstellen"
        subtitle="Registriere dich mit deiner E-Mail und vervollständige dein Spielerprofil."
        submitLabel="Konto erstellen"
        switchLabel="Bereits registriert?"
        switchAction="Anmelden"
        switchTo="/login"
        flow="signUp"
      />
    </AuthLayout>
  );
}
