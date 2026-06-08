import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL, authHeaders } from "../lib/api";
import { useToast } from "../components/ui/toaster";

export type UserEntry = {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  roles: string[];
  email_verified: boolean | null;
};

export function useNewspaperUsers(newspaperId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["newspaper-users", newspaperId];

  const { data: users = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/users?limit=100`,
        { headers: authHeaders() },
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { data: UserEntry[] };
      return data.data;
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/users/${userId}/roles`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        },
      );
      if (res.status === 409) {
        const data = (await res.json()) as { error: string };
        throw Object.assign(new Error("conflict"), { code: data.error });
      }
      if (!res.ok) throw new Error();
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
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/users/${userId}/roles/${role}`,
        { method: "DELETE", headers: authHeaders() },
      );
      if (!res.ok) throw new Error();
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
