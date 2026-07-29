import "server-only";

import { marked } from "marked";
import mammoth from "mammoth";
import { generateJSON } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";

/** Extensions accepted for upload conversion. */
export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".docx"] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

/**
 * Typed conversion error with a human-readable message.
 * - `unsupported` → the file extension isn't one we can convert (HTTP 400)
 * - `parse_failed` → the file matched a supported type but couldn't be parsed (HTTP 422)
 */
export class ConvertError extends Error {
  readonly code: "unsupported" | "parse_failed";

  constructor(code: "unsupported" | "parse_failed", message: string) {
    super(message);
    this.name = "ConvertError";
    this.code = code;
  }
}

interface TiptapDoc {
  type: "doc";
  content: unknown[];
}

/**
 * Tiptap v3 StarterKit already registers Underline (and the other marks/nodes
 * we care about), so it's the only extension needed for HTML → JSON.
 */
const EXTENSIONS = [StarterKit];

function htmlToTiptap(html: string): TiptapDoc {
  const json = generateJSON(html, EXTENSIONS) as TiptapDoc;
  return {
    type: "doc",
    content: Array.isArray(json.content) ? json.content : [],
  };
}

/** Plain text: every non-blank line becomes a paragraph; blank lines separate paragraphs. */
function txtToTiptap(text: string): TiptapDoc {
  const paragraphs = text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .map((line) => ({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    }));

  return {
    type: "doc",
    // An empty file still yields a valid, editable document.
    content: paragraphs.length > 0 ? paragraphs : [{ type: "paragraph" }],
  };
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return "";
  return filename.slice(dot).toLowerCase();
}

/** Filename without its final extension (fallback to the raw name). */
function titleFromFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const trimmed = base.trim();
  return trimmed.length > 0 ? trimmed : "Untitled document";
}

/**
 * Convert an uploaded file (.txt / .md / .docx) into a Tiptap document.
 * Dispatches on the filename extension, case-insensitively.
 *
 * @throws {ConvertError} `unsupported` for unknown extensions,
 *                        `parse_failed` when conversion blows up.
 */
export async function convertFileToTiptap(
  filename: string,
  buffer: Buffer
): Promise<{ title: string; content: object }> {
  const ext = getExtension(filename);
  const title = titleFromFilename(filename);

  if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new ConvertError(
      "unsupported",
      "Unsupported file type. Supported types: .txt, .md, .docx"
    );
  }

  try {
    if (ext === ".txt") {
      return { title, content: txtToTiptap(buffer.toString("utf8")) };
    }

    if (ext === ".md") {
      const html = await marked.parse(buffer.toString("utf8"));
      return { title, content: htmlToTiptap(html) };
    }

    // .docx
    const { value: html } = await mammoth.convertToHtml({ buffer });
    return { title, content: htmlToTiptap(html) };
  } catch (err) {
    if (err instanceof ConvertError) throw err;
    const detail = err instanceof Error && err.message ? ` (${err.message})` : "";
    throw new ConvertError(
      "parse_failed",
      `Could not read "${filename}" — the file appears to be invalid or corrupted${detail}.`
    );
  }
}
