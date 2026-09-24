"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut } from "lucide-react";
import { SITE } from "@/modules/landing/constants/site";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/app-sidebar/nav-user";
import { getInitials } from "@/components/app-sidebar/user-avatar-utils";
import { useRouter } from "next/navigation";
import {
  DashboardRoleProvider,
  useDashboardRole,
} from "@/components/dashboard/dashboard-role-context";
import { RoleSwitcher } from "@/components/dashboard/RoleSwitcher";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { OnboardingGate } from "@/modules/auth/components/OnboardingGate";
import { useEffect } from "react";

const AppSidebar = dynamic(
  () => import("@/components/app-sidebar").then((mod) => mod.AppSidebar),
  { loading: () => <Skeleton className="hidden w-64 shrink-0 rounded-none md:block" /> },
);

const BottomNav = dynamic(() =>
  import("@/components/app-sidebar/bottom-nav").then((mod) => mod.BottomNav),
);

interface HeaderUser {
  username?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

function DashboardHeader({ user }: { user: HeaderUser }) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { signOut } = useAuth();
  const initials = getInitials(user?.username, user?.email);

  return (
    <header className="sticky top-0 z-50 flex h-15 shrink-0 items-center justify-between gap-3 border-b bg-background px-4">
      <div className="flex min-w-0 items-center gap-3">
        {!isMobile && <SidebarTrigger />}

        {isMobile && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-[50%_50%_44%_56%] bg-[#0d684e] text-[10px] font-bold text-white">
              LR
            </span>
            <span className="truncate text-sm font-semibold">{SITE.name}</span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2">
        <RoleSwitcher className={isMobile ? "hidden sm:flex" : undefined} />

        {isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-center rounded-lg focus-visible:outline-hidden"
              >
                <UserAvatar
                  avatarUrl={user?.avatarUrl}
                  initials={initials}
                  className="size-8 cursor-pointer border transition-opacity hover:opacity-80"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mt-1 w-56 rounded-lg" showHeader={false}>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                  <UserAvatar avatarUrl={user?.avatarUrl} initials={initials} className="size-8" />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user?.username ?? "Invitado"}
                    </span>
                    {user?.email && (
                      <span className="text-muted-foreground truncate text-xs">
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-2 sm:hidden">
                <RoleSwitcher className="w-full [&_select]:w-full" />
              </div>
              <DropdownMenuSeparator className="sm:hidden" />
              <DropdownMenuItem onSelect={() => {
                void signOut().then(() => router.replace("/login"));
              }}>
                <LogOut className="mr-2 size-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { role } = useDashboardRole();
  const { user: profile } = useAuth();
  const user = {
    username: profile?.name ?? "",
    email: profile?.email ?? "",
    role,
    avatarUrl: profile?.avatarUrl || null,
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="flex flex-col overflow-auto">
        <DashboardHeader user={user} />
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
        <BottomNav role={user.role} />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, user, loading, error, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
    if (!loading && session && user?.status === "Inactivo") {
      void signOut().then(() => router.replace("/login?reason=inactive"));
    }
  }, [loading, router, session, signOut, user?.status]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Validando sesión...</div>;
  }
  if (!session) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Redirigiendo al inicio de sesión...</div>;
  }
  if (user?.status === "Inactivo") {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Cerrando una cuenta inactiva...</div>;
  }
  if (error || !user) {
    return <div className="grid min-h-screen place-items-center p-6 text-center text-sm text-destructive">{error ?? "No se encontró el perfil asociado a esta sesión."}</div>;
  }

  return (
    <DashboardRoleProvider>
      <DashboardShell>{children}</DashboardShell>
      {/* La bienvenida (foto y passkey) se muestra una sola vez por cuenta. */}
      {!user.onboardingCompleted ? <OnboardingGate user={user} /> : null}
    </DashboardRoleProvider>
  );
}
