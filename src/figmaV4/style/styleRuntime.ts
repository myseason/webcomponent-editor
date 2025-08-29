/**
 * figmaV4/style/styleRuntime.ts
 * CSS compilation + ShadowRoot injection with caching.
 */

import type { StyleSheet, VariantMap, Token } from '../core/types';
import { compileSheetsToCSS, tokensToCSSVars } from './styleGraph';

function hash(input: string): string {
  let h = 0, i = 0, len = input.length;
  while (i < len) { h = (h << 5) - h + input.charCodeAt(i++) | 0; }
  return Math.abs(h).toString(36);
}

export function compileToCSS(sheets: StyleSheet[], active: VariantMap, tokens: Token[] = []): string {
  const cssVars = tokensToCSSVars(tokens);
  const rules = compileSheetsToCSS(sheets, active);
  return cssVars + '\n' + rules;
}

export function injectCSS(shadowRoot: ShadowRoot, css: string, scopeId = 'v4-style'): void {
  const styleId = `style-${scopeId}`;
  let styleEl = shadowRoot.getElementById(styleId) as HTMLStyleElement | null;
  const h = hash(css);
  if (styleEl && styleEl.dataset.hash === h) return;

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    shadowRoot.appendChild(styleEl);
  }
  styleEl.textContent = css;
  styleEl.dataset.hash = h;
}
