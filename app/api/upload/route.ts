import { NextResponse } from "next/server";
import { ApiError, requireUser, withErrorHandling } from "@/lib/api-helpers";
import { getSupabase } from "@/lib/supabase";
import {
  ConvertError,
  SUPPORTED_EXTENSIONS,
  convertFileToTiptap,
} from "@/lib/convert";
import type { DocumentMeta } from "@/lib/types";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const SUPPORTED_LIST = SUPPORTED_EXTENSIONS.join(", ");

/** Mime types we consider sensible per extension (browsers vary; empty/octet-stream allowed). */
const SENSIBLE_MIMES: Record<string, string[]> = {
  ".txt": ["text/plain"],
  ".md": ["text/markdown", "text/x-markdown", "text/plain"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
  ],
};

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(dot).toLowerCase() : "";
}

/**
 * POST /api/upload — multipart/form-data with field `file`.
 * Accepts .txt / .md / .docx up to 2 MB, converts to Tiptap JSON and creates
 * a new document owned by the caller. 201 → DocumentMeta (includes `id`).
 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser(req);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, "Expected multipart/form-data with a 'file' field");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new ApiError(
      400,
      `No file provided. Supported types: ${SUPPORTED_LIST}`
    );
  }

  const ext = extensionOf(file.name);
  const sensible = SENSIBLE_MIMES[ext];
  if (!sensible) {
    throw new ApiError(
      400,
      `Unsupported file type. Supported types: ${SUPPORTED_LIST}`
    );
  }

  // Sensible-mime check: browsers sometimes send empty or generic types, so
  // only reject a mime that is present and clearly wrong for the extension.
  const mime = file.type.toLowerCase().split(";")[0].trim();
  if (mime && mime !== "application/octet-stream" && !sensible.includes(mime)) {
    throw new ApiError(
      400,
      `File content type "${mime}" doesn't match its extension. Supported types: ${SUPPORTED_LIST}`
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    throw new ApiError(413, "File is too large — the maximum size is 2 MB");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let converted: { title: string; content: object };
  try {
    converted = await convertFileToTiptap(file.name, buffer);
  } catch (err) {
    if (err instanceof ConvertError) {
      throw new ApiError(err.code === "unsupported" ? 400 : 422, err.message);
    }
    throw err;
  }

  const { data, error } = await getSupabase()
    .from("documents")
    .insert({
      owner_id: user.id,
      title: converted.title,
      content: converted.content,
    })
    .select("id, title, owner_id, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new ApiError(500, "Failed to create the document");
  }

  const meta: DocumentMeta = {
    id: data.id,
    title: data.title,
    ownerId: data.owner_id,
    ownerName: user.name,
    role: "owner",
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return NextResponse.json(meta, { status: 201 });
});
