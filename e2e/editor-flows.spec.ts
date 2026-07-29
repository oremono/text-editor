import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import path from "node:path";

/**
 * Real-browser E2E flows against the running Next.js app (shared demo
 * Supabase DB). Every test cleans up the documents it creates via the API
 * (DELETE /api/documents/:id as the owner) so the demo DB stays clean.
 */

const USERS = {
  alice: { email: "alice@demo.com", name: "Alice" },
  bob: { email: "bob@demo.com", name: "Bob" },
  carol: { email: "carol@demo.com", name: "Carol" },
} as const;

type DemoUser = keyof typeof USERS;

interface ApiUser {
  id: string;
  email: string;
  name: string;
}

/** Log in through the REAL login page UI (demo card click + Continue). */
async function loginAs(page: Page, who: DemoUser): Promise<void> {
  const { email, name } = USERS[who];
  await page.goto("/login");
  // Clicking a demo card fills the email input.
  await page.getByRole("button", { name: email }).click();
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");
  // Header shows the logged-in user's name.
  await expect(page.locator("header").getByText(name, { exact: true })).toBeVisible();
}

/** Resolve a demo user (incl. uuid) via the login API. */
async function apiLogin(
  request: APIRequestContext,
  who: DemoUser
): Promise<ApiUser> {
  const res = await request.post("/api/auth/login", {
    data: { email: USERS[who].email },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as ApiUser;
}

// ---- per-test cleanup registry (workers: 1, so a module var is safe) ----

let createdDocs: { id: string; owner: DemoUser }[] = [];

function trackDoc(id: string, owner: DemoUser = "alice"): void {
  createdDocs.push({ id, owner });
}

test.beforeEach(() => {
  createdDocs = [];
});

test.afterEach(async ({ request }) => {
  for (const doc of createdDocs) {
    try {
      const user = await apiLogin(request, doc.owner);
      await request.delete(`/api/documents/${doc.id}`, {
        headers: { "x-user-id": user.id },
      });
    } catch {
      // Best-effort cleanup — never fail the test run here.
    }
  }
});

/** Click "New document" and land in the editor; returns the new doc id. */
async function createDocViaUi(page: Page): Promise<string> {
  await page.getByRole("button", { name: "New document" }).click();
  await page.waitForURL(/\/doc\/[0-9a-f-]{36}/);
  const id = page.url().match(/\/doc\/([0-9a-f-]{36})/)![1];
  trackDoc(id, "alice");
  await expect(page.locator(".ProseMirror")).toBeVisible();
  return id;
}

/** Rename via the editor's inline title input and wait for the PATCH. */
async function renameViaEditor(page: Page, docId: string, title: string) {
  const input = page.getByLabel("Document title");
  await input.fill(title);
  const patched = page.waitForResponse(
    (r) =>
      r.url().includes(`/api/documents/${docId}`) &&
      r.request().method() === "PATCH" &&
      r.ok()
  );
  await input.press("Enter");
  await patched;
}

const saveStatus = (page: Page) => page.locator("header").getByRole("status");

// -------------------------------------------------------------------------

test("a. login flow: / redirects to /login, demo card signs Alice in", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByRole("button", { name: USERS.alice.email }).click();
  await expect(page.getByLabel("Email")).toHaveValue(USERS.alice.email);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL("/");
  await expect(
    page.locator("header").getByText("Alice", { exact: true })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "My documents" })).toBeVisible();
});

test("b. create + edit + persist: title, bold, h1 and bullet list survive reload", async ({
  page,
}) => {
  await loginAs(page, "alice");
  const docId = await createDocViaUi(page);

  const title = `E2E persist ${Date.now()}`;
  await renameViaEditor(page, docId, title);

  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.type("This paragraph has a ");
  await page.getByRole("button", { name: "Bold" }).click();
  await page.keyboard.type("bolded");
  await page.getByRole("button", { name: "Bold" }).click();
  await page.keyboard.type(" word.");

  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Heading 1" }).click();
  await page.keyboard.type("Big Heading");

  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Bullet list" }).click();
  await page.keyboard.type("First item");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Second item");

  // Autosave: debounce ~1.5 s then PATCH → "Saved".
  await expect(saveStatus(page)).toHaveText("Saved");

  await page.reload();
  await expect(page.getByLabel("Document title")).toHaveValue(title);
  const reloaded = page.locator(".ProseMirror");
  await expect(reloaded).toContainText("This paragraph has a bolded word.");
  await expect(reloaded.locator("strong")).toHaveText("bolded");
  await expect(reloaded.locator("h1")).toHaveText("Big Heading");
  await expect(reloaded.locator("ul li")).toHaveCount(2);
  await expect(reloaded.locator("ul li").first()).toHaveText("First item");
  await expect(reloaded.locator("ul li").last()).toHaveText("Second item");
});

