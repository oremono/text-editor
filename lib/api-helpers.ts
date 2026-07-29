import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSupabase } from "@/lib/supabase";
import type { User } from "@/lib/types";

/**
 * Typed API error. Throw from anywhere inside a route handler wrapped with
 * `withErrorHandling` and it becomes a `{ error }` JSON response.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Build a `{ error: string }` JSON response with the given status. */
export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Resolve the calling user from the `x-user-id` header.
 * Throws ApiError(401) if the header is missing or the user doesn't exist.
 */
export async function requireUser(req: Request): Promise<User> {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    throw new ApiError(401, "Not logged in");
  }

  const { data, error } = await getSupabase()
    .from("users")
    .select("id, email, name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // Invalid UUID etc. also lands here — treat as unauthenticated.
    throw new ApiError(401, "Invalid user");
  }
  if (!data) {
    throw new ApiError(401, "Unknown user");
  }

  return { id: data.id, email: data.email, name: data.name };
}

type RouteHandler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response>;

/**
 * Wrap a route handler so thrown errors become consistent JSON responses:
 * - ApiError            → its status + message
 * - ZodError            → 400 with the first issue's message
 * - anything else       → 500 "Internal server error" (logged)
 *
 * Usage:
 *   export const GET = withErrorHandling(async (req, { params }) => { ... });
 */
export function withErrorHandling<Ctx = unknown>(
  handler: RouteHandler<Ctx>
): RouteHandler<Ctx> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return jsonError(err.message, err.status);
      }
      if (err instanceof ZodError) {
        const first = err.issues[0];
        const path = first?.path?.length ? `${first.path.join(".")}: ` : "";
        return jsonError(`Invalid request: ${path}${first?.message ?? "bad input"}`, 400);
      }
      console.error("Unhandled API error:", err);
      return jsonError("Internal server error", 500);
    }
  };
}
