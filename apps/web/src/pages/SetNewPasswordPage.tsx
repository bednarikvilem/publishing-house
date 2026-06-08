import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Type, type Static } from "@sinclair/typebox";
import { resetPasswordInput } from "@pb138/server/schemas/auth";
import { client, toApiError } from "../lib/api";
import { typeboxResolver } from "../lib/validation";
import { Navbar } from "../components/Navbar";
import { AuthCard } from "../components/AuthCard";
import { FormField } from "../components/FormField";
import { CheckIcon } from "../components/Icons";
import { slugToDisplayName } from "../lib/utils";
import { useNewspaper } from "../hooks/useNewspaper";
import { Button } from "../components/ui/button";

const setPasswordSchema = Type.Omit(resetPasswordInput, ["token"]);
type SetPasswordFormValues = Static<typeof setPasswordSchema>;

export function SetNewPasswordPage() {
  const { newspaperName, newspaper } = useNewspaper();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordFormValues>({
    resolver: typeboxResolver(setPasswordSchema),
    defaultValues: { password: "" },
  });

  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetMutation = useMutation({
    mutationFn: async (password: string) => {
      if (!token) throw new Error("NO_TOKEN");
      const { error } = await client.api.auth["reset-password"].post({
        token,
        password,
      });
      if (error) throw error;
    },
    onSuccess: () => setSuccess(true),
    onError: (err) => {
      const { status, value } = toApiError(err);
      if (status === 400 && value?.error === "INVALID_TOKEN") {
        setFormError("This link has expired or is invalid. Please request a new one.");
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    },
  });

  function onValid({ password }: SetPasswordFormValues) {
    setFormError(null);
    setConfirmError(null);
    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      return;
    }
    resetMutation.mutate(password);
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
          <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4">
            <FormField
              id="password"
              label="New Password"
              type="password"
              placeholder="Enter your new password"
              required
              error={errors.password?.message}
              {...register("password")}
            />
            <FormField
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              error={confirmError ?? undefined}
            />
            {formError && (
              <div className="flex flex-col gap-1 text-center">
                <p className="text-destructive text-2xs">{formError}</p>
                {formError.includes("expired or is invalid") && (
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
              disabled={resetMutation.isPending}
              className="w-full"
            >
              {resetMutation.isPending ? "Resetting…" : "Reset Password"}
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
