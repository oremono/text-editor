import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAccess } from "@/lib/access";
import { ApiError, requireUser, withErrorHandling } from "@/lib/api-helpers";
import { getSupabase } from "@/lib/supabase";
import { listShares } from "./share-queries";

type Ctx = { params: Promise<{ id: string }> };

const shareSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  role: z.enum(["editor", "viewer"]),
});

/** GET /api/documents/:id/shares — owner only. 200 → Share[]. */
export const GET = withErrorHandling(async (req: Request, { params }: Ctx) => {
  const user = await requireUser(req);
  const { id } = await params;
  await requireAccess(id, user.id, "owner");

  return NextResponse.json(await listShares(id));
});

/**
 * POST /api/documents/:id/shares — owner only.
 * Body { email, role: 'editor' | 'viewer' }. Upserts on (document_id, user_id)
 * so re-sharing updates the role. 200 → Share[] (the full updated list).
 */
export const POST = withErrorHandling(async (req: Request, { params }: Ctx) => {
  const user = await requireUser(req);
  const { id } = await params;
  await requireAccess(id, user.id, "owner");

  const { email, role } = shareSchema.parse(await req.json());

  const { data: target, error: lookupError } = await getSupabase()
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    throw new ApiError(500, "Failed to look up user");
  }
  if (!target) {
    throw new ApiError(404, "No user with that email");
  }
  if (target.id === user.id) {
    throw new ApiError(400, "You already own this document");
  }

  const { error: upsertError } = await getSupabase()
    .from("document_shares")
    .upsert(
      { document_id: id, user_id: target.id, role },
      { onConflict: "document_id,user_id" }
    );

  if (upsertError) {
    throw new ApiError(500, "Failed to share document");
  }

  return NextResponse.json(await listShares(id));
});
