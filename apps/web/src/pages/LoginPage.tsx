import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Type, type Static } from "@sinclair/typebox";
import { loginInput } from "@pb138/server/schemas/auth";
import { client, toApiError } from "../lib/api";
import { fetchMe } from "../hooks/useUser";
import { typeboxResolver } from "../lib/validation";
import { Navbar } from "../components/Navbar";
import { AuthCard } from "../components/AuthCard";
import { FormField } from "../components/FormField";
import { useNewspaper } from "../hooks/useNewspaper";
import { slugToDisplayName } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const loginFormSchema = Type.Omit(loginInput, ["newspaper_id"]);
type LoginFormValues = Static<typeof loginFormSchema>;

export function LoginPage() {
  const { newspaperName, newspaper } = useNewspaper();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: typeboxResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      if (!newspaper) throw new Error("NEWSPAPER_UNAVAILABLE");
      const { data, error } = await client.api.auth.login.post({
        ...values,
        newspaper_id: newspaper.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      if (newspaper) localStorage.setItem("newspaper_id", newspaper.id);
      queryClient.prefetchQuery({ queryKey: ["me"], queryFn: fetchMe });
      navigate(`/${newspaperName}`);
    },
    onError: (err) => {
      const { status, value } = toApiError(err);
      if (status === 401) {
        setError("root", { message: "Invalid email or password." });
      } else if (status === 404) {
        setError("root", { message: "Newspaper not found." });
      } else if (status === 403 && value?.error === "EMAIL_NOT_VERIFIED") {
        setError("root", {
          message: "Please verify your email address before signing in.",
        });
      } else {
        setError("root", { message: "Something went wrong. Please try again." });
      }
    },
  });

  return (
    <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
      <Navbar newspaperName={newspaperName ?? ""} />
      <AuthCard
        title={slugToDisplayName(newspaperName ?? "")}
        subtitle="Sign in to your account"
      >
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

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
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
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <span className="text-destructive text-xs">{errors.password.message}</span>
            )}
          </div>

          {errors.root && <p className="text-destructive text-center text-2xs">{errors.root.message}</p>}

          <Button
            type="submit"
            disabled={loginMutation.isPending || !newspaper}
            className="w-full"
          >
            {loginMutation.isPending ? "Signing in…" : "Sign In"}
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