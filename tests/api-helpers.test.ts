/**
 * Tests for lib/api-helpers.ts: requireUser and withErrorHandling, with
 * @/lib/supabase mocked by an in-memory fake.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  ApiError,
  jsonError,
  requireUser,
  withErrorHandling,
} from "@/lib/api-helpers";

const state = vi.hoisted(() => ({ db: {} as Record<string, any[]> }));

vi.mock("@/lib/supabase", async () => {
  const { createFakeSupabase } = await import("./helpers/fake-supabase");
  return { getSupabase: () => createFakeSupabase(state.db) };
});

const ALICE = "00000000-0000-4000-8000-00000000000a";
const UNKNOWN = "00000000-0000-4000-8000-0000000000ee";

beforeEach(() => {
  state.db = {
    users: [{ id: ALICE, email: "alice@demo.com", name: "Alice" }],
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

function reqWithUser(userId?: string): Request {
  return new Request("http://localhost/api/test", {
    headers: userId ? { "x-user-id": userId } : {},
  });
}

describe("requireUser", () => {
  it("throws ApiError(401) when the x-user-id header is missing", async () => {
    const promise = requireUser(reqWithUser());
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(requireUser(reqWithUser())).rejects.toMatchObject({
      status: 401,
    });
  });

  it("throws ApiError(401) for an unknown user id", async () => {
    await expect(requireUser(reqWithUser(UNKNOWN))).rejects.toMatchObject({
      status: 401,
    });
  });

  it("returns the User for a valid id", async () => {
    await expect(requireUser(reqWithUser(ALICE))).resolves.toEqual({
      id: ALICE,
      email: "alice@demo.com",
      name: "Alice",
    });
  });
});

describe("jsonError", () => {
  it("builds a { error } JSON response with the given status", async () => {
    const res = jsonError("nope", 418);
    expect(res.status).toBe(418);
    await expect(res.json()).resolves.toEqual({ error: "nope" });
  });
});

describe("withErrorHandling", () => {
  const req = reqWithUser(ALICE);

  it("passes through a successful handler response untouched", async () => {
    const handler = withErrorHandling(async () =>
      Response.json({ ok: true }, { status: 201 })
    );
    const res = await handler(req, {});
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("maps a thrown ApiError to its status and { error: message }", async () => {
    const handler = withErrorHandling(async () => {
      throw new ApiError(403, "You do not have permission to do that");
    });
    const res = await handler(req, {});
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: "You do not have permission to do that",
    });
  });

  it("maps a thrown ZodError to 400 with an { error } body", async () => {
    const schema = z.object({ title: z.string().min(1) });
    const handler = withErrorHandling(async () => {
      schema.parse({ title: 42 });
      return Response.json({});
    });
    const res = await handler(req, {});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("maps an unexpected throw to 500 Internal server error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withErrorHandling(async () => {
      throw new Error("boom");
    });
    const res = await handler(req, {});
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Internal server error",
    });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("propagates errors thrown by requireUser inside the handler as 401", async () => {
    const handler = withErrorHandling(async (r: Request) => {
      await requireUser(r);
      return Response.json({ ok: true });
    });
    const res = await handler(reqWithUser(), {});
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
  });
});
