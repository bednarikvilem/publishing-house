import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { useTheme } from "../hooks/useTheme";
import { SunIcon, MoonIcon } from "../components/Icons";
import { AuthCard } from "../components/AuthCard";
import { FormField } from "../components/FormField";

interface GlobalLoginPageProps {
  title: string;
  subtitle: string;
  redirectTo: string;
}

export function GlobalLoginPage({ title, subtitle, redirectTo }: GlobalLoginPageProps) {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/global/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        navigate(redirectTo);
        return;
      }

      const body = await res.json();
      if (res.status === 401) { setError("Invalid email or password."); return; }
      if (res.status === 403 && body.error === "EMAIL_NOT_VERIFIED") {
        setError("This account has not been verified.");
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
    <div className="bg-background text-foreground min-h-screen w-full">
      <button
        onClick={toggle}
        aria-label="Toggle dark mode"
        className="text-muted-foreground hover:text-foreground hover:bg-muted fixed top-4 right-4 rounded-md p-2 transition-colors"
      >
        {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
      </button>

      <AuthCard title={title} subtitle={subtitle}>
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
          <FormField
            id="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-destructive text-center text-2xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-foreground text-background h-10 w-full rounded-md text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </AuthCard>
    </div>
  );
}