test("c. rename from the editor persists to the doc list", async ({ page }) => {
  await loginAs(page, "alice");
  const docId = await createDocViaUi(page);

  const title = `E2E renamed ${Date.now()}`;
  await renameViaEditor(page, docId, title);

  await page.getByRole("link", { name: "Back to documents" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
});

test("d. sharing + role enforcement: viewer is read-only, editor can type", async ({
  page,
  browser,
}) => {
  // --- Alice: create a doc with content and share it with Bob as viewer ---
  await loginAs(page, "alice");
  const docId = await createDocViaUi(page);
  const title = `E2E shared ${Date.now()}`;
  await renameViaEditor(page, docId, title);

  await page.locator(".ProseMirror").click();
  await page.keyboard.type("Original content from Alice.");
  await expect(saveStatus(page)).toHaveText("Saved");

  await page.getByRole("button", { name: "Share" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Email address").fill(USERS.bob.email);
  // Role select defaults to Viewer — keep it.
  await expect(dialog.getByLabel("Role")).toHaveText("Viewer");
  await dialog.getByRole("button", { name: "Share" }).click();
  await expect(dialog.getByText("Bob", { exact: true })).toBeVisible();

  // --- Bob (fresh browser context): sees it under "Shared with me" ---
  const bobContext = await browser.newContext();
  const bobPage = await bobContext.newPage();
  try {
    await loginAs(bobPage, "bob");
    const row = bobPage.getByRole("listitem").filter({ hasText: title });
    await expect(row).toBeVisible();
    await expect(row.getByText("Viewer", { exact: true })).toBeVisible();
    await expect(row.getByText(`Owned by ${USERS.alice.name}`)).toBeVisible();

    await row.getByRole("link").click();
    await bobPage.waitForURL(`**/doc/${docId}`);

    // Read-only banner + non-editable editor; typing must not change content.
    await expect(
      bobPage.getByText(`View only — shared by ${USERS.alice.name}`)
    ).toBeVisible();
    const bobEditor = bobPage.locator(".ProseMirror");
    await expect(bobEditor).toHaveAttribute("contenteditable", "false");
    await expect(bobPage.getByRole("button", { name: "Bold" })).toBeDisabled();
    await bobEditor.click();
    await bobPage.keyboard.type("HACKED");
    await expect(bobEditor).not.toContainText("HACKED");
    await expect(bobEditor).toContainText("Original content from Alice.");

    // --- Alice promotes Bob to editor via the still-open dialog ---
    const promoted = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/documents/${docId}/shares`) &&
        r.request().method() === "POST" &&
        r.ok()
    );
    await dialog.getByLabel("Change role for Bob").click();
    await page.getByRole("option", { name: "Editor" }).click();
    await promoted;

    // --- Bob reloads: now editable, typing autosaves ---
    await bobPage.reload();
    const bobEditorNow = bobPage.locator(".ProseMirror");
    await expect(bobEditorNow).toHaveAttribute("contenteditable", "true");
    await expect(
      bobPage.getByText(`View only — shared by ${USERS.alice.name}`)
    ).toHaveCount(0);
    await bobEditorNow.click();
    await bobPage.keyboard.press("End");
    await bobPage.keyboard.type(" Plus a line from Bob.");
    await expect(saveStatus(bobPage)).toHaveText("Saved");
    await expect(bobEditorNow).toContainText("Plus a line from Bob.");
  } finally {
    await bobContext.close();
  }
});

test("e. upload a .txt fixture creates a doc with its content", async ({
  page,
}) => {
  await loginAs(page, "alice");

  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(__dirname, "fixtures", "sample.txt"));

  await page.waitForURL(/\/doc\/[0-9a-f-]{36}/);
  const id = page.url().match(/\/doc\/([0-9a-f-]{36})/)![1];
  trackDoc(id, "alice");

  await expect(page.getByLabel("Document title")).toHaveValue("sample");
  const editor = page.locator(".ProseMirror");
  await expect(editor).toContainText("Hello from the uploaded fixture file.");
  await expect(editor).toContainText(
    "This is the second line of the sample document."
  );
});

test("f. access denial: unshared user gets a friendly error, not the doc", async ({
  page,
  request,
}) => {
  // Create a doc owned by Alice directly via the API (denial is the scenario).
  const alice = await apiLogin(request, "alice");
  const res = await request.post("/api/documents", {
    headers: { "x-user-id": alice.id },
    data: { title: `E2E private ${Date.now()}` },
  });
  expect(res.status()).toBe(201);
  const doc = (await res.json()) as { id: string };
  trackDoc(doc.id, "alice");

  await loginAs(page, "bob");
  await page.goto(`/doc/${doc.id}`);

  await expect(
    page.getByRole("heading", { name: "Can't open this document" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to your documents" })
  ).toBeVisible();
  await expect(page.locator(".ProseMirror")).toHaveCount(0);
});
