import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, withErrorHandling } from "@/lib/api-helpers";
import { getSupabase } from "@/lib/supabase";
import type { User } from "@/lib/types";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Please enter a valid email address")),
});

/**
 * POST /api/auth/login — public (no x-user-id required).
 * Body: { email }. 200 → User, 404 → { error } with demo-account hint.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const { email } = loginSchema.parse(await req.json());

  const { data, error } = await getSupabase()
    .from("users")
    .select("id, email, name")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "Failed to look up user");
  }
  if (!data) {
    throw new ApiError(
      404,
      "No account found for that email. This demo uses seeded accounts — try alice@demo.com, bob@demo.com, or carol@demo.com."
    );
  }

  const user: User = { id: data.id, email: data.email, name: data.name };
  return NextResponse.json(user);
});
