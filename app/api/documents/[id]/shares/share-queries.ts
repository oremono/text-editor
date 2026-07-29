import "server-only";

import { ApiError } from "@/lib/api-helpers";
import { getSupabase } from "@/lib/supabase";
import type { Share } from "@/lib/types";

interface ShareRow {
  id: string;
  user_id: string;
  role: "editor" | "viewer";
  users: { email: string; name: string } | null;
}

/**
 * Fetch all shares for a document, joined with user email/name, mapped to the
 * camelCase `Share` shape from CONTRACTS.md.
 */
export async function listShares(docId: string): Promise<Share[]> {
  const { data, error } = await getSupabase()
    .from("document_shares")
    .select("id, user_id, role, users ( email, name )")
    .eq("document_id", docId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new ApiError(500, "Failed to load shares");
  }

  const rows = (data ?? []) as unknown as ShareRow[];

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.users?.email ?? "",
    name: row.users?.name ?? "",
    role: row.role,
  }));
}
