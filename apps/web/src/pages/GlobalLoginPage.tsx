import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import type { Static } from "@sinclair/typebox";
import { globalLoginInput } from "@pb138/server/schemas/auth";
import { API_BASE_URL } from "../lib/api";
import { typeboxResolver } from "../lib/validation";
import { useTheme } from "../hooks/useTheme";
import { SunIcon, MoonIcon } from "../components/Icons";
import { AuthCard } from "../components/AuthCard";
import { FormField } from "../components/FormField";
import { Button } from "../components/ui/button";

interface GlobalLoginPageProps {
  title: string;
  subtitle: string;
  redirectTo: string;
}

type LoginFormValues = Static<typeof globalLoginInput>;

export function GlobalLoginPage({ title, subtitle, redirectTo }: GlobalLoginPageProps) {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const {
    register,
    handleSubmit,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<LoginFormValues>({
    resolver: typeboxResolver(globalLoginInput),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit({ email, password }: LoginFormValues) {
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
      if (res.status === 401) { setError("root", { message: "Invalid email or password." }); return; }
      if (res.status === 403 && body.error === "EMAIL_NOT_VERIFIED") {
        setError("root", { message: "This account has not been verified." });
        return;
      }
      setError("root", { message: "Something went wrong. Please try again." });
    } catch {
      setError("root", { message: "Could not connect to the server. Please try again later." });
    }
  }

  return (
    <div className="bg-background text-foreground min-h-screen w-full">
      <Button
        onClick={toggle}
        aria-label="Toggle dark mode"
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4"
      >
        {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
      </Button>

      <AuthCard title={title} subtitle={subtitle}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            id="email"
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            required
            error={errors.email?.message}
            {...register("email")}
          />
          <FormField
            id="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            required
            error={errors.password?.message}
            {...register("password")}
          />

          {errors.root && <p className="text-destructive text-center text-2xs">{errors.root.message}</p>}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </AuthCard>
    </div>
  );
}