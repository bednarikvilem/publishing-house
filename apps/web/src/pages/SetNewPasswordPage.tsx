import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { Navbar } from "../components/Navbar";
import { AuthCard } from "../components/AuthCard";
import { FormField } from "../components/FormField";
import { CheckIcon } from "../components/Icons";
import { slugToDisplayName } from "../lib/utils";
import { useNewspaper } from "../hooks/useNewspaper";
import { Button } from "../components/ui/button";

export function SetNewPasswordPage() {
  const { newspaperName, newspaper } = useNewspaper();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError]                     = useState<string | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [success, setSuccess]                 = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) { setSuccess(true); return; }

      const body = await res.json().catch(() => ({}));
      if (res.status === 400 && body.error === "INVALID_TOKEN") {
        setError("This link has expired or is invalid. Please request a new one.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Could not connect to the server. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  const themeClass = newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : "";

  if (!token) {
    return (
      <div className={`bg-background text-foreground min-h-screen w-full${themeClass}`}>
        <Navbar newspaperName={newspaperName ?? ""} />
        <AuthCard
          title={slugToDisplayName(newspaperName ?? "")}
          subtitle="Reset your password"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-muted-foreground text-sm">
              This link is invalid. Please request a new password reset.
            </p>
            <Link
              to={`/${newspaperName}/forgot-password`}
              className="text-foreground text-sm font-semibold underline-offset-4 hover:underline"
            >
              Request a new link
            </Link>
          </div>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className={`bg-background text-foreground min-h-screen w-full${themeClass}`}>
      <Navbar newspaperName={newspaperName ?? ""} />
      <AuthCard
        title={slugToDisplayName(newspaperName ?? "")}
        subtitle="Reset your password"
      >
        {success ? (
          <div className="flex flex-col items-center gap-4">
            <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
              <CheckIcon size={22} className="text-foreground" />
            </div>
            <p className="text-muted-foreground text-center text-sm">
              Your password has been reset. You can now sign in with your new password.
            </p>
            <Link
              to={`/${newspaperName}/login`}
              className="text-foreground text-sm font-semibold underline-offset-4 hover:underline"
            >
              Go to Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField
              id="password"
              label="New Password"
              type="password"
              placeholder="Enter your new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <FormField
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {error && (
              <div className="flex flex-col gap-1 text-center">
                <p className="text-destructive text-2xs">{error}</p>
                {error.includes("expired or is invalid") && (
                  <Link
                    to={`/${newspaperName}/forgot-password`}
                    className="text-foreground text-2xs font-semibold underline-offset-4 hover:underline"
                  >
                    Request a new link
                  </Link>
                )}
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? "Resetting…" : "Reset Password"}
            </Button>
          </form>
        )}

        <p className="text-muted-foreground text-center text-sm">
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
