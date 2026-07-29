# CONTRACTS.md — binding contracts for all feature agents

This file is the single source of truth for how the pieces of this app talk to
each other. **Wave-1 agents build against these contracts, never against each
other's code.** If something here conflicts with your instinct, this file wins.
`spec.md` §1–§7 covers product behavior; this file covers exact shapes.

Environment facts (already true after Wave 0):

- Next.js 16 App Router, TypeScript, Tailwind v4, no `src/` dir, alias `@/*` → repo root.
- shadcn/ui initialized (style `radix-nova`, base color neutral, radix primitives).
  Available components: `button`, `dialog`, `dropdown-menu`, `input`, `label`,
  `select`, `sonner`, `badge`, `card` in `components/ui/`. `<Toaster />` is
  already mounted in `app/layout.tsx` — call `toast(...)` from `sonner` anywhere.
- **zod is v4** and **Tiptap is v3** (`@tiptap/react`, `@tiptap/starter-kit`,
  `@tiptap/extension-underline`, `@tiptap/html`). `marked`, `mammoth`,
  `@supabase/supabase-js` v2 installed. `vitest` v4 installed; `npm test` runs
  `vitest run`.
- `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

---

## 1. Shared types — `lib/types.ts` (do not modify)

```ts
export type Role = "owner" | "editor" | "viewer";

export interface User { id: string; email: string; name: string }

export interface DocumentMeta {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  role: Role;          // the REQUESTING user's role on this doc
  updatedAt: string;   // ISO timestamp
  createdAt: string;   // ISO timestamp
}

export interface DocumentFull extends DocumentMeta {
  content: unknown;    // Tiptap JSON: { type: "doc", content: [...] }
}

export interface Share {
  id: string;          // document_shares row id
  userId: string;
  email: string;
  name: string;
  role: Role;          // only 'editor' | 'viewer' ever appear in shares
}
```

All API responses use these **camelCase** shapes. The DB is snake_case
(`owner_id`, `updated_at`, …) — route handlers do the mapping.

## 2. Server lib — signatures (do not modify these files)

`lib/supabase.ts` (server-only):

```ts
export function getSupabase(): SupabaseClient  // service-role admin client, lazy singleton
```

`lib/api-helpers.ts` (server-only):

```ts
export class ApiError extends Error { readonly status: number; constructor(status: number, message: string) }
export function jsonError(message: string, status: number): NextResponse  // body: { error: message }
export async function requireUser(req: Request): Promise<User>
  // reads x-user-id header; missing header / unknown id / bad uuid → throws ApiError(401)
export function withErrorHandling<Ctx = unknown>(
  handler: (req: Request, ctx: Ctx) => Promise<Response>
): (req: Request, ctx: Ctx) => Promise<Response>
  // ApiError → its status; ZodError → 400; anything else → 500. ALL route handlers must be wrapped.
```

`lib/access.ts` (server-only):

```ts
export async function getDocumentAccess(docId: string, userId: string): Promise<Role | null>
  // owner_id match → 'owner'; document_shares row → its role; no access → null
  // IMPORTANT: throws ApiError(404, "Document not found") if the doc doesn't exist
export async function requireAccess(docId: string, userId: string, minRole: Role): Promise<Role>
  // ordering owner(3) > editor(2) > viewer(1); insufficient/null → throws ApiError(403); missing doc → 404
```

Route handler pattern (use exactly this shape; Next 16 params are a Promise):

```ts
export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(req);
    const { id } = await params;
    await requireAccess(id, user.id, "editor");
    const body = schema.parse(await req.json()); // ZodError auto-becomes 400
    // ...
    return NextResponse.json(result);
  }
);
```

## 3. Client session — `lib/session.ts` (do not modify)

localStorage key **`docs-user`** holds the JSON `User`. Logged in = key present.

```ts
export const SESSION_KEY = "docs-user";
export function getSessionUser(): User | null;
export function setSessionUser(user: User): void;
export function clearSessionUser(): void;
export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T>
  // attaches x-user-id; sets content-type: application/json for string bodies;
  // on !ok throws Error(serverErrorMessage); returns parsed JSON (undefined if empty body)
