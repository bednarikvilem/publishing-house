import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";

export function AdminLoginPage() {
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
      const res = await fetch(`${API_BASE_URL}/api/auth/global/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        navigate("/admin/dashboard");
        return;
      }

      const body = await res.json();
      if (res.status === 401) {
        setError("Invalid email or password.");
        return;
      }
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
    <div className="bg-background text-foreground min-h-screen w-full flex items-center justify-center px-4 py-12">
      <div className="border-border bg-card flex w-full max-w-[420px] flex-col gap-8 rounded-xl border p-10 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <span
            className="text-foreground text-[26px] font-black tracking-[-1px]"
            style={{ fontFamily: "Outfit, Inter, sans-serif" }}
          >
            Platform Administration
          </span>
          <span className="text-muted-foreground text-[15px]">
            System Administrator Login
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-foreground text-[14px] font-medium">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring/50 focus:border-ring h-10 w-full rounded-md border px-3 py-2 text-[14px] focus:ring-2 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-foreground text-[14px] font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring/50 focus:border-ring h-10 w-full rounded-md border px-3 py-2 text-[14px] focus:ring-2 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-destructive text-center text-[13px]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-foreground text-background h-10 w-full rounded-md text-[14px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
