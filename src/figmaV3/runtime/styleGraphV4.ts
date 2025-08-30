import type { CSSDict, NodeId, Viewport } from '../core/types';
import { normalizeStylePatch } from './styleUtils';

/** Variant conditions (screen only for now) */
export type VariantMap = { screen?: Viewport; theme?: string; state?: string };

/** CSS-like declarations (reusing V3 CSSDict) */
export type Declaration = CSSDict;

/** Selectors (node only for this step) */
export type Selector =
  | { by: 'node'; ref: NodeId }
  | { by: 'class'; ref: string }
  | { by: 'component'; ref: string };

/** One style rule */
export type StyleRule = {
  id: string;
  selector: Selector;
  conditions: VariantMap;
  declarations: Declaration;
};

/** A style sheet */
export type StyleSheet = { id: string; name: string; rules: StyleRule[] };

/** The StyleGraph */
export type StyleGraph = { sheets: StyleSheet[]; tokens: Record<string, unknown>[] };

export function ensureDefaultSheet(g: StyleGraph): StyleSheet {
  if (!g.sheets.length) g.sheets.push({ id: 'sheet-0', name: 'Default', rules: [] });
  return g.sheets[0];
}

export function ruleKeyFor(nodeId: NodeId, viewport: Viewport): string {
  return `r_${nodeId}_${viewport ?? 'base'}`;
}

export function upsertNodeRule(g: StyleGraph, nodeId: NodeId, viewport: Viewport, patch: CSSDict): StyleRule {
  const sheet = ensureDefaultSheet(g);
  const id = ruleKeyFor(nodeId, viewport);
  let rule = sheet.rules.find(r => r.selector.by === 'node' && r.selector.ref === nodeId && (r.conditions.screen ?? 'base') === (viewport ?? 'base'));
  if (!rule) {
    rule = { id, selector: { by: 'node', ref: nodeId }, conditions: { screen: viewport }, declarations: {} };
    sheet.rules = [...sheet.rules, rule];
  }
  const prev = rule.declarations || {};
  const next = { ...prev, ...normalizeStylePatch(patch) };
  rule.declarations = next;
  return rule;
}

/** base → specific screen */
export function effectiveDeclForNode(g: StyleGraph, nodeId: NodeId, viewport: Viewport): Declaration {
  const out: Declaration = {};
  const sheet = ensureDefaultSheet(g);
  for (const r of sheet.rules) {
    if (r.selector.by === 'node' && r.selector.ref === nodeId && !r.conditions.screen) {
      Object.assign(out, r.declarations);
    }
  }
  for (const r of sheet.rules) {
    if (r.selector.by === 'node' && r.selector.ref === nodeId && r.conditions.screen === viewport) {
      Object.assign(out, r.declarations);
    }
  }
  return out;
}
