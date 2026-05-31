import { useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { Navbar } from "../components/Navbar";
import { AuthCard } from "../components/AuthCard";
import { FormField } from "../components/FormField";
import { useNewspaper } from "../hooks/useNewspaper";
import { slugToDisplayName } from "../lib/utils";

export function SignUpPage() {
  const { newspaperName, newspaper } = useNewspaper();

  const [fullName, setFullName]           = useState("");
  const [username, setUsername]           = useState("");
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError]                 = useState<string | null>(null);
  const [fieldErrors, setFieldErrors]     = useState<Record<string, string>>({});
  const [loading, setLoading]             = useState(false);
  const [success, setSuccess]             = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      return;
    }
    if (!newspaper) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newspaper_id: newspaper.id,
          email,
          username,
          full_name: fullName || undefined,
          password,
        }),
      });

      if (res.status === 201) { setSuccess(true); return; }

      const text = await res.text();
      let body: { error?: string; fields?: Record<string, string> } = {};
      try { body = JSON.parse(text); } catch { body = { error: text.trim() }; }
      if (res.status === 409) {
        if (body.error === "EMAIL_TAKEN") {
          setFieldErrors({ email: "This email is already registered" });
        } else if (body.error === "USERNAME_TAKEN") {
          setFieldErrors({ username: "This username is already taken" });
        } else {
          setError("An account with these details already exists.");
        }
        return;
      }
      if (res.status === 422 && body.fields) { setFieldErrors(body.fields); return; }
      setError("Something went wrong. Please try again.");
    } catch {
      setError("Could not connect to the server. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
        <Navbar newspaperName={newspaperName ?? ""} />
        <AuthCard title={slugToDisplayName(newspaperName ?? "")} subtitle="Create your account">
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-foreground text-[22px] font-extrabold tracking-tight">
              Check your email
            </h2>
            <p className="text-muted-foreground text-[14px] leading-relaxed">
              We sent a confirmation link to{" "}
              <span className="text-foreground font-semibold">{email}</span>.
              Please verify your address to activate your account.
            </p>
            <Link
              to={`/${newspaperName}/login`}
              className="text-foreground mt-2 text-[14px] font-semibold underline-offset-4 hover:underline"
            >
              Back to Sign in
            </Link>
          </div>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
      <Navbar newspaperName={newspaperName ?? ""} />
      <AuthCard
        title={slugToDisplayName(newspaperName ?? "")}
        subtitle="Create your account"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField
            id="fullName"
            label="Full Name"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <FormField
            id="username"
            label="Username"
            type="text"
            placeholder="jannovak"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            error={fieldErrors.username}
          />
          <FormField
            id="email"
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            error={fieldErrors.email}
          />
          <FormField
            id="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            error={fieldErrors.password}
          />
          <FormField
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            error={fieldErrors.confirmPassword}
          />

          <p className="text-muted-foreground text-center text-[13px]">
            By signing up, you agree to our{" "}
            <span className="text-foreground font-semibold">Terms &amp; Privacy Policy</span>
          </p>

          {error && <p className="text-destructive text-center text-[13px]">{error}</p>}

          <button
            type="submit"
            disabled={loading || !newspaper}
            className="bg-foreground text-background h-10 w-full rounded-md text-[14px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>

          <div className="flex items-center gap-3">
            <div className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-[13px]">or</span>
            <div className="bg-border h-px flex-1" />
          </div>

          <button
            type="button"
            className="border-border bg-background text-foreground hover:bg-muted h-10 w-full rounded-md border text-[14px] font-medium transition-colors"
          >
            Sign up with Google
          </button>
        </form>

        <p className="text-muted-foreground text-center text-[14px]">
          Already have an account?{" "}
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
