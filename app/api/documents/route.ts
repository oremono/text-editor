import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, requireUser, withErrorHandling } from "@/lib/api-helpers";
import { getSupabase } from "@/lib/supabase";
import type { DocumentFull, DocumentMeta, Role } from "@/lib/types";

interface DocumentRow {
  id: string;
  title: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

function toMeta(
  row: DocumentRow,
  role: Role,
  ownerName: string
): DocumentMeta {
  return {
    id: row.id,
    title: row.title,
    ownerId: row.owner_id,
    ownerName,
    role,
    updatedAt: new Date(row.updated_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/**
 * GET /api/documents — owned + shared docs for the caller,
 * each tagged with the caller's role, sorted by updatedAt desc.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const user = await requireUser(req);
  const supabase = getSupabase();

  const [ownedRes, sharesRes] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title, owner_id, created_at, updated_at")
      .eq("owner_id", user.id),
    supabase
      .from("document_shares")
      .select("document_id, role")
      .eq("user_id", user.id),
  ]);

  if (ownedRes.error || sharesRes.error) {
    throw new ApiError(500, "Failed to load documents");
  }

  const owned: DocumentMeta[] = ((ownedRes.data ?? []) as DocumentRow[]).map(
    (row) => toMeta(row, "owner", user.name)
  );

  const shares = (sharesRes.data ?? []) as {
    document_id: string;
    role: Role;
  }[];

  let shared: DocumentMeta[] = [];
  if (shares.length > 0) {
    const roleByDocId = new Map(shares.map((s) => [s.document_id, s.role]));

    const docsRes = await supabase
      .from("documents")
      .select("id, title, owner_id, created_at, updated_at")
      .in("id", [...roleByDocId.keys()]);
    if (docsRes.error) {
      throw new ApiError(500, "Failed to load shared documents");
    }

    const sharedRows = (docsRes.data ?? []) as DocumentRow[];
    const ownerIds = [...new Set(sharedRows.map((d) => d.owner_id))];
    const ownersRes = await supabase
      .from("users")
      .select("id, name")
      .in("id", ownerIds);
    if (ownersRes.error) {
      throw new ApiError(500, "Failed to load document owners");
    }
    const nameById = new Map(
      ((ownersRes.data ?? []) as { id: string; name: string }[]).map((u) => [
        u.id,
        u.name,
      ])
    );

    shared = sharedRows.map((row) =>
      toMeta(
        row,
        roleByDocId.get(row.id) ?? "viewer",
        nameById.get(row.owner_id) ?? "Unknown"
      )
    );
  }

  const all = [...owned, ...shared].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return NextResponse.json(all);
});

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const createSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .max(200, "Title is too long (max 200 characters)")
    .optional(),
  content: z
    .custom<Record<string, unknown>>(isPlainObject, "content must be an object")
    .optional(),
});

/**
 * POST /api/documents — create a document.
 * Body (optional): { title?, content? }. 201 → DocumentFull (role 'owner').
 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser(req);

  let raw: unknown = {};
  try {
    raw = await req.json();
  } catch {
    raw = {};
  }
  const body = createSchema.parse(raw ?? {});

  const { data, error } = await getSupabase()
    .from("documents")
    .insert({
      owner_id: user.id,
      title: body.title ?? "Untitled document",
      content: body.content ?? { type: "doc", content: [] },
    })
    .select("id, title, owner_id, content, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new ApiError(500, "Failed to create document");
  }

  const doc: DocumentFull = {
    ...toMeta(data as DocumentRow, "owner", user.name),
    content: (data as { content: unknown }).content,
  };

  return NextResponse.json(doc, { status: 201 });
});
