import { useEffect, useState } from "react";
import { API_BASE_URL, authHeaders } from "../lib/api";
import { Navbar } from "../components/Navbar";
import { ProfileInfoCard } from "./profile/ProfileInfoCard";
import { PasswordCard } from "./profile/PasswordCard";
import { DangerZoneCard } from "./profile/DangerZoneCard";
import { useNewspaper } from "../hooks/useNewspaper";

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

export function UserProfilePage() {
  const { newspaperName, newspaper } = useNewspaper();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/users/me`, { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<UserProfile>;
      })
      .then((data) => setProfile(data))
      .catch(() => setLoadError(true));
  }, []);

  return (
    <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
      <Navbar newspaperName={newspaperName ?? ""} />

      <div className="flex flex-col gap-7 px-12 py-8">
        <h1
          className="text-foreground text-3xl-minus font-extrabold tracking-tight-px font-outfit"
        >
          My Profile
        </h1>

        {loadError ? (
          <p className="text-muted-foreground py-16 text-center">
            Failed to load profile. Please sign in and try again.
          </p>
        ) : !profile ? (
          <p className="text-muted-foreground py-16 text-center">Loading…</p>
        ) : (
          <>
            {profile.roles.includes("AUTHOR") && (!profile.bio || !profile.profile_picture) && (
              <div className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 flex items-start gap-3 rounded-xl border p-4">
                <span className="mt-0.5 text-amber-500 text-lg leading-none select-none">⚠</span>
                <p className="text-amber-800 dark:text-amber-300 text-sm leading-snug">
                  Your author profile is incomplete. Please set your{" "}
                  {!profile.bio && !profile.profile_picture
                    ? "bio and profile picture"
                    : !profile.bio
                      ? "bio"
                      : "profile picture"}{" "}
                  before submitting articles for review.
                </p>
              </div>
            )}
            <ProfileInfoCard profile={profile} onSaved={(updated) => setProfile(updated)} />
            <PasswordCard />
            <DangerZoneCard />
          </>
        )}
      </div>
    </div>
  );
}
