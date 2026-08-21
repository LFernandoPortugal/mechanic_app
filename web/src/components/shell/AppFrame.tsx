"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "./AppShell";

const PUBLIC_FRAME_ROUTES = ["/login", "/quote/view", "/expired"];

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, userProfile, loading } = useAuth();
  const publicFrame = PUBLIC_FRAME_ROUTES.some((route) => pathname.startsWith(route));
  const superAdminFrame = pathname.startsWith("/super-admin");
  const workshopUser = Boolean(user && userProfile && !userProfile.roles.includes("SUPER_ADMIN"));

  if (publicFrame || superAdminFrame || (!loading && !workshopUser)) {
    return <><Header /><main id="main-content" tabIndex={-1}>{children}</main></>;
  }
  if (loading) return <main id="main-content" tabIndex={-1} className="min-h-[100dvh] bg-background">{children}</main>;
  return <main id="main-content" tabIndex={-1}><AppShell key={pathname}>{children}</AppShell></main>;
}
