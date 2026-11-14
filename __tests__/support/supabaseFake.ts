// __tests__/support/supabaseFake.ts
// A small in-memory stand-in for the Supabase client, for page and action
// tests. Rows live in `tables`; reads filter them (eq, is, in, not is null,
// order, limit), writes are recorded in `writes` and can be made to fail.
// Row-level security is not modelled: a test puts in a table only the rows
// that user would be allowed to read.
type Row = Record<string, unknown>;

export interface Write {
  table: string;
  op: 'insert' | 'update' | 'delete';
  values?: Row;
  filters: Array<[string, unknown]>;
}

export interface FakeState {
  tables: Record<string, Row[]>;
  writes: Write[];
  /** An error a write to this table returns, e.g. { message, hint: 'play_limit' }. */
  writeErrors: Record<string, { message: string; hint?: string } | undefined>;
  rpc: Record<string, unknown>;
}

export function fakeState(): FakeState {
  return { tables: {}, writes: [], writeErrors: {}, rpc: {} };
}

export function fakeClient(state: FakeState) {
  return {
    from(table: string) {
      const filters: Array<(r: Row) => boolean> = [];
      const recorded: Array<[string, unknown]> = [];
      let op: Write['op'] | null = null;
      let values: Row | undefined;
      let head = false;
      let orderBy: { col: string; asc: boolean } | null = null;
      let max: number | null = null;

      const rows = () => {
        let data = (state.tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
        if (orderBy) {
          const { col, asc } = orderBy;
          data = [...data].sort((a, b) => (String(a[col] ?? '') < String(b[col] ?? '') ? -1 : 1) * (asc ? 1 : -1));
        }
        if (max !== null) data = data.slice(0, max);
        return data;
      };
      const finish = () => {
        if (op) {
          state.writes.push({ table, op, values, filters: recorded });
          const error = state.writeErrors[table] ?? null;
          if (error) return { data: null, error };
          if (op === 'insert') return { data: [{ id: 'new-play-id', ...values }], error: null };
          return { data: rows(), error: null };
        }
        const data = rows();
        return { data: head ? null : data, count: data.length, error: null };
      };

      const q = {
        select(_cols?: string, opts?: { head?: boolean }) {
          if (opts?.head) head = true;
          return q;
        },
        insert(v: Row) {
          op = 'insert';
          values = v;
          return q;
        },
        update(v: Row) {
          op = 'update';
          values = v;
          return q;
        },
        delete() {
          op = 'delete';
          return q;
        },
        eq(col: string, v: unknown) {
          recorded.push([col, v]);
          filters.push((r) => r[col] === v);
          return q;
        },
        is(col: string, v: unknown) {
          recorded.push([col, v]);
          filters.push((r) => (r[col] ?? null) === v);
          return q;
        },
        in(col: string, vs: unknown[]) {
          filters.push((r) => vs.includes(r[col]));
          return q;
        },
        // Only `.not(col, 'is', null)` is used, so the operator and value are ignored
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        not(col: string, _op: string, _v: unknown) {
          filters.push((r) => r[col] !== null && r[col] !== undefined);
          return q;
        },
        order(col: string, opts?: { ascending?: boolean }) {
          orderBy = { col, asc: opts?.ascending !== false };
          return q;
        },
        limit(n: number) {
          max = n;
          return q;
        },
        async maybeSingle() {
          const res = finish();
          return { data: Array.isArray(res.data) ? (res.data[0] ?? null) : res.data, error: res.error };
        },
        async single() {
          const res = finish();
          return { data: Array.isArray(res.data) ? (res.data[0] ?? null) : res.data, error: res.error };
        },
        then(resolve: (v: unknown) => void) {
          resolve(finish());
        },
      };
      return q;
    },
    async rpc(name: string) {
      return { data: state.rpc[name] ?? null, error: null };
    },
  };
}
