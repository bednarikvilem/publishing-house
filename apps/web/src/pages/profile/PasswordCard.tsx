import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { client, toApiError } from "../../lib/api";
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
    formState: { errors },
  } = useForm<PasswordFormValues>();

  const changePassword = useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await client.api.users.me.put({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => reset(),
    onError: (err) => {
      const { status, value } = toApiError(err);
      if (status === 422 && value?.fields?.password) {
        setError("newPassword", { message: value.fields.password });
      } else {
        setError("root", { message: "Something went wrong. Please try again." });
      }
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => changePassword.mutate(data.newPassword))}
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
      {changePassword.isSuccess && (
        <p className="text-[13px] text-green-600">Password updated successfully.</p>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={changePassword.isPending}
          className="bg-foreground text-background rounded-md font-semibold hover:bg-foreground hover:opacity-90"
        >
          {changePassword.isPending ? "Updating…" : "Update Password"}
        </Button>
      </div>
    </form>
  );
}