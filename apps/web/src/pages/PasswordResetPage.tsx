import { useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { Navbar } from "../components/Navbar";
import { AuthCard } from "../components/AuthCard";
import { FormField } from "../components/FormField";
import { CheckIcon } from "../components/Icons";
import { slugToDisplayName } from "../lib/utils";
import { useNewspaper } from "../hooks/useNewspaper";

export function PasswordResetPage() {
  const { newspaperName, newspaper } = useNewspaper();

  const [email, setEmail]         = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newspaper) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newspaper_id: newspaper.id, email }),
      });

      if (res.ok) { setSubmitted(true); return; }

      const body = await res.json();
      if (res.status === 422) {
        setError(body.fields?.email ?? "Please enter a valid email address.");
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
        subtitle="Reset your password"
      >
        {submitted ? (
          <div className="flex flex-col items-center gap-4">
            <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
              <CheckIcon size={22} className="text-foreground" />
            </div>
            <p className="text-muted-foreground text-center text-[14px]">
              If that address is registered, a reset link has been sent. Check your inbox.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-muted-foreground text-center text-[13px] leading-relaxed">
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </p>
            <FormField
              id="email"
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-destructive text-center text-[13px]">{error}</p>}
            <button
              type="submit"
              disabled={loading || !newspaper}
              className="bg-foreground text-background h-10 w-full rounded-md text-[14px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="text-muted-foreground text-center text-[14px]">
          Remember your password?{" "}
          <Link
            to={`/${newspaperName}/login`}
            className="text-foreground font-semibold underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}
