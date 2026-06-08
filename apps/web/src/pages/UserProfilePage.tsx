import { Navbar } from "../components/Navbar";
import { ProfileInfoCard } from "./profile/ProfileInfoCard";
import { PasswordCard } from "./profile/PasswordCard";
import { DangerZoneCard } from "./profile/DangerZoneCard";
import { useNewspaper } from "../hooks/useNewspaper";
import { useUser } from "../hooks/useUser";
import { useQueryClient } from "@tanstack/react-query";

export function UserProfilePage() {
  const { newspaperName, newspaper } = useNewspaper();
  const { user: profile, isLoading, isError } = useUser();
  const queryClient = useQueryClient();

  return (
    <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
      <Navbar newspaperName={newspaperName ?? ""} />

      <div className="flex flex-col gap-7 px-12 py-8">
        <h1
          className="text-foreground text-3xl-minus font-extrabold tracking-tight-px font-outfit"
        >
          My Profile
        </h1>

        {isError ? (
          <p className="text-muted-foreground py-16 text-center">
            Failed to load profile. Please sign in and try again.
          </p>
        ) : isLoading || !profile ? (
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
            <ProfileInfoCard
              profile={profile}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ["me"] })}
            />
            <PasswordCard />
            <DangerZoneCard />
          </>
        )}
      </div>
    </div>
  );
}
