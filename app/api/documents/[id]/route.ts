import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAccess } from "@/lib/access";
import { ApiError, requireUser, withErrorHandling } from "@/lib/api-helpers";
import { getSupabase } from "@/lib/supabase";
import type { DocumentFull, Role } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

interface DocumentRow {
  id: string;
  title: string;
  owner_id: string;
  content: unknown;
  created_at: string;
  updated_at: string;
}

/** Load a document + its owner's name and map to DocumentFull. */
async function fetchDocumentFull(id: string, role: Role): Promise<DocumentFull> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("documents")
    .select("id, title, owner_id, content, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    throw new ApiError(404, "Document not found");
  }
  const row = data as DocumentRow;

  const { data: owner } = await supabase
    .from("users")
    .select("name")
    .eq("id", row.owner_id)
    .maybeSingle();

  return {
    id: row.id,
    title: row.title,
    ownerId: row.owner_id,
    ownerName: (owner as { name: string } | null)?.name ?? "Unknown",
    role,
    content: row.content,
    updatedAt: new Date(row.updated_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/**
 * GET /api/documents/:id — any access role.
 * 200 → DocumentFull with the caller's role. 401/403/404.
 */
export const GET = withErrorHandling<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const { id } = await params;
  const role = await requireAccess(id, user.id, "viewer");

  return NextResponse.json(await fetchDocumentFull(id, role));
});

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const patchSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(200, "Title is too long (max 200 characters)")
      .optional(),
    content: z
      .custom<Record<string, unknown>>(isPlainObject, "content must be an object")
      .optional(),
  })
  .refine((body) => body.title !== undefined || body.content !== undefined, {
    message: "Provide a title and/or content to update",
  });

/**
 * PATCH /api/documents/:id — min role editor.
 * Body: { title?, content? } (at least one). Bumps updated_at.
 * 200 → DocumentFull (post-update). 400/401/403/404.
 */
export const PATCH = withErrorHandling<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const { id } = await params;
  const role = await requireAccess(id, user.id, "editor");

  const body = patchSchema.parse(await req.json());

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;

  const { error } = await getSupabase()
    .from("documents")
    .update(updates)
    .eq("id", id);

  if (error) {
    throw new ApiError(500, "Failed to update document");
  }

  return NextResponse.json(await fetchDocumentFull(id, role));
});

/**
 * DELETE /api/documents/:id — owner only.
 * 200 → { ok: true }. 401/403/404.
 */
export const DELETE = withErrorHandling<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const { id } = await params;
  await requireAccess(id, user.id, "owner");

  const { error } = await getSupabase()
    .from("documents")
    .delete()
    .eq("id", id);

  if (error) {
    throw new ApiError(500, "Failed to delete document");
  }

  return NextResponse.json({ ok: true });
});
