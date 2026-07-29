import { NextResponse } from "next/server";

import { requireAccess } from "@/lib/access";
import { ApiError, requireUser, withErrorHandling } from "@/lib/api-helpers";
import { getSupabase } from "@/lib/supabase";
import { listShares } from "../share-queries";

type Ctx = { params: Promise<{ id: string; userId: string }> };

/**
 * DELETE /api/documents/:id/shares/:userId — owner only.
 * `:userId` is the target user's id. Missing share → 404.
 * 200 → Share[] (the full updated list).
 */
export const DELETE = withErrorHandling(
  async (req: Request, { params }: Ctx) => {
    const user = await requireUser(req);
    const { id, userId } = await params;
    await requireAccess(id, user.id, "owner");

    const { data, error } = await getSupabase()
      .from("document_shares")
      .delete()
      .eq("document_id", id)
      .eq("user_id", userId)
      .select("id");

    if (error) {
      throw new ApiError(500, "Failed to revoke access");
    }
    if (!data || data.length === 0) {
      throw new ApiError(404, "This document is not shared with that user");
    }

    return NextResponse.json(await listShares(id));
  }
);
