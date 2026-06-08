import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, toApiError } from "../lib/api";
import { useToast } from "../components/ui/toaster";

export type UserEntry = {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  roles: string[];
  email_verified: boolean | null;
};

type NewspaperRole = "REGISTERED_USER" | "AUTHOR" | "EDITOR" | "NEWSPAPER_MANAGER";

export function useNewspaperUsers(newspaperId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["newspaper-users", newspaperId];

  const { data: users = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .users.get({ query: { page: 1, limit: 100 } });
      if (error) throw error;
      return (data as { data: UserEntry[] }).data;
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .users({ user_id: userId })
        .roles.post({ role: role as NewspaperRole });
      if (error) {
        const { status, value } = toApiError(error);
        if (status === 409) throw Object.assign(new Error("conflict"), { code: value?.error });
        throw new Error();
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (err: Error & { code?: string }) => {
      if (err.message === "conflict") {
        toast({
          title: "Conflict",
          description:
            err.code === "MANAGER_ALREADY_EXISTS"
              ? "This newspaper already has a manager. Remove the existing one first."
              : "User already has this role.",
          variant: "error",
        });
      } else {
        toast({ title: "Error", description: "Failed to assign role.", variant: "error" });
      }
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if (role === "REGISTERED_USER") {
        throw Object.assign(new Error("not-allowed"), { code: "BASE_ROLE" });
      }
      const { error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .users({ user_id: userId })
        .roles({ role: role as NewspaperRole })
        .delete();
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (err: Error & { code?: string }) => {
      if (err.code === "BASE_ROLE") {
        toast({
          title: "Not allowed",
          description: "Cannot remove the base REGISTERED_USER role.",
          variant: "error",
        });
      } else {
        toast({ title: "Error", description: "Failed to remove role.", variant: "error" });
      }
    },
  });

  return {
    users,
    isLoading,
    assignRole: (userId: string, role: string) =>
      assignRoleMutation.mutateAsync({ userId, role }),
    removeRole: (userId: string, role: string) =>
      removeRoleMutation.mutateAsync({ userId, role }),
  };
}
