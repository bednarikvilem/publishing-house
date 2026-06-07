import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { API_BASE_URL, authHeaders } from "../../lib/api";
import { FormField } from "../../components/FormField";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAuthor = profile.roles.includes("AUTHOR");

  const [avatarUrl, setAvatarUrl] = useState(profile.profile_picture);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [initialFirst, initialLast] = splitFullName(profile.full_name);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    reset,
    formState: { errors, isSubmitting },
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

  async function onSubmit(data: ProfileFormValues) {
    setSaved(false);
    const full_name =
      [data.firstName, data.lastName].filter(Boolean).join(" ") || undefined;

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          full_name,
          username: data.username || undefined,
          ...(isAuthor ? { bio: data.bio || undefined } : {}),
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as Partial<UserProfile>;
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
        return;
      }

      const body = await res.json();
      if (res.status === 409 && body.error === "USERNAME_TAKEN") {
        setError("username", { message: "This username is already taken." });
        return;
      }
      if (res.status === 422 && body.fields) {
        Object.entries(body.fields).forEach(([field, msg]) => {
          setError(field as keyof ProfileFormValues, { message: msg as string });
        });
        return;
      }
      setError("root", { message: "Something went wrong. Please try again." });
    } catch {
      setError("root", {
        message: "Could not connect to the server. Please try again later.",
      });
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append("profile_picture", file);
    fetch(`${API_BASE_URL}/api/users/me/profile-picture`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    })
      .then((res) => {
        if (!res.ok) throw res;
        return res.json() as Promise<{ profile_picture: string }>;
      })
      .then((data) => setAvatarUrl(data.profile_picture))
      .catch(() =>
        setAvatarError("Failed to upload photo. Use JPEG or PNG under 5 MB.")
      )
      .finally(() => {
        setAvatarUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="border-border bg-background text-foreground hover:bg-muted w-fit rounded-md border px-4 py-2 text-[13px] font-medium transition-colors disabled:opacity-60"
              >
                {avatarUploading ? "Uploading…" : "Change Photo"}
              </button>
              <input
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
        <label htmlFor="email" className="text-foreground text-[14px] font-medium">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={profile.email}
          readOnly
          className="border-input bg-muted text-muted-foreground h-10 w-full cursor-not-allowed rounded-md border px-3 text-[14px]"
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
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-foreground text-background rounded-md px-5 py-2 text-[14px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}