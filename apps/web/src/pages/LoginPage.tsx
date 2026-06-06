import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { Navbar } from "../components/Navbar";
import { AuthCard } from "../components/AuthCard";
import { FormField } from "../components/FormField";
import { useNewspaper } from "../hooks/useNewspaper";
import { slugToDisplayName } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export function LoginPage() {
  const { newspaperName, newspaper } = useNewspaper();
  const navigate = useNavigate();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newspaper) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newspaper_id: newspaper.id, email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("newspaper_id", newspaper.id);
        navigate(`/${newspaperName}`);
        return;
      }

      if (res.status === 401) { setError("Invalid email or password."); return; }
      if (res.status === 404) { setError("Newspaper not found."); return; }
      let body: { error?: string } = {};
      try { body = await res.json(); } catch {}
      if (res.status === 403 && body.error === "EMAIL_NOT_VERIFIED") {
        setError("Please verify your email address before signing in.");
        return;
      }
      setError("Something went wrong. Please try again.");
    } catch {
      setError("Could not connect to the server. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
      <Navbar newspaperName={newspaperName ?? ""} />
      <AuthCard
        title={slugToDisplayName(newspaperName ?? "")}
        subtitle="Sign in to your account"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField
            id="email"
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-foreground text-[14px] font-medium">
                Password
              </label>
              <Link
                to={`/${newspaperName}/forgot-password`}
                className="text-muted-foreground hover:text-foreground text-[13px] font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-destructive text-center text-[13px]">{error}</p>}

          <Button
            type="submit"
            disabled={loading || !newspaper}
            className="w-full"
          >
            {loading ? "Signing in…" : "Sign In"}
          </Button>

          <div className="flex items-center gap-3">
            <div className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-[13px]">or</span>
            <div className="bg-border h-px flex-1" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
          >
            Continue with Google
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-[14px]">
          Don't have an account?{" "}
          <Link
            to={`/${newspaperName}/register`}
            className="text-foreground font-semibold underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}
