import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { client } from "../lib/api";

export function useLogout(redirectTo: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await client.api.auth.logout.post();
    },
    onSettled: () => {
      localStorage.removeItem("token");
      queryClient.clear();
      navigate(redirectTo);
    },
  });
}
