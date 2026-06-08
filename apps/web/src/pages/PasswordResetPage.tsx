import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Type, type Static } from "@sinclair/typebox";
import { forgotPasswordInput } from "@pb138/server/schemas/auth";
import { client, toApiError } from "../lib/api";
import { typeboxResolver } from "../lib/validation";
import { Navbar } from "../components/Navbar";
import { AuthCard } from "../components/AuthCard";
import { FormField } from "../components/FormField";
import { CheckIcon } from "../components/Icons";
import { slugToDisplayName } from "../lib/utils";
import { useNewspaper } from "../hooks/useNewspaper";
import { Button } from "../components/ui/button";

const resetFormSchema = Type.Omit(forgotPasswordInput, ["newspaper_id"]);
type ResetFormValues = Static<typeof resetFormSchema>;

export function PasswordResetPage() {
  const { newspaperName, newspaper } = useNewspaper();

  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: typeboxResolver(resetFormSchema),
    defaultValues: { email: "" },
  });

  const resetMutation = useMutation({
    mutationFn: async ({ email }: ResetFormValues) => {
      if (!newspaper) throw new Error("NEWSPAPER_UNAVAILABLE");
      const { error } = await client.api.auth["forgot-password"].post({
        email,
        newspaper_id: newspaper.id,
      });
      if (error) throw error;
    },
    onSuccess: () => setSubmitted(true),
    onError: (err) => {
      const { status, value } = toApiError(err);
      if (status === 422) {
        setError("root", {
          message: value?.fields?.email ?? "Please enter a valid email address.",
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
        subtitle="Reset your password"
      >
        {submitted ? (
          <div className="flex flex-col items-center gap-4">
            <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
              <CheckIcon size={22} className="text-foreground" />
            </div>
            <p className="text-muted-foreground text-center text-sm">
              If that address is registered, a reset link has been sent. Check your inbox.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit((values) => resetMutation.mutate(values))}
            className="flex flex-col gap-4"
          >
            <p className="text-muted-foreground text-center text-2xs leading-relaxed">
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </p>
            <FormField
              id="email"
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              required
              error={errors.email?.message}
              {...register("email")}
            />
            {errors.root && <p className="text-destructive text-center text-2xs">{errors.root.message}</p>}
            <Button
              type="submit"
              disabled={resetMutation.isPending || !newspaper}
              className="w-full"
            >
              {resetMutation.isPending ? "Sending…" : "Send Reset Link"}
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