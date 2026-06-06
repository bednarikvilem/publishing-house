import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { API_BASE_URL, authHeaders, client, requestSubscription, getSubscriptionStatus } from "../lib/api";
import { slugToDisplayName } from "../lib/utils";

interface UserInfo {
  full_name: string | null;
  username: string;
  roles: string[];
}

interface NavbarProps {
  newspaperName: string;
  displayName?: string;
}

function getInitials(user: UserInfo): string {
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
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const [subscriptionStatus, setSubscriptionStatus] = useState<{ is_active: boolean; expires_at: string | null } | null>(null);
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

  useEffect(() => {
    const token = localStorage.getItem("token");
    const loggedInNewspaperId = localStorage.getItem("newspaper_id");
    if (!token || !newspaper || loggedInNewspaperId !== newspaper.id) {
      setUser(null);
      setSubscriptionStatus(null);
      return;
    }
    fetch(`${API_BASE_URL}/api/users/me`, { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<UserInfo>;
      })
      .then((data) => setUser(data))
      .catch(() => setUser(null));
    getSubscriptionStatus(newspaper.id)
      .then((s) => setSubscriptionStatus(s))
      .catch(() => {});
  }, [newspaper]);

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
    setUser(null);
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
          className="text-foreground shrink-0 text-[22px] font-extrabold tracking-tight"
        >
          {displayName}
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            to={`/${newspaperName}`}
            className="text-muted-foreground hover:text-foreground text-[14px] font-medium transition-colors"
          >
            Home
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/${newspaperName}/category/${cat.slug}`}
              className="text-muted-foreground hover:text-foreground text-[14px] font-medium transition-colors"
            >
              {cat.name}
            </Link>
          ))}
        </nav>

        {/* Desktop search bar */}
        <form onSubmit={handleSearch} className="hidden flex-1 md:flex">
          <div className="border-border bg-muted/50 focus-within:bg-background focus-within:border-ring flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border px-3 transition-colors">
            <SearchIcon size={15} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles…"
              className="text-foreground placeholder:text-muted-foreground w-full bg-transparent text-[13px] outline-none"
            />
          </div>
        </form>

        {/* Right-side controls */}
        <div className="ml-auto flex items-center gap-2">
          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-2 transition-colors"
          >
            {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
          </button>

          {/* Desktop: dashboard + user menu */}
          <div className="hidden items-center gap-2 md:flex">
            {hasDashboardAccess && (
              <Link
                to={`/${newspaperName}/author-dashboard`}
                className="bg-primary text-primary-foreground flex items-center gap-1.5 rounded-md px-4 py-2 text-[14px] font-medium hover:opacity-90"
              >
                <LayoutDashboardIcon size={16} />
                Dashboard
              </Link>
            )}
            {user && (
              subscribeMessage ? (
                <button
                  disabled
                  className="border-border text-muted-foreground cursor-default rounded-lg border px-4 py-2 text-[14px] font-medium opacity-60"
                >
                  {subscribeMessage}
                </button>
              ) : subscriptionStatus?.is_active ? (
                <button
                  disabled
                  className="border-border text-muted-foreground cursor-default rounded-lg border px-4 py-2 text-[14px] font-medium opacity-60"
                >
                  Subscribed until{" "}
                  {new Date(subscriptionStatus.expires_at!).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </button>
              ) : (
                <button
                  onClick={handleSubscribe}
                  className="border-border text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-[14px] font-medium transition-colors"
                >
                  Subscribe
                </button>
              )
            )}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="hover:bg-muted flex items-center gap-2 rounded-lg px-3 py-2 transition-colors"
                >
                  <div className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <span className="text-primary-foreground text-[12px] font-semibold">
                      {getInitials(user)}
                    </span>
                  </div>
                  <span className="text-foreground text-[14px] font-medium">
                    {user.full_name ?? user.username}
                  </span>
                  <ChevronDownIcon size={16} className="text-muted-foreground" />
                </button>
                {userMenuOpen && (
                  <div className="border-border bg-background absolute right-0 mt-1 w-44 rounded-lg border shadow-md">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate(`/${newspaperName}/profile`);
                      }}
                      className="text-foreground hover:bg-muted w-full rounded-t-lg px-4 py-2.5 text-left text-[14px] font-medium"
                    >
                      Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="text-destructive hover:bg-muted w-full rounded-b-lg px-4 py-2.5 text-left text-[14px] font-medium"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to={`/${newspaperName}/login`}
                  className="text-foreground hover:bg-muted rounded-lg px-4 py-2 text-[14px] font-medium"
                >
                  Log in
                </Link>
                <Link
                  to={`/${newspaperName}/register`}
                  className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[14px] font-semibold hover:opacity-90"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile: hamburger */}
          <button
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-2 transition-colors md:hidden"
          >
            {mobileMenuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ─────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="border-border bg-background border-t px-6 pb-4 md:hidden">
          {/* Search */}
          <form onSubmit={handleSearch} className="pt-4">
            <div className="border-border bg-muted/50 focus-within:bg-background focus-within:border-ring flex h-10 items-center gap-2 rounded-lg border px-3 transition-colors">
              <SearchIcon size={15} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles…"
                className="text-foreground placeholder:text-muted-foreground w-full bg-transparent text-[14px] outline-none"
              />
            </div>
          </form>

          {/* Nav links */}
          <nav className="mt-3 flex flex-col">
            <Link
              to={`/${newspaperName}`}
              onClick={() => setMobileMenuOpen(false)}
              className="text-muted-foreground hover:text-foreground border-border border-b py-3 text-[15px] font-medium transition-colors"
            >
              Home
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/${newspaperName}/category/${cat.slug}`}
                onClick={() => setMobileMenuOpen(false)}
                className="text-muted-foreground hover:text-foreground border-border border-b py-3 text-[15px] font-medium transition-colors"
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
                className="bg-primary text-primary-foreground flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-[14px] font-medium hover:opacity-90"
              >
                <LayoutDashboardIcon size={16} />
                Dashboard
              </Link>
            )}
            {user && (
              subscribeMessage ? (
                <button
                  disabled
                  className="border-border text-muted-foreground cursor-default rounded-md border px-4 py-2.5 text-center text-[14px] font-medium opacity-60"
                >
                  {subscribeMessage}
                </button>
              ) : subscriptionStatus?.is_active ? (
                <button
                  disabled
                  className="border-border text-muted-foreground cursor-default rounded-md border px-4 py-2.5 text-center text-[14px] font-medium opacity-60"
                >
                  Subscribed until{" "}
                  {new Date(subscriptionStatus.expires_at!).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </button>
              ) : (
                <button
                  onClick={() => { setMobileMenuOpen(false); handleSubscribe(); }}
                  className="border-border text-foreground hover:bg-muted rounded-md border px-4 py-2.5 text-[14px] font-medium transition-colors"
                >
                  Subscribe
                </button>
              )
            )}
            {user ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate(`/${newspaperName}/profile`);
                  }}
                  className="text-foreground hover:bg-muted rounded-md px-4 py-2.5 text-left text-[14px] font-medium transition-colors"
                >
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="text-destructive hover:bg-muted rounded-md px-4 py-2.5 text-left text-[14px] font-medium transition-colors"
                >
                  Log out
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link
                  to={`/${newspaperName}/login`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-foreground hover:bg-muted flex-1 rounded-lg px-4 py-2.5 text-center text-[14px] font-medium transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to={`/${newspaperName}/register`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-primary text-primary-foreground flex-1 rounded-lg px-4 py-2.5 text-center text-[14px] font-semibold hover:opacity-90"
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
