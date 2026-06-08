import { useUser } from "./useUser";

export function useAuthorProfile() {
  const { user, isLoading } = useUser();

  const isProfileComplete = !!(user?.bio && user?.profile_picture);

  return { user, isProfileComplete, isLoading };
}
