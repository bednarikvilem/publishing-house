import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { Navbar } from "../components/Navbar";

// TODO: replace with a real newspaper_id once a public lookup-by-name endpoint exists
const NEWSPAPER_ID = "550e8400-e29b-41d4-a716-446655440000";

export function SignUpPage() {
  const { newspaperName } = useParams<{ newspaperName: string }>();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newspaper_id: NEWSPAPER_ID,
          email,
          username,
          full_name: fullName || undefined,
          password,
        }),
      });

      if (res.status === 201) {
        setSuccess(true);
        return;
      }

      const body = await res.json();

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

      if (res.status === 422 && body.fields) {
        setFieldErrors(body.fields);
        return;
      }

      setError("Something went wrong. Please try again.");
    } catch {
      setError("Could not connect to the server. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="w-full min-h-screen bg-background text-foreground">
        <Navbar newspaperName={newspaperName ?? ""} />
        <div className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4 py-12">
          <div className="w-full max-w-[420px] rounded-xl border border-border bg-card p-10 shadow-sm text-center flex flex-col gap-4">
            <h2 className="text-[22px] font-extrabold tracking-tight text-foreground">
              Check your email
            </h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              We sent a confirmation link to <span className="font-semibold text-foreground">{email}</span>.
              Please verify your address to activate your account.
            </p>
            <Link
              to={`/${newspaperName}/login`}
              className="mt-2 text-[14px] font-semibold text-foreground underline-offset-4 hover:underline"
            >
              Back to Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
              {(newspaperName ?? "")
                .split("-")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ")}
            </span>
            <span className="text-[15px] text-muted-foreground">
              Create your account
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="fullName"
                className="text-[14px] font-medium text-foreground"
              >
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
              />
            </div>

            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="username"
                className="text-[14px] font-medium text-foreground"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="jannovak"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring aria-[invalid=true]:border-destructive"
                aria-invalid={!!fieldErrors.username}
              />
              {fieldErrors.username && (
                <span className="text-[12px] text-destructive">{fieldErrors.username}</span>
              )}
            </div>

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
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring aria-[invalid=true]:border-destructive"
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email && (
                <span className="text-[12px] text-destructive">{fieldErrors.email}</span>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-[14px] font-medium text-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring aria-[invalid=true]:border-destructive"
                aria-invalid={!!fieldErrors.password}
              />
              {fieldErrors.password && (
                <span className="text-[12px] text-destructive">{fieldErrors.password}</span>
              )}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-[14px] font-medium text-foreground"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring aria-[invalid=true]:border-destructive"
                aria-invalid={!!fieldErrors.confirmPassword}
              />
              {fieldErrors.confirmPassword && (
                <span className="text-[12px] text-destructive">{fieldErrors.confirmPassword}</span>
              )}
            </div>

            {/* Terms */}
            <p className="text-center text-[13px] text-muted-foreground">
              By signing up, you agree to our{" "}
              <span className="font-semibold text-foreground">Terms &amp; Privacy Policy</span>
            </p>

            {/* Generic error */}
            {error && (
              <p className="text-center text-[13px] text-destructive">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-md bg-foreground text-[14px] font-semibold text-background hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {loading ? "Creating account…" : "Create Account"}
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
              Sign up with Google
            </button>
          </form>

          {/* Sign in link */}
          <p className="text-center text-[14px] text-muted-foreground">
            Already have an account?{" "}
            <Link
              to={`/${newspaperName}/login`}
              className="font-semibold text-foreground hover:underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
