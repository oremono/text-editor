# AI Workflow Note

**In one line:** Claude Code (Fable 5) was the only AI tool, run as an orchestrator driving parallel sub-agents against human-frozen contracts — AI provided parallel throughput and mechanical breadth; a human made every scoping decision, owned the contracts, and verified every result before it counted.

The assignment asks four questions: which AI tools were used, where they materially helped, what AI output was changed or rejected, and how correctness was verified. Each section below answers one directly.

## 1. Tools used

**Claude Code (Fable 5)** — the only AI tool, but used in a specific way: not as a single chat assistant, but as an **orchestrator driving parallel sub-agents**. The main session did planning, delegation, contract enforcement, and commits; sub-agents did the file work in bounded slices.

**The workflow — contract-first, parallel waves:**

1. **Planning first, code second.** The spec (`spec.md`) was written and human-reviewed before any application code: stack decisions with rationale, data model, permission matrix, API surface, scope cuts, and a time budget.
2. **Wave 0 — freeze the contracts.** One agent built the `lib/` foundation (Supabase client, access-control helpers, API error handling, session utilities) and produced `CONTRACTS.md`: exact request/response shapes for all 10 API routes, shared TypeScript types, component props, and a hard file-ownership map.
3. **Wave 1 — five agents in parallel**, each owning a disjoint slice: (A) auth + documents CRUD + list page, (B) Tiptap editor + toolbar + autosave, (C) sharing API + dialog, (D) upload + conversion pipeline, (E) the Vitest suite. Agents built against `CONTRACTS.md`, never against each other's in-flight code.
4. **Wave 2 — integration.** One agent wired the mount points, ran the app against the live database, and fixed cross-boundary mismatches.
5. **Wave 3 — deploy, docs, and E2E**, again in parallel: Vercel deployment, documentation, live smoke testing, and Playwright browser tests.

One commit per wave, made by the orchestrator after reviewing each agent's report. Agents never committed.

## 2. Where AI materially sped things up

- **Parallel feature construction.** The five Wave-1 slices were built concurrently — the single biggest time win, and only possible because the contracts were frozen first.
- **Test authoring.** The 39-test Vitest suite (access-control matrix, route handlers with a mocked Supabase client, including the `server-only` import stub for the test environment) was largely agent-written and would have consumed a large fraction of the timebox by hand.
- **Conversion pipeline research.** Evaluating and wiring `mammoth` (.docx → HTML) and `marked` (.md → HTML) into Tiptap's `generateJSON`, including Tiptap v3 API specifics, was compressed from research-plus-trial-and-error into minutes.

## 3. What was changed or rejected by human judgment

- **Chose mock auth over Supabase Auth** — an AI-neutral but human-owned scope call to protect the timebox, with the API boundary designed so real auth slots in later (see ARCHITECTURE.md §4).
- **Corrected agent deviations against the contract.** Example: one agent's implementation brief drifted from `CONTRACTS.md` on the share endpoints' response shape (the contract requires returning the full updated `Share[]` list, so the dialog re-renders from one response). Caught in review and fixed before integration.
- **Caught a corrupted environment key.** An env value had picked up invisible ANSI escape bytes, producing confusing Supabase failures. Found during human-driven integration testing by inspecting the raw bytes — the kind of failure an agent's "it should work" report does not surface on its own.

## 4. How correctness was verified

Four layers, each gated by human review:

1. **39 Vitest tests** — the full permission matrix (owner/editor/viewer/stranger/missing doc) and route-handler behavior, run on every wave.
2. **curl-based end-to-end checks against the live database** — real HTTP requests exercising login, CRUD, share, and 403/404 paths during integration.
3. **Playwright browser E2E (`e2e/`)** — the main user flows in a real browser against the running app.
4. **Human review at every gate** — each wave's agent report was read and checked against the contract before its commit, followed by a final manual pass through the deployed app (both demo users, both roles, all upload types).

The intent throughout: practical AI use — AI for parallel throughput and mechanical breadth, with a human making every scoping decision, owning the contracts, and verifying every result before it counted.
