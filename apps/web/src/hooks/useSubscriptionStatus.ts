import { useQuery } from "@tanstack/react-query";
import { client } from "../lib/api";

export interface SubscriptionStatus {
  is_active: boolean;
  expires_at: string | null;
}

export function useSubscriptionStatus(newspaperId: string | null | undefined) {
  const token = localStorage.getItem("token");

  const { data: subscriptionStatus = null, isLoading } = useQuery({
    queryKey: ["subscription-status", newspaperId],
    enabled: !!token && !!newspaperId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaperId! })
        .subscription.status.get();
      if (error) throw error;
      return data as SubscriptionStatus;
    },
  });

  return { subscriptionStatus, isLoading };
}
