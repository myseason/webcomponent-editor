import type { CSSDict, NodeId, Viewport } from '../core/types';
import { normalizeStylePatch } from './styleUtils';

/** Variant conditions (screen/theme/state) */
export type VariantMap = { screen?: Viewport; theme?: string; state?: string };
export type Declaration = CSSDict;
export type Selector =
    | { by: 'node'; ref: NodeId }
    | { by: 'class'; ref: string }
    | { by: 'component'; ref: string };

export type StyleRule = {
    id: string;
    selector: Selector;
    conditions: VariantMap;
    declarations: Declaration;
};

export type StyleSheet = { id: string; name: string; rules: StyleRule[] };
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
    let rule = sheet.rules.find(r =>
        r.selector.by === 'node' && r.selector.ref === nodeId &&
        (r.conditions.screen ?? 'base') === (viewport ?? 'base')
    );
    if (!rule) {
        rule = { id, selector: { by: 'node', ref: nodeId }, conditions: { screen: viewport }, declarations: {} };
        sheet.rules = [...sheet.rules, rule];
    }
    const prev = rule.declarations || {};
    const next = { ...prev, ...normalizeStylePatch(patch) };
    rule.declarations = next;
    return rule;
}

export function getRuleDecl(g: StyleGraph, nodeId: NodeId, viewport: Viewport): Declaration {
    const sheet = ensureDefaultSheet(g);
    let out: Declaration = {};
    for (const r of sheet.rules) {
        if (r.selector.by === 'node' && r.selector.ref === nodeId && (r.conditions.screen ?? 'base') === (viewport ?? 'base')) {
            out = { ...out, ...r.declarations };
        }
    }
    return out;
}

export function rulesByScreen(g: StyleGraph, nodeId: NodeId): Record<string, Declaration> {
    const out: Record<string, Declaration> = {};
    const sheet = ensureDefaultSheet(g);
    for (const r of sheet.rules) {
        if (r.selector.by === 'node' && r.selector.ref === nodeId) {
            const key = (r.conditions.screen ?? 'base') as string;
            out[key] = { ...(out[key] ?? {}), ...r.declarations };
        }
    }
    return out;
}

/** Default cascade: base -> current */
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