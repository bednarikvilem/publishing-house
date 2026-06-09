import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { Static } from "@sinclair/typebox";
import { globalLoginInput } from "@pb138/server/schemas/auth";
import { client, toApiError } from "../lib/api";
import { fetchMe } from "../hooks/useUser";
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
  const queryClient = useQueryClient();
  const { isDark, toggle } = useTheme();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: typeboxResolver(globalLoginInput),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const { data, error } = await client.api.auth.global.login.post(values);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      queryClient.prefetchQuery({ queryKey: ["me"], queryFn: fetchMe });
      navigate(redirectTo);
    },
    onError: (err) => {
      const { status, value } = toApiError(err);
      if (status === 401) {
        setError("root", { message: "Invalid email or password." });
      } else if (status === 403 && value?.error === "EMAIL_NOT_VERIFIED") {
        setError("root", { message: "This account has not been verified." });
      } else {
        setError("root", { message: "Something went wrong. Please try again." });
      }
    },
  });

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
        <form
          onSubmit={handleSubmit((values) => loginMutation.mutate(values))}
          className="flex flex-col gap-4"
        >
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
            disabled={loginMutation.isPending}
            className="w-full"
          >
            {loginMutation.isPending ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </AuthCard>
    </div>
  );
}