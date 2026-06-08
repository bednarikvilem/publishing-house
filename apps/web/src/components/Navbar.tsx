import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronDownIcon,
  LayoutDashboardIcon,
  SunIcon,
  MoonIcon,
  SearchIcon,
  MenuIcon,
  XIcon,
} from "./Icons";
import { useNewspaper } from "../hooks/useNewspaper";
import { useTheme } from "../hooks/useTheme";
import { useUser } from "../hooks/useUser";
import { useSubscriptionStatus } from "../hooks/useSubscriptionStatus";
import { API_BASE_URL, authHeaders, client, requestSubscription } from "../lib/api";
import { slugToDisplayName } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NavbarProps {
  newspaperName: string;
  displayName?: string;
}

function getInitials(user: { full_name: string | null; username: string }): string {
  if (user.full_name) {
    const parts = user.full_name.trim().split(/\s+/);
    return parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  }
  return user.username.slice(0, 2).toUpperCase();
}

const EDITORIAL_ROLES = ["AUTHOR", "EDITOR", "NEWSPAPER_MANAGER", "DIRECTOR", "SYSTEM_ADMINISTRATOR"];

export function Navbar({ newspaperName, displayName }: NavbarProps) {
  const { newspaper } = useNewspaper();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const [subscribeMessage, setSubscribeMessage] = useState<string | null>(null);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [searchParams]);

  displayName ??= newspaper?.name ?? slugToDisplayName(newspaperName);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", newspaper?.id],
    enabled: !!newspaper,
    queryFn: async () => {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaper!.id })
        .categories.get();
      if (error) throw error;
      return data.data;
    },
  });

  const { user: fetchedUser } = useUser();
  const { subscriptionStatus } = useSubscriptionStatus(newspaper?.id);

  // Only show the logged-in user when they authenticated against this specific newspaper
  const loggedInNewspaperId = localStorage.getItem("newspaper_id");
  const user = (newspaper && loggedInNewspaperId === newspaper.id) ? fetchedUser : null;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      setMobileMenuOpen(false);
      navigate(`/${newspaperName}/search?q=${encodeURIComponent(q)}`);
    }
  }

  async function handleSubscribe() {
    if (!newspaper) return;
    try {
      await requestSubscription(newspaper.id);
      setSubscribeMessage("Check your email for your subscription QR code.");
    } catch {
      setSubscribeMessage("Failed to send QR code. Please try again.");
    }
  }

  async function handleLogout() {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: authHeaders(),
    }).catch(() => {});
    localStorage.removeItem("token");
    localStorage.removeItem("newspaper_id");
    queryClient.setQueryData(["me"], null);
    queryClient.setQueryData(["subscription-status", newspaper?.id], null);
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    navigate(`/${newspaperName}/login`);
  }

  const hasDashboardAccess = user?.roles.some((r) => EDITORIAL_ROLES.includes(r));

  return (
    <header className="border-border bg-background relative z-10 border-b">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 py-4 md:px-12">
        {/* Logo */}
        <Link
          to={`/${newspaperName}`}
          className="text-foreground shrink-0 text-xl-plus font-extrabold tracking-tight"
        >
          {displayName}
        </Link>

        {/* Desktop search bar */}
        <form onSubmit={handleSearch} className="hidden flex-1 md:flex">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon size={15} className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 shrink-0" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles…"
              className="pl-8 text-2xs bg-muted/50 focus-visible:bg-background rounded-lg"
            />
          </div>
        </form>

        {/* Right-side controls */}
        <div className="ml-auto flex items-center gap-2">
          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="text-muted-foreground hover:text-foreground"
          >
            {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
          </Button>

          {/* Desktop: dashboard + user menu */}
          <div className="hidden items-center gap-2 md:flex">
            {hasDashboardAccess && (
              <Link
                to={`/${newspaperName}/author-dashboard`}
                className="bg-primary text-primary-foreground flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                <LayoutDashboardIcon size={16} />
                Dashboard
              </Link>
            )}
            {user && (
              subscribeMessage ? (
                <Button variant="outline" disabled className="rounded-lg px-4 text-sm cursor-default">
                  {subscribeMessage}
                </Button>
              ) : subscriptionStatus?.is_active ? (
                <Button variant="outline" disabled className="rounded-lg px-4 text-sm cursor-default">
                  Subscribed until{" "}
                  {new Date(subscriptionStatus.expires_at!).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Button>
              ) : (
                <Button variant="outline" onClick={handleSubscribe} className="rounded-lg px-4 text-sm">
                  Subscribe
                </Button>
              )
            )}
            {user ? (
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2"
                >
                  <div className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <span className="text-primary-foreground text-xs font-semibold">
                      {getInitials(user)}
                    </span>
                  </div>
                  <span className="text-foreground text-sm font-medium">
                    {user.full_name ?? user.username}
                  </span>
                  <ChevronDownIcon size={16} className="text-muted-foreground" />
                </Button>
                {userMenuOpen && (
                  <div className="border-border bg-background absolute right-0 mt-1 w-44 overflow-hidden rounded-lg border shadow-md">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate(`/${newspaperName}/profile`);
                      }}
                      className="text-foreground w-full justify-start rounded-none px-4 py-2.5 text-sm font-medium"
                    >
                      Profile
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="text-destructive hover:text-destructive w-full justify-start rounded-none px-4 py-2.5 text-sm font-medium"
                    >
                      Log out
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to={`/${newspaperName}/login`}
                  className="text-foreground hover:bg-muted rounded-lg px-4 py-2 text-sm font-medium"
                >
                  Log in
                </Link>
                <Link
                  to={`/${newspaperName}/register`}
                  className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile: hamburger */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            className="text-muted-foreground hover:text-foreground md:hidden"
          >
            {mobileMenuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
          </Button>
        </div>
      </div>

      {/* ── Category strip (desktop) ────────────────────────────────────── */}
      {categories.length > 0 && (
        <nav className="border-border hidden overflow-x-auto border-t md:flex">
          <div className="flex items-center gap-1 px-6 md:px-12">
            <Link
              to={`/${newspaperName}`}
              className="text-muted-foreground hover:text-foreground shrink-0 px-3 py-2.5 text-sm font-medium transition-colors"
            >
              Home
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/${newspaperName}/category/${cat.slug}`}
                className="text-muted-foreground hover:text-foreground shrink-0 px-3 py-2.5 text-sm font-medium transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* ── Mobile menu ─────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="border-border bg-background border-t px-6 pb-4 md:hidden">
          {/* Search */}
          <form onSubmit={handleSearch} className="pt-4">
            <div className="relative">
              <SearchIcon size={15} className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 shrink-0" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles…"
                className="pl-8 text-sm rounded-lg"
              />
            </div>
          </form>

          {/* Nav links */}
          <nav className="mt-3 flex flex-col">
            <Link
              to={`/${newspaperName}`}
              onClick={() => setMobileMenuOpen(false)}
              className="text-muted-foreground hover:text-foreground border-border border-b py-3 text-xs-plus font-medium transition-colors"
            >
              Home
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/${newspaperName}/category/${cat.slug}`}
                onClick={() => setMobileMenuOpen(false)}
                className="text-muted-foreground hover:text-foreground border-border border-b py-3 text-xs-plus font-medium transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </nav>

          {/* User actions */}
          <div className="mt-3 flex flex-col gap-2">
            {hasDashboardAccess && (
              <Link
                to={`/${newspaperName}/author-dashboard`}
                onClick={() => setMobileMenuOpen(false)}
                className="bg-primary text-primary-foreground flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium hover:opacity-90"
              >
                <LayoutDashboardIcon size={16} />
                Dashboard
              </Link>
            )}
            {user && (
              subscribeMessage ? (
                <Button variant="outline" disabled className="rounded-md px-4 py-2.5 text-sm cursor-default">
                  {subscribeMessage}
                </Button>
              ) : subscriptionStatus?.is_active ? (
                <Button variant="outline" disabled className="rounded-md px-4 py-2.5 text-sm cursor-default">
                  Subscribed until{" "}
                  {new Date(subscriptionStatus.expires_at!).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Button>
              ) : (
                <Button variant="outline" onClick={() => { setMobileMenuOpen(false); handleSubscribe(); }} className="rounded-md px-4 py-2.5 text-sm">
                  Subscribe
                </Button>
              )
            )}
            {user ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate(`/${newspaperName}/profile`);
                  }}
                  className="text-foreground w-full justify-start rounded-md px-4 py-2.5 text-sm font-medium"
                >
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-destructive hover:text-destructive w-full justify-start rounded-md px-4 py-2.5 text-sm font-medium"
                >
                  Log out
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link
                  to={`/${newspaperName}/login`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-foreground hover:bg-muted flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to={`/${newspaperName}/register`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-primary text-primary-foreground flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold hover:opacity-90"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