```

Client rule: **all** API calls go through `apiFetch`; on catch, show
`toast.error(err.message)`. For FormData bodies (upload), pass FormData as
`body` and do NOT set content-type manually.

## 4. API routes (spec §5) — exact request/response shapes

Auth: every route **except `POST /api/auth/login`** requires the `x-user-id`
header (enforced via `requireUser`). Every error response is
`{ error: string }` with the listed status. Validate bodies with zod v4.

| # | Method & path | Owner (agent) |
|---|---|---|
| 1 | `POST /api/auth/login` | A |
| 2 | `GET /api/documents` | A |
| 3 | `POST /api/documents` | A |
| 4 | `GET /api/documents/:id` | A |
| 5 | `PATCH /api/documents/:id` | A |
| 6 | `DELETE /api/documents/:id` | A |
| 7 | `GET /api/documents/:id/shares` | C |
| 8 | `POST /api/documents/:id/shares` | C |
| 9 | `DELETE /api/documents/:id/shares/:userId` | C |
| 10 | `POST /api/upload` | D |

**1. POST /api/auth/login** — public.
Body: `{ email: string }` (zod: trimmed, lowercased, `z.email()`).
200 → `User`. 404 → `{ error }` with a friendly message noting demo accounts
(alice@demo.com, bob@demo.com, carol@demo.com). 400 invalid body.

**2. GET /api/documents**
200 → `DocumentMeta[]` (owned + shared, each tagged with caller's `role`,
`ownerName` from users join, sorted by `updatedAt` desc). No content field. 401.

**3. POST /api/documents**
Body (all optional): `{ title?: string, content?: unknown }`.
Defaults: title `"Untitled document"`, content `{ type: "doc", content: [] }`.
201 → `DocumentFull` (role `"owner"`). 400/401.

**4. GET /api/documents/:id**
200 → `DocumentFull` with caller's `role`. 401/403/404.

**5. PATCH /api/documents/:id** — min role `editor`.
Body: `{ title?: string, content?: unknown }` — at least one key required
(else 400). Title: 1–200 chars after trim. Must bump `updated_at = now()`.
200 → `DocumentFull` (post-update). 400/401/403/404.

**6. DELETE /api/documents/:id** — min role `owner`.
200 → `{ ok: true }`. 401/403/404.

**7. GET /api/documents/:id/shares** — min role `owner`.
200 → `Share[]`. 401/403/404.

**8. POST /api/documents/:id/shares** — min role `owner`.
Body: `{ email: string, role: "editor" | "viewer" }` (zod enum).
Upserts on (document_id, user_id). Rules: email not found in users → 404
`{ error: "No user with that email" }`; sharing with yourself/the owner → 400.
200 → `Share[]` (the full updated list). 400/401/403/404.

**9. DELETE /api/documents/:id/shares/:userId** — min role `owner`.
`:userId` is the target user's id (not the share row id). Missing share → 404.
200 → `Share[]` (the full updated list). 401/403/404.

**10. POST /api/upload**
multipart/form-data with field **`file`**. Accepted: `.txt`, `.md`, `.docx`
(checked by extension AND sensible mime), max **2 MB** → 413 if larger,
400 unsupported type, 422 failed parse (no doc created on any failure).
Conversion (in `lib/convert.ts`, Agent D): txt → paragraphs per line;
md → `marked` → HTML → `generateJSON` from `@tiptap/html`; docx → `mammoth`
→ HTML → `generateJSON`. Extensions for `generateJSON`: StarterKit + Underline.
Title = filename without extension. Creates the doc itself (direct DB insert,
owner = caller).
201 → `{ id: string }` (the new doc id). 400/401/413/422.

## 5. Component contracts

```ts
// components/share-dialog.tsx (Agent C) — named export ShareDialog
function ShareDialog(props: { docId: string; open: boolean; onOpenChange: (o: boolean) => void }): JSX.Element

// components/upload-button.tsx (Agent D) — named export UploadButton
function UploadButton(props: { onUploaded?: (docId: string) => void }): JSX.Element
// After a successful upload it calls onUploaded?.(docId) AND router.push(`/doc/${docId}`) itself.

// components/editor/save-indicator.tsx (Agent B) — named export SaveIndicator
function SaveIndicator(props: { state: "idle" | "saving" | "saved" | "error" }): JSX.Element
```

All three are client components (`"use client"`).

**Mount points (integration wave verifies):**
- Agent A renders `<UploadButton />` in the doc-list header
  (`import { UploadButton } from "@/components/upload-button"`).
- Agent B renders `<ShareDialog docId=... open=... onOpenChange=... />` from a
  Share button visible only when `role === "owner"`
  (`import { ShareDialog } from "@/components/share-dialog"`).
- Write these imports even if the file doesn't exist yet at your build time.

**Pages:** `/login` (Agent A), `/` doc list (Agent A, client component,
redirect to `/login` when no session), `/doc/[id]` (Agent B, shows read-only
banner + non-editable Tiptap when `role === "viewer"`).

## 6. File ownership map (hard boundaries)

| Agent | Owns (nobody else touches) |
|---|---|
| A | `app/api/auth/**`, `app/api/documents/route.ts`, `app/api/documents/[id]/route.ts`, `app/login/**`, `app/page.tsx`, `components/doc-list*` |
| B | `app/doc/**`, `components/editor/**` |
| C | `app/api/documents/[id]/shares/**`, `components/share-dialog.tsx` |
| D | `app/api/upload/**`, `lib/convert.ts`, `components/upload-button.tsx` |
| E | `vitest.config.ts`, `tests/**` |

**Nobody modifies `lib/` (except D's new `lib/convert.ts`), `app/layout.tsx`,
`app/globals.css`, `components/ui/**`, `components.json`, or `package.json`
after Wave 0.** If you think you need a new dependency, you don't — solve it
with what's installed. Agent E mocks `@/lib/supabase` (vitest `vi.mock`) and
must alias/stub the `server-only` import in `vitest.config.ts`.

## 7. Misc conventions

- Toasts: `import { toast } from "sonner"`.
- Dates shown to users: keep simple (`new Date(iso).toLocaleString()` or similar).
- Role badge wording: `Owner`, `Editor`, `Viewer`.
- Demo accounts to print on `/login`: alice@demo.com, bob@demo.com, carol@demo.com.
- Autosave (Agent B): debounce ~1.5 s, PATCH content only, indicator
  idle → saving → saved, error → `error` state + toast with retry guidance.
