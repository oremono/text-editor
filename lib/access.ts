import "server-only";

import { ApiError } from "@/lib/api-helpers";
import { getSupabase } from "@/lib/supabase";
import type { Role } from "@/lib/types";

const ROLE_RANK: Record<Role, number> = {
  owner: 3,
  editor: 2,
  viewer: 1,
};

/**
 * Core permission helper (see spec §4). Returns the user's role on a
 * document, or null if they have no access. Throws ApiError(404) if the
 * document doesn't exist.
 */
export async function getDocumentAccess(
  docId: string,
  userId: string
): Promise<Role | null> {
  const supabase = getSupabase();

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, owner_id")
    .eq("id", docId)
    .maybeSingle();

  if (docError || !doc) {
    throw new ApiError(404, "Document not found");
  }

  if (doc.owner_id === userId) return "owner";

  const { data: share } = await supabase
    .from("document_shares")
    .select("role")
    .eq("document_id", docId)
    .eq("user_id", userId)
    .maybeSingle();

  if (share && (share.role === "editor" || share.role === "viewer")) {
    return share.role;
  }

  return null;
}

/**
 * Assert the user has at least `minRole` on the document
 * (owner > editor > viewer). Returns the actual role on success.
 * Throws ApiError(404) if the doc doesn't exist, ApiError(403) otherwise.
 */
export async function requireAccess(
  docId: string,
  userId: string,
  minRole: Role
): Promise<Role> {
  const role = await getDocumentAccess(docId, userId);

  if (role === null || ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new ApiError(403, "You do not have permission to do that");
  }

  return role;
}
