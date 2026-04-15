import { Link } from "react-router-dom";

const NAV_LINKS = ["Home", "World", "Politics", "Technology", "Sports", "Culture"];

interface NavbarProps {
  newspaperName: string;
}

export function Navbar({ newspaperName }: NavbarProps) {
  const displayName = newspaperName
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

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
          {NAV_LINKS.map((item) => (
            <a
              key={item}
              href="#"
              className="text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item}
            </a>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <Link
          to="/login"
          className="rounded-lg px-4 py-2 text-[14px] font-medium text-foreground hover:bg-muted"
        >
          Log in
        </Link>
        <Link
          to="/register"
          className="rounded-lg bg-primary px-4 py-2 text-[14px] font-semibold text-primary-foreground hover:opacity-90"
        >
          Sign up
        </Link>
      </div>
    </header>
  );
}
