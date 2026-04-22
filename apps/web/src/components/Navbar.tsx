import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNewspaper } from "../hooks/useNewspaper";
import { API_BASE_URL } from "../lib/api";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface NavbarProps {
  newspaperName: string;
  displayName?: string;
}

export function Navbar({ newspaperName, displayName }: NavbarProps) {
  const { newspaper } = useNewspaper();
  const [categories, setCategories] = useState<Category[]>([]);

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
      </div>
    </header>
  );
}
