import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { login, type AuthUser } from "@/store/authStore";
import { clearProfile } from "@/store/profileStore";
import { resetHydration, hydrateProfileFromApi } from "@/lib/hydrate";
import { toast } from "sonner";

export const Route = createFileRoute("/impersonate")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: search.token as string | undefined,
    };
  },
  component: ImpersonatePage,
});

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function ImpersonatePage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    async function handleImpersonation() {
      if (!token) {
        toast.error("No impersonation token provided");
        window.location.href = "/auth";
        return;
      }

      const payload = parseJwt(token);
      if (!payload || !payload.id) {
        toast.error("Invalid impersonation token");
        window.location.href = "/auth";
        return;
      }

      const user: AuthUser = {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        hospitalId: payload.hospitalId || null,
        candidateId: payload.candidateId || null,
      };

      clearProfile();
      resetHydration();
      login(token, user);

      try {
        await hydrateProfileFromApi();
        toast.success(`Impersonating ${user.name}`);
        navigate({ to: "/" });
      } catch (err) {
        toast.error("Failed to load candidate profile");
        navigate({ to: "/" });
      }
    }

    handleImpersonation();
  }, [token, navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Initializing Impersonation...</h2>
        <p className="text-sm text-muted-foreground">Please wait while we log you in.</p>
      </div>
    </div>
  );
}
