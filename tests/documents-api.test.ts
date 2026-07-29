/**
 * Route-handler-level CRUD tests for the documents API, invoking the real
 * Next.js route handlers with real Request objects (params as a Promise,
 * Next 16 style) and @/lib/supabase mocked by an in-memory fake.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GET as listDocuments,
  POST as createDocument,
} from "@/app/api/documents/route";
import {
  DELETE as deleteDocument,
  GET as getDocument,
  PATCH as patchDocument,
} from "@/app/api/documents/[id]/route";
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
        title: "Shared doc",
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

function apiRequest(
  userId: string | null,
  init: { method?: string; body?: unknown } = {}
): Request {
  const headers: Record<string, string> = {};
  if (userId) headers["x-user-id"] = userId;
  let body: string | undefined;
  if (init.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(init.body);
  }
  return new Request("http://localhost/api/documents", {
    method: init.method ?? "GET",
    headers,
    body,
  });
}

function ctx(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/documents", () => {
  it("creates a doc with contract defaults and returns 201 DocumentFull (role owner)", async () => {
    const res = await createDocument(
      apiRequest(ALICE, { method: "POST", body: {} }),
      {}
    );
    expect(res.status).toBe(201);
    const doc = await res.json();
    expect(doc).toMatchObject({
      title: "Untitled document",
      content: { type: "doc", content: [] },
      ownerId: ALICE,
      ownerName: "Alice",
      role: "owner",
    });
    expect(typeof doc.id).toBe("string");
    expect(typeof doc.createdAt).toBe("string");
    expect(typeof doc.updatedAt).toBe("string");
    // Persisted: the new doc is now retrievable by its owner.
    const getRes = await getDocument(apiRequest(ALICE), ctx(doc.id));
    expect(getRes.status).toBe(200);
  });

  it("honors an explicit title and content", async () => {
    const content = { type: "doc", content: [{ type: "paragraph" }] };
    const res = await createDocument(
      apiRequest(BOB, { method: "POST", body: { title: "  My doc  ", content } }),
      {}
    );
    expect(res.status).toBe(201);
    const doc = await res.json();
    expect(doc.title).toBe("My doc");
    expect(doc.content).toEqual(content);
    expect(doc.role).toBe("owner");
  });

  it("401 without x-user-id", async () => {
    const res = await createDocument(apiRequest(null, { method: "POST" }), {});
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBeTypeOf("string");
  });
});

describe("GET /api/documents", () => {
  it("tags each doc with the caller's role", async () => {
    const res = await listDocuments(apiRequest(BOB), {});
    expect(res.status).toBe(200);
    const docs = await res.json();
    const shared = docs.find((d: any) => d.id === DOC);
    expect(shared).toMatchObject({ role: "editor", ownerName: "Alice" });
    expect(shared.content).toBeUndefined();
  });
});

describe("GET /api/documents/:id", () => {
  it("200 with the caller's role for a viewer", async () => {
    const res = await getDocument(apiRequest(CAROL), ctx(DOC));
    expect(res.status).toBe(200);
    const doc = await res.json();
    expect(doc).toMatchObject({ id: DOC, role: "viewer", ownerName: "Alice" });
  });

  it("403 for a user without access", async () => {
    const res = await getDocument(apiRequest(DAVE), ctx(DOC));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBeTypeOf("string");
  });

  it("404 for an unknown doc", async () => {
    const res = await getDocument(apiRequest(ALICE), ctx(MISSING_DOC));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Document not found" });
  });
});

describe("PATCH /api/documents/:id", () => {
  it("403 as viewer", async () => {
    const res = await patchDocument(
      apiRequest(CAROL, { method: "PATCH", body: { title: "Hacked" } }),
      ctx(DOC)
    );
    expect(res.status).toBe(403);
    // Nothing was written.
    expect(state.db.documents![0].title).toBe("Shared doc");
  });

  it("200 as editor, persists changes and bumps updated_at", async () => {
    const before = state.db.documents![0].updated_at;
    const content = { type: "doc", content: [{ type: "paragraph" }] };
    const res = await patchDocument(
      apiRequest(BOB, { method: "PATCH", body: { title: "Renamed", content } }),
      ctx(DOC)
    );
    expect(res.status).toBe(200);
    const doc = await res.json();
    expect(doc).toMatchObject({ id: DOC, title: "Renamed", role: "editor" });
    expect(doc.content).toEqual(content);
    expect(doc.updatedAt).not.toBe(before);
    expect(state.db.documents![0].title).toBe("Renamed");
  });

  it("400 when neither title nor content is provided", async () => {
    const res = await patchDocument(
      apiRequest(ALICE, { method: "PATCH", body: {} }),
      ctx(DOC)
    );
    expect(res.status).toBe(400);
  });

  it("404 for an unknown doc", async () => {
    const res = await patchDocument(
      apiRequest(ALICE, { method: "PATCH", body: { title: "x" } }),
      ctx(MISSING_DOC)
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/documents/:id", () => {
  it("403 as editor", async () => {
    const res = await deleteDocument(
      apiRequest(BOB, { method: "DELETE" }),
      ctx(DOC)
    );
    expect(res.status).toBe(403);
    expect(state.db.documents).toHaveLength(1);
  });

  it("403 as viewer", async () => {
    const res = await deleteDocument(
      apiRequest(CAROL, { method: "DELETE" }),
      ctx(DOC)
    );
    expect(res.status).toBe(403);
  });

  it("200 { ok: true } as owner; doc is gone afterwards", async () => {
    const res = await deleteDocument(
      apiRequest(ALICE, { method: "DELETE" }),
      ctx(DOC)
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(state.db.documents).toHaveLength(0);
    // CRUD round-trip: subsequent GET → 404.
    const getRes = await getDocument(apiRequest(ALICE), ctx(DOC));
    expect(getRes.status).toBe(404);
  });

  it("404 for an unknown doc", async () => {
    const res = await deleteDocument(
      apiRequest(ALICE, { method: "DELETE" }),
      ctx(MISSING_DOC)
    );
    expect(res.status).toBe(404);
  });
});
