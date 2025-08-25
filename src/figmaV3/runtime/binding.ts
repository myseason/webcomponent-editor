import type { BindingScope } from '../core/types';

/** safe keypath resolve: "a.b.c" */
function getByPath(obj: unknown, path: string): unknown {
  if (obj === null || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const k of parts) {
    if (cur && typeof cur === 'object' && k in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return cur;
}

const MUSTACHE_RE = /\{\{\s*([^}]+?)\s*\}\}/g;

export function getBoundProps<T extends Record<string, unknown>>(props: T, scope: BindingScope): T {
  const out: Record<string, unknown> = { ...props };
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string') {
      const s = v as string;
      if (s.includes('{{')) {
        const replaced = s.replace(MUSTACHE_RE, (_, expr: string) => {
          const [root, ...rest] = expr.trim().split('.');
          const base = root === 'data' ? scope.data : root === 'node' ? scope.node : root === 'project' ? scope.project : undefined;
          const val = rest.length ? getByPath(base as unknown, rest.join('.')) : base;
          return val == null ? '' : String(val);
        });
        out[k] = replaced;
      }
    }
  }
  return out as T;
}