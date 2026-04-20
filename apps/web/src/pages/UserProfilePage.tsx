import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../lib/api";
import { Navbar } from "../components/Navbar";

interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  profile_picture: string | null;
  email_verified: boolean;
  roles: string[];
}

function splitFullName(full_name: string | null): [string, string] {
  if (!full_name) return ["", ""];
  const idx = full_name.indexOf(" ");
  if (idx === -1) return [full_name, ""];
  return [full_name.slice(0, idx), full_name.slice(idx + 1)];
}

export function UserProfilePage() {
  const { newspaperName } = useParams<{ newspaperName: string }>();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Profile info form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({});

  // Avatar state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/users/me`, { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<UserProfile>;
      })
      .then((data) => {
        setProfile(data);
        const [first, last] = splitFullName(data.full_name);
        setFirstName(first);
        setLastName(last);
        setUsername(data.username);
        setBio(data.bio ?? "");
        setAvatarUrl(data.profile_picture);
      })
      .catch(() => setLoadError(true));
  }, []);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileFieldErrors({});
    setProfileSuccess(false);
    setProfileSaving(true);

    const full_name = [firstName, lastName].filter(Boolean).join(" ") || undefined;

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ full_name, username: username || undefined, bio: bio || undefined }),
      });

      if (res.ok) {
        const data = await res.json() as UserProfile;
        const [first, last] = splitFullName(data.full_name);
        setFirstName(first);
        setLastName(last);
        setUsername(data.username);
        setBio(data.bio ?? "");
        setProfileSuccess(true);
        return;
      }

      const body = await res.json();

      if (res.status === 409 && body.error === "USERNAME_TAKEN") {
        setProfileFieldErrors({ username: "This username is already taken." });
        return;
      }

      if (res.status === 422 && body.fields) {
        setProfileFieldErrors(body.fields);
        return;
      }

      setProfileError("Something went wrong. Please try again.");
    } catch {
      setProfileError("Could not connect to the server. Please try again later.");
    } finally {
      setProfileSaving(false);
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

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    setPasswordSaving(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ password: newPassword }),
      });

      if (res.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordSuccess(true);
        return;
      }

      const body = await res.json();

      if (res.status === 422 && body.fields?.password) {
        setPasswordError(body.fields.password);
        return;
      }

      setPasswordError("Something went wrong. Please try again.");
    } catch {
      setPasswordError("Could not connect to the server. Please try again later.");
    } finally {
      setPasswordSaving(false);
    }
  }

  const initials = [firstName[0], lastName[0]].filter(Boolean).join("").toUpperCase() || "?";

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <Navbar newspaperName={newspaperName ?? ""} />

      <div className="flex flex-col gap-7 px-12 py-8">
        {/* Page Title */}
        <h1
          className="text-[28px] font-extrabold tracking-[-0.5px] text-foreground"
          style={{ fontFamily: "Outfit, Inter, sans-serif" }}
        >
          My Profile
        </h1>

        {loadError ? (
          <p className="text-center text-muted-foreground py-16">
            Failed to load profile. Please sign in and try again.
          </p>
        ) : !profile ? (
          <p className="text-center text-muted-foreground py-16">Loading…</p>
        ) : (
          <>
            {/* Profile Information Card */}
            <form
              onSubmit={handleProfileSave}
              className="rounded-xl border border-border bg-card p-8 flex flex-col gap-6"
            >
              <h2
                className="text-[18px] font-bold text-foreground"
                style={{ fontFamily: "Outfit, Inter, sans-serif" }}
              >
                Profile Information
              </h2>

              {/* Avatar */}
              <div className="flex items-center gap-5">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[24px] font-bold text-muted-foreground select-none">
                      {initials}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[14px] font-semibold text-foreground">Profile Picture</span>
                  <span className="text-[13px] text-muted-foreground">JPG, PNG or GIF. Max 2MB.</span>
                  {avatarError && (
                    <span className="text-[12px] text-destructive">{avatarError}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="w-fit rounded-md border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-60"
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
                </div>
              </div>

              {/* First / Last Name row */}
              <div className="grid grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="firstName" className="text-[14px] font-medium text-foreground">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    placeholder="Sarah"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="lastName" className="text-[14px] font-medium text-foreground">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    placeholder="Mitchell"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="username" className="text-[14px] font-medium text-foreground">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  aria-invalid={!!profileFieldErrors.username}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring aria-[invalid=true]:border-destructive"
                />
                {profileFieldErrors.username && (
                  <span className="text-[12px] text-destructive">{profileFieldErrors.username}</span>
                )}
              </div>

              {/* Email (read-only) */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-[14px] font-medium text-foreground">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  readOnly
                  className="h-10 w-full rounded-md border border-input bg-muted px-3 text-[14px] text-muted-foreground cursor-not-allowed"
                />
              </div>

              {/* Bio */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="bio" className="text-[14px] font-medium text-foreground">
                  Bio
                </label>
                <textarea
                  id="bio"
                  rows={3}
                  placeholder="Tell readers a little about yourself…"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring resize-none"
                />
              </div>

              {profileError && (
                <p className="text-[13px] text-destructive">{profileError}</p>
              )}
              {profileSuccess && (
                <p className="text-[13px] text-green-600">Profile updated successfully.</p>
              )}

              {/* Save Row */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="rounded-md bg-foreground px-5 py-2 text-[14px] font-semibold text-background hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {profileSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>

            {/* Change Password Card */}
            <form
              onSubmit={handlePasswordSave}
              className="rounded-xl border border-border bg-card p-8 flex flex-col gap-6"
            >
              <div className="flex flex-col gap-1">
                <h2
                  className="text-[18px] font-bold text-foreground"
                  style={{ fontFamily: "Outfit, Inter, sans-serif" }}
                >
                  Change Password
                </h2>
                <p className="text-[14px] text-muted-foreground">
                  Update your password to keep your account secure.
                </p>
              </div>

              {/* Current Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="currentPassword" className="text-[14px] font-medium text-foreground">
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                />
              </div>

              {/* New / Confirm row */}
              <div className="grid grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="newPassword" className="text-[14px] font-medium text-foreground">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirmPassword" className="text-[14px] font-medium text-foreground">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                  />
                </div>
              </div>

              {passwordError && (
                <p className="text-[13px] text-destructive">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-[13px] text-green-600">Password updated successfully.</p>
              )}

              {/* Password Save Row */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="rounded-md bg-foreground px-5 py-2 text-[14px] font-semibold text-background hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {passwordSaving ? "Updating…" : "Update Password"}
                </button>
              </div>
            </form>

            {/* Danger Zone Card */}
            <div className="rounded-xl border border-destructive bg-card p-8 flex flex-col gap-4">
              <h2
                className="text-[18px] font-bold text-destructive"
                style={{ fontFamily: "Outfit, Inter, sans-serif" }}
              >
                Danger Zone
              </h2>
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button
                type="button"
                className="w-fit rounded-md border border-destructive bg-background px-4 py-2 text-[14px] font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                Delete Account
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
