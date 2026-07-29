/**
 * Core access-control matrix (spec §4 / CONTRACTS.md §2) against the real
 * lib/access.ts, with @/lib/supabase mocked by an in-memory fake.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDocumentAccess, requireAccess } from "@/lib/access";
import { ApiError } from "@/lib/api-helpers";
import type { FakeDb } from "./helpers/fake-supabase";

const state = vi.hoisted(() => ({ db: {} as Record<string, any[]> }));

vi.mock("@/lib/supabase", async () => {
  const { createFakeSupabase } = await import("./helpers/fake-supabase");
  return { getSupabase: () => createFakeSupabase(state.db) };
});

const ALICE = "00000000-0000-4000-8000-00000000000a"; // owner
const BOB = "00000000-0000-4000-8000-00000000000b"; // shared editor
const CAROL = "00000000-0000-4000-8000-00000000000c"; // shared viewer
const DAVE = "00000000-0000-4000-8000-00000000000d"; // no access
const DOC = "10000000-0000-4000-8000-000000000001";
const MISSING_DOC = "10000000-0000-4000-8000-0000000000ff";

beforeEach(() => {
  state.db = {
    users: [
      { id: ALICE, email: "alice@demo.com", name: "Alice" },
      { id: BOB, email: "bob@demo.com", name: "Bob" },
      { id: CAROL, email: "carol@demo.com", name: "Carol" },
      { id: DAVE, email: "dave@demo.com", name: "Dave" },
    ],
    documents: [
      {
        id: DOC,
        owner_id: ALICE,
        title: "Test doc",
        content: { type: "doc", content: [] },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
      },
    ],
    document_shares: [
      { id: "s1", document_id: DOC, user_id: BOB, role: "editor" },
      { id: "s2", document_id: DOC, user_id: CAROL, role: "viewer" },
    ],
  } satisfies FakeDb as Record<string, any[]>;
});

describe("getDocumentAccess", () => {
  it("returns 'owner' for the document owner", async () => {
    await expect(getDocumentAccess(DOC, ALICE)).resolves.toBe("owner");
  });

  it("returns 'editor' for a user with an editor share row", async () => {
    await expect(getDocumentAccess(DOC, BOB)).resolves.toBe("editor");
  });

  it("returns 'viewer' for a user with a viewer share row", async () => {
    await expect(getDocumentAccess(DOC, CAROL)).resolves.toBe("viewer");
  });

  it("returns null for an existing doc with no share for the user", async () => {
    await expect(getDocumentAccess(DOC, DAVE)).resolves.toBeNull();
  });

  it("throws ApiError(404) for a nonexistent document", async () => {
    const promise = getDocumentAccess(MISSING_DOC, ALICE);
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(getDocumentAccess(MISSING_DOC, ALICE)).rejects.toMatchObject({
      status: 404,
      message: "Document not found",
    });
  });

  it("throws 404 even for users who would otherwise have a share row", async () => {
    state.db.document_shares!.push({
      id: "s3",
      document_id: MISSING_DOC,
      user_id: BOB,
      role: "editor",
    });
    await expect(getDocumentAccess(MISSING_DOC, BOB)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("requireAccess", () => {
  it("owner passes every min-role level and returns 'owner'", async () => {
    await expect(requireAccess(DOC, ALICE, "viewer")).resolves.toBe("owner");
    await expect(requireAccess(DOC, ALICE, "editor")).resolves.toBe("owner");
    await expect(requireAccess(DOC, ALICE, "owner")).resolves.toBe("owner");
  });

  it("editor passes viewer- and editor-level checks, returning 'editor'", async () => {
    await expect(requireAccess(DOC, BOB, "viewer")).resolves.toBe("editor");
    await expect(requireAccess(DOC, BOB, "editor")).resolves.toBe("editor");
  });

  it("editor requesting owner-level → ApiError(403)", async () => {
    const promise = requireAccess(DOC, BOB, "owner");
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(requireAccess(DOC, BOB, "owner")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("viewer passes viewer-level, returning 'viewer'", async () => {
    await expect(requireAccess(DOC, CAROL, "viewer")).resolves.toBe("viewer");
  });

  it("viewer requesting editor-level → ApiError(403)", async () => {
    await expect(requireAccess(DOC, CAROL, "editor")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("viewer requesting owner-level → ApiError(403)", async () => {
    await expect(requireAccess(DOC, CAROL, "owner")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("user with no access → 403 at every level", async () => {
    for (const minRole of ["viewer", "editor", "owner"] as const) {
      await expect(requireAccess(DOC, DAVE, minRole)).rejects.toMatchObject({
        status: 403,
      });
    }
  });

  it("nonexistent doc → 404 (not 403), even at owner level", async () => {
    await expect(requireAccess(MISSING_DOC, ALICE, "owner")).rejects.toMatchObject(
      { status: 404 }
    );
  });

  it("role ordering is owner > editor > viewer", async () => {
    // Each role must satisfy exactly the levels at or below its rank.
    const cases: Array<[string, "viewer" | "editor" | "owner", boolean]> = [
      [ALICE, "owner", true],
      [BOB, "owner", false],
      [BOB, "editor", true],
      [CAROL, "editor", false],
      [CAROL, "viewer", true],
    ];
    for (const [userId, minRole, allowed] of cases) {
      if (allowed) {
        await expect(requireAccess(DOC, userId, minRole)).resolves.toBeTruthy();
      } else {
        await expect(requireAccess(DOC, userId, minRole)).rejects.toMatchObject({
          status: 403,
        });
      }
    }
  });
});
