import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useNewspaper } from "../hooks/useNewspaper";
import { API_BASE_URL, authHeaders } from "../lib/api";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface UserInfo {
  full_name: string | null;
  username: string;
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

export function Navbar({ newspaperName, displayName }: NavbarProps) {
  const { newspaper } = useNewspaper();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);

  displayName ??= newspaperName
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  useEffect(() => {
    if (!newspaper) return;
    fetch(`${API_BASE_URL}/api/newspapers/${newspaper.id}/categories`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json() as Promise<{ data: Category[] }>;
      })
      .then((data) => setCategories(data.data))
      .catch(() => {});
  }, [newspaper?.id]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("Checking auth with token:", token);
    if (!token) return;
    console.log("Fetching user info with token:", token);
    fetch(`${API_BASE_URL}/api/users/me`, { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<UserInfo>;
      })
      .then((data) => setUser(data))
      .catch(() => {
        console.log("Something went wrong on backend.")
      });
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-12 py-4">
      <div className="flex items-center gap-10">
        <Link
          to={`/${newspaperName}`}
          className="text-[22px] font-extrabold tracking-tight text-foreground"
        >
          {displayName}
        </Link>
        <nav className="hidden gap-6 md:flex">
          <Link
            to={`/${newspaperName}`}
            className="text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/${newspaperName}/category/${cat.slug}`}
              className="text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {cat.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <button
            onClick={() => navigate(`/${newspaperName}/profile`)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted transition-colors"
          >
            <div className="h-8 w-8 shrink-0 rounded-full bg-primary flex items-center justify-center">
              <span className="text-[12px] font-semibold text-primary-foreground">
                {getInitials(user)}
              </span>
            </div>
            <span className="text-[14px] font-medium text-foreground">
              {user.full_name ?? user.username}
            </span>
            <ChevronDown size={16} className="text-muted-foreground" />
          </button>
        ) : (
          <>
            <Link
              to={`/${newspaperName}/login`}
              className="rounded-lg px-4 py-2 text-[14px] font-medium text-foreground hover:bg-muted"
            >
              Log in
            </Link>
            <Link
              to={`/${newspaperName}/register`}
              className="rounded-lg bg-primary px-4 py-2 text-[14px] font-semibold text-primary-foreground hover:opacity-90"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
