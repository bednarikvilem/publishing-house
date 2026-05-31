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

export async function requestSubscription(
  newspaperId: string,
): Promise<{ message: string }> {
  const res = await fetch(
    `${API_BASE_URL}/api/newspapers/${newspaperId}/subscription/request`,
    { method: "POST", headers: authHeaders() },
  );
  if (!res.ok) throw new Error("REQUEST_FAILED");
  return res.json();
}

export async function confirmSubscription(
  newspaperId: string,
  token: string,
): Promise<{ message: string; expires_at: string }> {
  const res = await fetch(
    `${API_BASE_URL}/api/newspapers/${newspaperId}/subscription/confirm`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? "CONFIRM_FAILED");
  }
  return res.json();
}

export async function getSubscriptionStatus(
  newspaperId: string,
): Promise<{ is_active: boolean; expires_at: string | null }> {
  const res = await fetch(
    `${API_BASE_URL}/api/newspapers/${newspaperId}/subscription/status`,
    { headers: authHeaders() },
  );
  if (!res.ok) return { is_active: false, expires_at: null };
  return res.json();
}

export async function setArticleSubscriberOnly(
  newspaperId: string,
  articleId: string,
  isSubscriberOnly: boolean,
): Promise<{ id: string; is_subscriber_only: boolean }> {
  const res = await fetch(
    `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/subscriber-only`,
    {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ is_subscriber_only: isSubscriberOnly }),
    },
  );
  if (!res.ok) throw new Error("UPDATE_FAILED");
  return res.json();
}
