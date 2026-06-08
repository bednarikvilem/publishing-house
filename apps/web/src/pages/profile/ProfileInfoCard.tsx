import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { client, toApiError } from "../../lib/api";
import { useAvatarUpload } from "../../hooks/useAvatarUpload";
import { FormField } from "../../components/FormField";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  profile_picture: string | null;
  roles: string[];
}

function splitFullName(full_name: string | null): [string, string] {
  if (!full_name) return ["", ""];
  const idx = full_name.indexOf(" ");
  if (idx === -1) return [full_name, ""];
  return [full_name.slice(0, idx), full_name.slice(idx + 1)];
}

interface ProfileFormValues {
  firstName: string;
  lastName: string;
  username: string;
  bio: string;
}

export function ProfileInfoCard({
  profile,
  onSaved,
}: {
  profile: UserProfile;
  onSaved: (updated: UserProfile) => void;
}) {
  const isAuthor = profile.roles.includes("AUTHOR");
  const {
    avatarUrl,
    uploading: avatarUploading,
    error: avatarError,
    fileInputRef,
    handleFileChange: handleAvatarChange,
  } = useAvatarUpload(profile.profile_picture);
  const [saved, setSaved] = useState(false);

  const [initialFirst, initialLast] = splitFullName(profile.full_name);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      firstName: initialFirst,
      lastName: initialLast,
      username: profile.username,
      bio: profile.bio ?? "",
    },
  });

  const firstName = watch("firstName");
  const lastName = watch("lastName");
  const initials =
    [firstName?.[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?";

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const full_name =
        [data.firstName, data.lastName].filter(Boolean).join(" ") || undefined;
      const { data: result, error } = await client.api.users.me.put({
        full_name,
        username: data.username || undefined,
        ...(isAuthor ? { bio: data.bio || undefined } : {}),
      });
      if (error) throw error;
      return result as Partial<UserProfile>;
    },
    onSuccess: (json) => {
      const merged: UserProfile = { ...profile, ...json };
      onSaved(merged);
      const [first, last] = splitFullName(merged.full_name);
      reset({
        firstName: first,
        lastName: last,
        username: merged.username,
        bio: merged.bio ?? "",
      });
      setSaved(true);
    },
    onError: (err) => {
      const { status, value } = toApiError(err);
      if (status === 409 && value?.error === "USERNAME_TAKEN") {
        setError("username", { message: "This username is already taken." });
      } else if (status === 422 && value?.fields) {
        Object.entries(value.fields).forEach(([field, msg]) => {
          setError(field as keyof ProfileFormValues, { message: msg });
        });
      } else {
        setError("root", { message: "Something went wrong. Please try again." });
      }
    },
  });

  function onSubmit(data: ProfileFormValues) {
    setSaved(false);
    updateProfile.mutate(data);
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border-border bg-card flex flex-col gap-6 rounded-xl border p-8"
    >
      <h2
        className="text-foreground text-[18px] font-bold"
        style={{ fontFamily: "Outfit, Inter, sans-serif" }}
      >
        Profile Information
      </h2>

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="bg-muted flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <span className="text-muted-foreground text-[24px] font-bold select-none">
              {initials}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-foreground text-[14px] font-semibold">Profile Picture</span>
          {isAuthor && (
            <>
              <span className="text-muted-foreground text-[13px]">
                JPG, PNG or GIF. Max 2MB.
              </span>
              {avatarError && (
                <span className="text-destructive text-[12px]">{avatarError}</span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="w-fit rounded-md"
              >
                {avatarUploading ? "Uploading…" : "Change Photo"}
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </>
          )}
        </div>
      </div>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-5">
        <FormField
          id="firstName"
          label="First Name"
          placeholder="Sarah"
          error={errors.firstName?.message}
          {...register("firstName")}
        />
        <FormField
          id="lastName"
          label="Last Name"
          placeholder="Mitchell"
          error={errors.lastName?.message}
          {...register("lastName")}
        />
      </div>

      <FormField
        id="username"
        label="Username"
        error={errors.username?.message}
        {...register("username", { required: "Username is required" })}
      />

      {/* Email — read-only, outside RHF */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className="text-foreground text-[14px]">
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          value={profile.email}
          readOnly
          className="rounded-md bg-muted text-muted-foreground cursor-not-allowed text-[14px]"
        />
      </div>

      {isAuthor && (
        <FormField
          as="textarea"
          id="bio"
          label="Bio"
          placeholder="Tell readers a little about yourself…"
          rows={3}
          error={errors.bio?.message}
          {...register("bio", {
            maxLength: {
              value: 2000,
              message: "Bio must be 2000 characters or fewer",
            },
          })}
        />
      )}

      {errors.root && (
        <p className="text-destructive text-[13px]">{errors.root.message}</p>
      )}
      {saved && (
        <p className="text-[13px] text-green-600">Profile updated successfully.</p>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={updateProfile.isPending}
          className="bg-foreground text-background rounded-md font-semibold hover:bg-foreground hover:opacity-90"
        >
          {updateProfile.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}