import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { Navbar } from "../components/Navbar";

// TODO: replace with a real newspaper_id once a public lookup-by-name endpoint exists
const NEWSPAPER_ID = "550e8400-e29b-41d4-a716-446655440000";

export function LoginPage() {
  const { newspaperName } = useParams<{ newspaperName: string }>();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newspaper_id: NEWSPAPER_ID,
          email,
          password,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        navigate(`/${newspaperName}`);
        return;
      }

      const body = await res.json();

      if (res.status === 401) {
        setError("Invalid email or password.");
        return;
      }

      if (res.status === 403 && body.error === "EMAIL_NOT_VERIFIED") {
        setError("Please verify your email address before signing in.");
        return;
      }

      if (res.status === 404) {
        setError("Newspaper not found.");
        return;
      }

      setError("Something went wrong. Please try again.");
    } catch {
      setError("Could not connect to the server. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  const displayName = (newspaperName ?? "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <Navbar newspaperName={newspaperName ?? ""} />

      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] rounded-xl border border-border bg-card p-10 shadow-sm flex flex-col gap-8">
          {/* Brand */}
          <div className="flex flex-col items-center gap-3">
            <span
              className="text-[26px] font-black tracking-[-1px] text-foreground"
              style={{ fontFamily: "Outfit, Inter, sans-serif" }}
            >
              {displayName}
            </span>
            <span className="text-[15px] text-muted-foreground">
              Sign in to your account
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-[14px] font-medium text-foreground"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-[14px] font-medium text-foreground"
                >
                  Password
                </label>
                <Link
                  to={`/${newspaperName}/forgot-password`}
                  className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-center text-[13px] text-destructive">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-md bg-foreground text-[14px] font-semibold text-background hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[13px] text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Google (placeholder) */}
            <button
              type="button"
              className="h-10 w-full rounded-md border border-border bg-background text-[14px] font-medium text-foreground hover:bg-muted transition-colors"
            >
              Continue with Google
            </button>
          </form>

          {/* Sign up link */}
          <p className="text-center text-[14px] text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to={`/${newspaperName}/register`}
              className="font-semibold text-foreground hover:underline underline-offset-4"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
