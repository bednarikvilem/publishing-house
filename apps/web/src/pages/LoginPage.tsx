import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { Navbar } from "../components/Navbar";
import { AuthCard } from "../components/AuthCard";
import { FormField } from "../components/FormField";
import { useNewspaper } from "../hooks/useNewspaper";
import { slugToDisplayName } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

interface LoginFormValues { email: string; password: string }

export function LoginPage() {
  const { newspaperName, newspaper } = useNewspaper();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<LoginFormValues>({ defaultValues: { email: "", password: "" } });

  async function onSubmit({ email, password }: LoginFormValues) {
    if (!newspaper) return;
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

      if (res.status === 401) { setError("root", { message: "Invalid email or password." }); return; }
      if (res.status === 404) { setError("root", { message: "Newspaper not found." }); return; }
      let body: { error?: string } = {};
      try { body = await res.json(); } catch {}
      if (res.status === 403 && body.error === "EMAIL_NOT_VERIFIED") {
        setError("root", { message: "Please verify your email address before signing in." });
        return;
      }
      setError("root", { message: "Something went wrong. Please try again." });
    } catch {
      setError("root", { message: "Could not connect to the server. Please try again later." });
    }
  }

  return (
    <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
      <Navbar newspaperName={newspaperName ?? ""} />
      <AuthCard
        title={slugToDisplayName(newspaperName ?? "")}
        subtitle="Sign in to your account"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            id="email"
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            required
            {...register("email")}
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-foreground text-sm font-medium">
                Password
              </label>
              <Link
                to={`/${newspaperName}/forgot-password`}
                className="text-muted-foreground hover:text-foreground text-2xs font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              required
              {...register("password")}
            />
          </div>

          {errors.root && <p className="text-destructive text-center text-2xs">{errors.root.message}</p>}

          <Button
            type="submit"
            disabled={isSubmitting || !newspaper}
            className="w-full"
          >
            {isSubmitting ? "Signing in…" : "Sign In"}
          </Button>

          <div className="flex items-center gap-3">
            <div className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-2xs">or</span>
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

        <p className="text-muted-foreground text-center text-sm">
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