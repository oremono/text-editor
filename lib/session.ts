"use client";

/**
 * Client-side mock session helpers (see spec §3 and CONTRACTS.md).
 * Session = a `User` JSON blob under localStorage key 'docs-user'.
 * No server imports allowed in this file.
 */

import type { User } from "@/lib/types";

export const SESSION_KEY = "docs-user";

export function getSessionUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<User>;
    if (
      typeof parsed?.id === "string" &&
      typeof parsed?.email === "string" &&
      typeof parsed?.name === "string"
    ) {
      return { id: parsed.id, email: parsed.email, name: parsed.name };
    }
    return null;
  } catch {
    return null;
  }
}

export function setSessionUser(user: User): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSessionUser(): void {
  window.localStorage.removeItem(SESSION_KEY);
}

/**
 * fetch() wrapper for all client → API calls:
 * - attaches `x-user-id` from the session (if logged in)
 * - on !ok, throws an Error whose message is the server's `{ error }` string
 * - returns parsed JSON (or undefined for 204/empty responses)
 *
 * Callers should catch and surface `err.message` in a toast.
 */
export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const user = getSessionUser();
  const headers = new Headers(init?.headers);
  if (user) headers.set("x-user-id", user.id);

  // Default JSON content type when a plain-object body is being sent.
  if (
    init?.body &&
    typeof init.body === "string" &&
    !headers.has("content-type")
  ) {
    headers.set("content-type", "application/json");
  }

  const res = await fetch(path, { ...init, headers });

  let payload: unknown = undefined;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = undefined;
    }
  }

  if (!res.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return payload as T;
}
