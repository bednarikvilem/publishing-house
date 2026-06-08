import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { Type, type Static } from "@sinclair/typebox";
import { resetPasswordInput } from "@pb138/server/schemas/auth";
import { API_BASE_URL } from "../lib/api";
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
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordFormValues>({
    resolver: typeboxResolver(setPasswordSchema),
    defaultValues: { password: "" },
  });

  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onValid({ password }: SetPasswordFormValues) {
    setFormError(null);
    setConfirmError(null);
    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) { setSuccess(true); return; }

      const body = await res.json().catch(() => ({}));
      if (res.status === 400 && body.error === "INVALID_TOKEN") {
        setFormError("This link has expired or is invalid. Please request a new one.");
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } catch {
      setFormError("Could not connect to the server. Please try again later.");
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
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Resetting…" : "Reset Password"}
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
