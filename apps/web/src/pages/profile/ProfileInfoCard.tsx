import { useRef, useState } from "react";
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

export function ProfileInfoCard({ profile, onSaved }: {
  profile: UserProfile;
  onSaved: (updated: UserProfile) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName]     = useState(() => splitFullName(profile.full_name)[0]);
  const [lastName, setLastName]       = useState(() => splitFullName(profile.full_name)[1]);
  const [username, setUsername]       = useState(profile.username);
  const [bio, setBio]                 = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl]     = useState(profile.profile_picture);

  const [saving, setSaving]                         = useState(false);
  const [success, setSuccess]                       = useState(false);
  const [error, setError]                           = useState<string | null>(null);
  const [fieldErrors, setFieldErrors]               = useState<Record<string, string>>({});
  const [avatarUploading, setAvatarUploading]       = useState(false);
  const [avatarError, setAvatarError]               = useState<string | null>(null);

  const isAuthor = profile.roles.includes("AUTHOR");
  const initials = [firstName[0], lastName[0]].filter(Boolean).join("").toUpperCase() || "?";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccess(false);
    setSaving(true);

    const full_name = [firstName, lastName].filter(Boolean).join(" ") || undefined;

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          full_name,
          username: username || undefined,
          ...(isAuthor ? { bio: bio || undefined } : {}),
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as Partial<UserProfile>;
        const merged: UserProfile = { ...profile, ...data };
        const [first, last] = splitFullName(merged.full_name);
        setFirstName(first);
        setLastName(last);
        setUsername(merged.username);
        setBio(merged.bio ?? "");
        setSuccess(true);
        onSaved(merged);
        return;
      }

      const body = await res.json();

      if (res.status === 409 && body.error === "USERNAME_TAKEN") {
        setFieldErrors({ username: "This username is already taken." });
        return;
      }
      if (res.status === 422 && body.fields) {
        setFieldErrors(body.fields);
        return;
      }
      setError("Something went wrong. Please try again.");
    } catch {
      setError("Could not connect to the server. Please try again later.");
    } finally {
      setSaving(false);
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
      .catch(() => setAvatarError("Failed to upload photo. Use JPEG or PNG under 5 MB."))
      .finally(() => {
        setAvatarUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  }

  return (
    <form
      onSubmit={handleSave}
      className="border-border bg-card flex flex-col gap-6 rounded-xl border p-8"
    >
      <h2
        className="text-foreground text-lg font-bold font-outfit"
      >
        Profile Information
      </h2>

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="bg-muted flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <span className="text-muted-foreground text-2xl font-bold select-none">{initials}</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-foreground text-sm font-semibold">Profile Picture</span>
          {isAuthor && (
            <>
              <span className="text-muted-foreground text-2xs">JPG, PNG or GIF. Max 2MB.</span>
              {avatarError && <span className="text-destructive text-xs">{avatarError}</span>}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="border-border bg-background text-foreground hover:bg-muted w-fit rounded-md border px-4 py-2 text-2xs font-medium transition-colors disabled:opacity-60"
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
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <FormField
          id="lastName"
          label="Last Name"
          placeholder="Mitchell"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>

      <FormField
        id="username"
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={fieldErrors.username}
      />

      {/* Email — read-only, not using FormField since it has special styling */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-foreground text-sm font-medium">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={profile.email}
          readOnly
          className="border-input bg-muted text-muted-foreground h-10 w-full cursor-not-allowed rounded-md border px-3 text-sm"
        />
      </div>

      {isAuthor && (
        <FormField
          as="textarea"
          id="bio"
          label="Bio"
          placeholder="Tell readers a little about yourself…"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
        />
      )}

      {error   && <p className="text-destructive text-2xs">{error}</p>}
      {success && <p className="text-2xs text-green-600">Profile updated successfully.</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="bg-foreground text-background rounded-md px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
