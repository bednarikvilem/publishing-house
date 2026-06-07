import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../lib/api";
import {
  BarChartIcon,
  FileTextIcon,
  InboxIcon,
  LogOutIcon,
  MenuIcon,
  PlusIcon,
  TagIcon,
  UserIcon,
  XIcon,
} from "./Icons";
import { Button } from "@/components/ui/button";

interface UserMe {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  profile_picture: string | null;
  roles: string[];
}

// ── Nav item ──────────────────────────────────────────────────────────────────

function NavItem({
  icon,
  label,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  onClick?: () => void;
}) {
  const location = useLocation();
  const currentPath = location.pathname + location.search;
  const isActive = href
    ? href.includes("?")
      ? currentPath === href
      : location.pathname === href
    : false;

  return (
    <Link
      to={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-2xs font-medium transition-colors ${
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function NavSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-muted-foreground px-2 pt-2 pb-1 text-3xs font-semibold tracking-wider uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}

// ── Shared sidebar content ────────────────────────────────────────────────────

function SidebarContent({
  user,
  roles,
  np,
  children,
  onNavClick,
}: {
  user: UserMe | null;
  roles: Set<string>;
  np: string;
  children?: React.ReactNode;
  onNavClick?: () => void;
}) {
  const displayName = user?.full_name ?? user?.username ?? "…";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function handleLogOut() {
    localStorage.removeItem("token");
    window.location.href = `/${np}/login`;
  }

  return (
    <>
      {/* User info */}
      <div className="border-border flex items-center gap-3 border-b px-4 py-4">
        <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          {user?.profile_picture ? (
            <img
              src={user.profile_picture}
              alt={displayName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span className="text-muted-foreground text-2xs font-bold select-none">
              {initials}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-foreground truncate text-2xs font-semibold">
            {displayName}
          </span>
          {user?.username && (
            <span className="text-muted-foreground truncate text-3xs">
              @{user.username}
            </span>
          )}
        </div>
      </div>

      {/* Role-based nav sections */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
        {roles.has("AUTHOR") && (
          <NavSection title="Author">
            <NavItem
              icon={<FileTextIcon />}
              label="My Articles"
              href={`/${np}/author-dashboard?section=my-articles`}
              onClick={onNavClick}
            />
            <NavItem
              icon={<PlusIcon />}
              label="New Article"
              href={`/${np}/articles/new`}
              onClick={onNavClick}
            />
          </NavSection>
        )}

        {roles.has("EDITOR") && (
          <NavSection title="Editor">
            <NavItem
              icon={<InboxIcon />}
              label="Review Queue"
              href={`/${np}/author-dashboard?section=review-queue`}
              onClick={onNavClick}
            />
          </NavSection>
        )}

        {roles.has("NEWSPAPER_MANAGER") && (
          <NavSection title="Manager">
            <NavItem
              icon={<InboxIcon />}
              label="Editorial Queue"
              href={`/${np}/author-dashboard?section=editorial-queue`}
              onClick={onNavClick}
            />
            <NavItem
              icon={<TagIcon />}
              label="Categories"
              href={`/${np}/author-dashboard?section=categories`}
              onClick={onNavClick}
            />
            <NavItem
              icon={<BarChartIcon />}
              label="Statistics"
              href={`/${np}/author-dashboard?section=statistics`}
              onClick={onNavClick}
            />
          </NavSection>
        )}

        {roles.has("DIRECTOR") && (
          <NavSection title="Director">
            <NavItem
              icon={<BarChartIcon />}
              label="Statistics"
              href={`/${np}/author-dashboard?section=statistics`}
              onClick={onNavClick}
            />
          </NavSection>
        )}

        {children && (
          <>
            <div className="bg-border my-1 h-px" />
            {children}
          </>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="border-border flex flex-col gap-0.5 border-t px-3 py-3">
        <NavItem
          icon={<UserIcon />}
          label="My Profile"
          href={`/${np}/profile`}
          onClick={onNavClick}
        />
        <Button
          variant="ghost"
          onClick={handleLogOut}
          className="text-muted-foreground hover:bg-muted hover:text-foreground w-full justify-start gap-2.5 rounded-md px-2 py-2 text-2xs font-medium"
        >
          <LogOutIcon />
          Log Out
        </Button>
      </div>
    </>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  children?: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  const { newspaperName } = useParams<{ newspaperName: string }>();
  const np = newspaperName ?? "";
  const [user, setUser] = useState<UserMe | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/users/me`, { headers: authHeaders() })
      .then((res) =>
        res.ok ? (res.json() as Promise<UserMe>) : Promise.reject()
      )
      .then(setUser)
      .catch(() => {});
  }, []);

  const roles = new Set(user?.roles ?? []);

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="border-border bg-background hidden w-[var(--layout-sidebar-width)] shrink-0 flex-col border-r md:flex">
        <SidebarContent user={user} roles={roles} np={np}>
          {children}
        </SidebarContent>
      </aside>

      {/* ── Mobile trigger bar ──────────────────────────────────────────── */}
      <div className="border-border bg-background flex items-center border-b px-4 py-3 md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDrawerOpen(true)}
          className="text-muted-foreground hover:text-foreground gap-2"
        >
          <MenuIcon size={18} />
          Menu
        </Button>
      </div>

      {/* ── Mobile drawer overlay ────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer */}
          <aside className="border-border bg-background absolute inset-y-0 left-0 flex w-72 flex-col border-r shadow-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-foreground text-sm font-semibold">
                Dashboard Menu
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDrawerOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon size={18} />
              </Button>
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <SidebarContent
                user={user}
                roles={roles}
                np={np}
                onNavClick={() => setDrawerOpen(false)}
              >
                {children}
              </SidebarContent>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
