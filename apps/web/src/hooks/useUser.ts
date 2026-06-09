import { useQuery } from "@tanstack/react-query";
import { client } from "../lib/api";

export interface UserInfo {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  profile_picture: string | null;
  email_verified: boolean;
  roles: string[];
}

export async function fetchMe(): Promise<UserInfo> {
  const { data, error } = await client.api.users.me.get();
  if (error) throw error;
  return data as UserInfo;
}

export function useUser() {
  const token = localStorage.getItem("token");

  const { data: user = null, isLoading, isError } = useQuery({
    queryKey: ["me"],
    enabled: !!token,
    retry: false,
    queryFn: fetchMe,
  });

  return { user, isLoading, isError };
}
