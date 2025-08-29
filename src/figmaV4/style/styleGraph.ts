/**
 * figmaV4/style/styleGraph.ts
 * Helpers for StyleGraph: breakpoints, selector building, declarations.
 */
import type { Declaration, DeclarationValue, Selector, StyleRule, Token, VariantMap } from '../core/types';

export const SCREEN_BREAKPOINTS: Record<string, string> = {
  mobile: '(max-width: 640px)',
  tablet: '(min-width: 641px) and (max-width: 1024px)',
  // base: no media (default)
};

export function selectorToCSS(sel: Selector): string {
  switch (sel.by) {
    case 'node': return `[data-cnode-id="${sel.ref}"]`;
    case 'component': return `[data-component-id="${sel.ref}"]`;
    case 'class': return `.c-${sel.ref}`;
    default: return '';
  }
}

export function tokenToVarName(tokenId: string): string {
  return '--' + tokenId.replace(/\./g, '-');
}

export function valueToCSS(value: DeclarationValue): string {
  if (typeof value === 'number') return `${value}px`;
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'token' in value) {
    return `var(${tokenToVarName(value.token)})`;
  }
  return '';
}

type CSSPair = [prop: string, val: string];

function compositeFont(tokenVarBase: string): CSSPair[] {
  return [
    ['font-family', `var(${tokenVarBase}-family)`],
    ['font-size', `var(${tokenVarBase}-size)`],
    ['line-height', `var(${tokenVarBase}-line)`],
    ['font-weight', `var(${tokenVarBase}-weight)`],
  ];
}

export function declarationToCSSPairs(decl: Declaration): CSSPair[] {
  const out: CSSPair[] = [];
  for (const k in decl) {
    const v = decl[k];
    if (k === 'paddingX') {
      out.push(['padding-left', valueToCSS(v)], ['padding-right', valueToCSS(v)]);
    } else if (k === 'paddingY') {
      out.push(['padding-top', valueToCSS(v)], ['padding-bottom', valueToCSS(v)]);
    } else if (k === 'bg') {
      out.push(['background-color', valueToCSS(v)]);
    } else if (k === 'radius') {
      out.push(['border-radius', valueToCSS(v)]);
    } else if (k === 'shadow') {
      out.push(['box-shadow', valueToCSS(v)]);
    } else if (k === 'borderColor') {
      out.push(['border-color', valueToCSS(v)]);
    } else if (k === 'borderWidth') {
      out.push(['border-width', valueToCSS(v)]);
      out.push(['border-style', 'solid']);
    } else if (k === 'font') {
      // v is token ref expected
      if (v && typeof v === 'object' && 'token' in v) {
        const base = tokenToVarName(v.token);
        out.push(...compositeFont(base));
      }
    } else {
      // direct mapping
      out.push([k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()), valueToCSS(v)]);
    }
  }
  return out;
}

export function ruleToCSS(rule: StyleRule, theme?: string, state?: string): string {
  let sel = selectorToCSS(rule.selector);
  const parts: string[] = [];

  // theme as host attribute
  if (rule.conditions.theme) {
    parts.push(`:host([data-theme="${rule.conditions.theme}"]) ${sel}`);
  } else if (theme) {
    // allow active theme scoping to shrink collisions
    parts.push(`:host([data-theme="${theme}"]) ${sel}`);
  } else {
    parts.push(sel);
  }

  // state handling:
  // - If rule defines a state (e.g., hover), we match it.
  // - For preview, we scope by host attribute: :host([data-state~="hover"]) sel{...}
  if (rule.conditions.state) {
    // element-level state selector (authoring-time explicit)
    parts[parts.length-1] += `[data-state~="${rule.conditions.state}"]`;
    if (state && rule.conditions.state === state) {
      // also allow host-scoped preview without element attrs
      parts[parts.length-1] = `:host([data-state~=\"${state}\"]) ${sel}`;
    }
  } else if (state) {
    // no-op for rules without state; keep them unaffected by preview
  }

  const declPairs = declarationToCSSPairs(rule.declarations);
  const declBody = declPairs.map(([p,v]) => `${p}:${v};`).join('');
  const body = `${parts.join(',')}{${declBody}}`;

  // screen as media
  const screen = rule.conditions.screen;
  if (screen && SCREEN_BREAKPOINTS[screen]) {
    return `@media ${SCREEN_BREAKPOINTS[screen]}{${body}}`;
  }
  return body;
}

export function compileSheetsToCSS(
  sheets: { id:string; rules: StyleRule[] }[],
  active: VariantMap
): string {
  const theme = active.theme;
  const state = active.state;
  const parts: string[] = [];
  for (const s of sheets) {
    for (const r of s.rules) {
      parts.push(ruleToCSS(r, theme, state));
    }
  }
  return parts.join('\n');
}

export function tokensToCSSVars(tokens: Token[]): string {
  const lines: string[] = [];
  for (const t of tokens) {
    const cssName = '--' + t.id.replace(/\./g, '-');
    if (t.type === 'color' || t.type === 'shadow') {
      lines.push(`${cssName}:${t.value};`);
    } else if (t.type === 'space' || t.type === 'radius' || t.type === 'size') {
      lines.push(`${cssName}:${t.value}px;`);
    } else if (t.type === 'font') {
      lines.push(`${cssName}-family:${t.value.family};`);
      lines.push(`${cssName}-size:${t.value.size}px;`);
      lines.push(`${cssName}-line:${t.value.lineHeight};`);
      lines.push(`${cssName}-weight:${t.value.weight};`);
    }
  }
  return `:host{${lines.join('')}}`;
}
