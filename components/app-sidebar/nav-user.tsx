"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronsUpDown, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { getInitials } from "./user-avatar-utils";
import { useAuth } from "@/modules/auth/context/AuthContext";

type SessionUser = {
  username?: string | null;
  email?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
};

type NavUserProps = {
  user?: SessionUser | null;
};

export function UserAvatar({
  avatarUrl,
  initials,
  className,
}: {
  avatarUrl?: string | null;
  initials: string;
  className?: string;
}) {
  const classes = cn(
    "bg-sidebar-accent text-sidebar-accent-foreground flex aspect-square items-center justify-center overflow-hidden rounded-lg text-xs font-semibold",
    className,
  );
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt="" className={cn(classes, "object-cover")} />;
  }
  return <div className={classes}>{initials}</div>;
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { signOut } = useAuth();

  const displayName = user?.username ?? "Invitado";
  const displayEmail = user?.email ?? "";
  const initials = getInitials(user?.username, user?.email);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-1">
          <SidebarMenuButton asChild size="lg" tooltip="Mi usuario" className="flex-1">
            <Link href="/dashboard/profile">
              <UserAvatar avatarUrl={user?.avatarUrl} initials={initials} className="size-8" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                {displayEmail && (
                  <span className="text-muted-foreground truncate text-xs">
                    {displayEmail}
                  </span>
                )}
              </div>
            </Link>
          </SidebarMenuButton>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Abrir menú de usuario"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <ChevronsUpDown className="size-4" />
              </button>
            </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
            showHeader={false}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                <UserAvatar avatarUrl={user?.avatarUrl} initials={initials} className="size-8" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  {displayEmail && (
                    <span className="text-muted-foreground truncate text-xs">
                      {displayEmail}
                    </span>
                  )}
                  {user?.role && (
                    <span className="text-muted-foreground truncate text-[11px] uppercase tracking-wide">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={() => {
              void signOut().then(() => router.replace("/login"));
            }}>
              <LogOut className="mr-2 size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
