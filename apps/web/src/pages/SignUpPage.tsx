import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Type, type Static } from "@sinclair/typebox";
import { registerInput } from "@pb138/server/schemas/auth";
import { client, toApiError } from "../lib/api";
import { typeboxResolver, emptyToUndefined } from "../lib/validation";
import { Navbar } from "../components/Navbar";
import { AuthCard } from "../components/AuthCard";
import { FormField } from "../components/FormField";
import { useNewspaper } from "../hooks/useNewspaper";
import { slugToDisplayName } from "../lib/utils";
import { Button } from "../components/ui/button";

const signUpFormSchema = Type.Omit(registerInput, ["newspaper_id"]);
type SignUpFormValues = Static<typeof signUpFormSchema>;

export function SignUpPage() {
  const { newspaperName, newspaper } = useNewspaper();

  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: typeboxResolver(signUpFormSchema),
    defaultValues: { email: "", username: "", password: "", full_name: "" },
  });

  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const registerMutation = useMutation({
    mutationFn: async (values: SignUpFormValues) => {
      if (!newspaper) throw new Error("NEWSPAPER_UNAVAILABLE");
      const { error } = await client.api.auth.register.post({
        ...values,
        newspaper_id: newspaper.id,
      });
      if (error) throw error;
    },
    onSuccess: () => setSuccess(true),
    onError: (err) => {
      const { status, value } = toApiError(err);
      if (status === 409) {
        if (value?.error === "EMAIL_TAKEN") {
          setError("email", { message: "This email is already registered" });
        } else if (value?.error === "USERNAME_TAKEN") {
          setError("username", { message: "This username is already taken" });
        } else {
          setFormError("An account with these details already exists.");
        }
        return;
      }
      if (status === 422 && value?.fields) {
        for (const [field, message] of Object.entries(value.fields)) {
          setError(field as keyof SignUpFormValues, { message });
        }
        return;
      }
      setFormError("Something went wrong. Please try again.");
    },
  });

  function onValid(values: SignUpFormValues) {
    setFormError(null);
    setConfirmError(null);
    if (values.password !== confirmPassword) {
      setConfirmError("Passwords do not match");
      return;
    }
    registerMutation.mutate(values);
  }

  if (success) {
    return (
      <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
        <Navbar newspaperName={newspaperName ?? ""} />
        <AuthCard title={slugToDisplayName(newspaperName ?? "")} subtitle="Create your account">
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-foreground text-xl-plus font-extrabold tracking-tight">
              Check your email
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We sent a confirmation link to{" "}
              <span className="text-foreground font-semibold">{getValues("email")}</span>.
              Please verify your address to activate your account.
            </p>
            <Link
              to={`/${newspaperName}/login`}
              className="text-foreground mt-2 text-sm font-semibold underline-offset-4 hover:underline"
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
        <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4">
          <FormField
            id="fullName"
            label="Full Name"
            type="text"
            placeholder="John Doe"
            error={errors.full_name?.message}
            {...register("full_name", { setValueAs: emptyToUndefined })}
          />
          <FormField
            id="username"
            label="Username"
            type="text"
            placeholder="jannovak"
            required
            error={errors.username?.message}
            {...register("username")}
          />
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
          <FormField
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            error={confirmError ?? undefined}
          />

          <p className="text-muted-foreground text-center text-2xs">
            By signing up, you agree to our{" "}
            <span className="text-foreground font-semibold">Terms &amp; Privacy Policy</span>
          </p>

          {formError && <p className="text-destructive text-center text-2xs">{formError}</p>}

          <Button
            type="submit"
            disabled={registerMutation.isPending || !newspaper}
            className="w-full"
          >
            {registerMutation.isPending ? "Creating account…" : "Create Account"}
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
            Sign up with Google
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
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
