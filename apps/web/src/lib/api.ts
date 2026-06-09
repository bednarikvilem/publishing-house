import { treaty } from "@elysiajs/eden";
import type { App } from "@pb138/server";

export const API_BASE_URL =
  process.env.BUN_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const client = treaty<App>(API_BASE_URL, {
  headers: () => authHeaders(),
});

export type ApiError = {
  status: number;
  value: { error?: string; fields?: Record<string, string> } | null;
};

export function toApiError(err: unknown): ApiError {
  const e = err as Partial<ApiError>;
  return { status: e?.status ?? 0, value: e?.value ?? null };
}

export async function requestSubscription(
  newspaperId: string,
): Promise<{ message: string }> {
  const { data, error } = await client.api
    .newspapers({ newspaper_id: newspaperId })
    .subscription.request.post();
  if (error) throw new Error("REQUEST_FAILED");
  return data as { message: string };
}

export async function confirmSubscription(
  newspaperId: string,
  token: string,
): Promise<{ message: string; expires_at: string }> {
  const { data, error } = await client.api
    .newspapers({ newspaper_id: newspaperId })
    .subscription.confirm.post({ token });
  if (error) throw new Error(toApiError(error).value?.error ?? "CONFIRM_FAILED");
  return data as { message: string; expires_at: string };
}

export async function getSubscriptionStatus(
  newspaperId: string,
): Promise<{ is_active: boolean; expires_at: string | null }> {
  const { data, error } = await client.api
    .newspapers({ newspaper_id: newspaperId })
    .subscription.status.get();
  if (error) return { is_active: false, expires_at: null };
  return data as { is_active: boolean; expires_at: string | null };
}

export async function setArticleSubscriberOnly(
  newspaperId: string,
  articleId: string,
  isSubscriberOnly: boolean,
): Promise<{ id: string; is_subscriber_only: boolean }> {
  const { data, error } = await client.api
    .newspapers({ newspaper_id: newspaperId })
    .articles({ article_id: articleId })["subscriber-only"]
    .patch({ is_subscriber_only: isSubscriberOnly });
  if (error) throw new Error("UPDATE_FAILED");
  return data as { id: string; is_subscriber_only: boolean };
}
