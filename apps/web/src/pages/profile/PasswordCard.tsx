import { useForm } from "react-hook-form";
import { API_BASE_URL, authHeaders } from "../../lib/api";
import { FormField } from "../../components/FormField";
import { Button } from "../../components/ui/button";

interface PasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

export function PasswordCard() {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    getValues,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<PasswordFormValues>();

  async function onSubmit(data: PasswordFormValues) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ password: data.newPassword }),
      });

      if (res.ok) {
        reset();
        return;
      }

      const body = await res.json();
      if (res.status === 422 && body.fields?.password) {
        setError("newPassword", { message: body.fields.password });
        return;
      }
      setError("root", { message: "Something went wrong. Please try again." });
    } catch {
      setError("root", {
        message: "Could not connect to the server. Please try again later.",
      });
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border-border bg-card flex flex-col gap-6 rounded-xl border p-8"
    >
      <div className="flex flex-col gap-1">
        <h2
          className="text-foreground text-[18px] font-bold"
          style={{ fontFamily: "Outfit, Inter, sans-serif" }}
        >
          Change Password
        </h2>
        <p className="text-muted-foreground text-[14px]">
          Update your password to keep your account secure.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <FormField
          id="newPassword"
          label="New Password"
          type="password"
          placeholder="Enter new password"
          error={errors.newPassword?.message}
          {...register("newPassword", {
            required: "Password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters",
            },
          })}
        />
        <FormField
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="Confirm new password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword", {
            required: "Please confirm your password",
            validate: (val) =>
              val === getValues("newPassword") || "Passwords do not match",
          })}
        />
      </div>

      {errors.root && (
        <p className="text-destructive text-[13px]">{errors.root.message}</p>
      )}
      {isSubmitSuccessful && (
        <p className="text-[13px] text-green-600">Password updated successfully.</p>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-foreground text-background rounded-md font-semibold hover:bg-foreground hover:opacity-90"
        >
          {isSubmitting ? "Updating…" : "Update Password"}
        </Button>
      </div>
    </form>
  );
}