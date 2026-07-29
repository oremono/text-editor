/**
 * Shared domain types — the single source of truth for shapes passed
 * between API routes and client components. See CONTRACTS.md.
 */

export type Role = "owner" | "editor" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface DocumentMeta {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  /** The requesting user's role on this document. */
  role: Role;
  updatedAt: string; // ISO timestamp
  createdAt: string; // ISO timestamp
}

export interface DocumentFull extends DocumentMeta {
  /** Tiptap JSON document ({ type: "doc", content: [...] }). */
  content: unknown;
}

export interface Share {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: Role; // only 'editor' | 'viewer' are ever stored in document_shares
}
