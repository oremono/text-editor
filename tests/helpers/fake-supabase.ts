/**
 * Minimal in-memory fake for the subset of supabase-js used by this app:
 * from(table).select()/insert()/update()/upsert()/delete() with .eq()/.in()
 * filters, .order(), and .single()/.maybeSingle() terminators.
 *
 * The builder is thenable, so `await query` resolves to `{ data, error }`
 * exactly like the real client.
 */
import { randomUUID } from "node:crypto";

export type Row = Record<string, any>;

export interface FakeDb {
  users?: Row[];
  documents?: Row[];
  document_shares?: Row[];
  [table: string]: Row[] | undefined;
}

interface FakeResult {
  data: any;
  error: { message: string; code?: string } | null;
}

/** Column defaults mirroring supabase/schema defaults. */
const TABLE_DEFAULTS: Record<string, () => Row> = {
  users: () => ({ created_at: new Date().toISOString() }),
  documents: () => ({
    title: "Untitled document",
    content: { type: "doc", content: [] },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  document_shares: () => ({ created_at: new Date().toISOString() }),
};

class FakeQueryBuilder implements PromiseLike<FakeResult> {
  private filters: Array<(r: Row) => boolean> = [];
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private payload: Row | Row[] | null = null;
  private mode: "many" | "single" | "maybeSingle" = "many";
  private ordering: { column: string; ascending: boolean } | null = null;

  constructor(
    private readonly db: FakeDb,
    private readonly table: string
  ) {}

  select(_columns?: string) {
    return this;
  }

  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = rows;
    return this;
  }

  update(patch: Row) {
    this.op = "update";
    this.payload = patch;
    return this;
  }

  upsert(rows: Row | Row[], _options?: { onConflict?: string }) {
    this.op = "upsert";
    this.payload = rows;
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((r) => r[column] === value);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push((r) => values.includes(r[column]));
    return this;
  }

  /** Not evaluated — passes all rows through. Keep test data unambiguous. */
  or(_expr: string) {
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.ordering = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(_n: number) {
    return this;
  }

  single() {
    this.mode = "single";
    return this;
  }

  maybeSingle() {
    this.mode = "maybeSingle";
    return this;
  }

  then<T1 = FakeResult, T2 = never>(
    onfulfilled?: ((value: FakeResult) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null
  ): PromiseLike<T1 | T2> {
    return Promise.resolve()
      .then(() => this.run())
      .then(onfulfilled, onrejected);
  }

  private rows(): Row[] {
    return (this.db[this.table] ??= []);
  }

  private run(): FakeResult {
    const rows = this.rows();

    if (this.op === "insert" || this.op === "upsert") {
      const input = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const out: Row[] = [];
      for (const raw of input) {
        // upsert on document_shares conflicts on (document_id, user_id)
        const existing =
          this.op === "upsert" && this.table === "document_shares"
            ? rows.find(
                (r) =>
                  r.document_id === raw.document_id && r.user_id === raw.user_id
              )
            : undefined;
        if (existing) {
          Object.assign(existing, raw);
          out.push(existing);
        } else {
          const row = {
            id: randomUUID(),
            ...(TABLE_DEFAULTS[this.table]?.() ?? {}),
            ...raw,
          };
          rows.push(row);
          out.push(row);
        }
      }
      return this.materialize(out);
    }

    const matched = rows.filter((r) => this.filters.every((f) => f(r)));

    if (this.op === "update") {
      for (const r of matched) Object.assign(r, this.payload);
      return this.materialize(matched);
    }

    if (this.op === "delete") {
      this.db[this.table] = rows.filter((r) => !matched.includes(r));
      return this.materialize(matched);
    }

    let out = [...matched];
    if (this.ordering) {
      const { column, ascending } = this.ordering;
      out.sort((a, b) => {
        const av = a[column];
        const bv = b[column];
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return ascending ? cmp : -cmp;
      });
    }
    return this.materialize(out);
  }

  private materialize(rows: Row[]): FakeResult {
    if (this.mode === "maybeSingle") {
      return { data: rows[0] ?? null, error: null };
    }
    if (this.mode === "single") {
      if (rows.length === 0) {
        return {
          data: null,
          error: { message: "JSON object requested, 0 rows returned", code: "PGRST116" },
        };
      }
      return { data: rows[0], error: null };
    }
    return { data: rows, error: null };
  }
}

/** A drop-in fake for `getSupabase()` backed by the given in-memory tables. */
export function createFakeSupabase(db: FakeDb) {
  return {
    from: (table: string) => new FakeQueryBuilder(db, table),
  } as any;
}
