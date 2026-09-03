import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/auth/AuthContext";
import type { UserRole } from "@/types/database";

export function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children: ReactNode;
}) {
  const { session, profile, loading } = useAuth();

  if (loading) return <FullscreenLoader />;
  if (!session || !profile) return <Navigate to="/login" replace />;
  if (!profile.active || !roles.includes(profile.role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function FullscreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-signal/30 border-t-signal" />
    </div>
  );
}
