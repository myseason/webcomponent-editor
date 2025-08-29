/**
 * figmaV4/store/editStore.ts
 * Zustand store for v4 editor. Ops-based actions (scaffold).
 */
import { create } from 'zustand';
import type { EditorState, VariantMap, StyleRule, StyleSheet, CNodeId, Declaration, Project } from '../core/types';
import { createEmptyProject } from '../core/schema';
import { baseUIStyles } from '../style/presets.stylesheet';
import { seedTokens } from '../core/tokens';

type Op =
  | { t:'setDecl'; ruleId:string; kv: Declaration }
  | { t:'addRule'; sheetId:string; rule: StyleRule }
  | { t:'removeRule'; ruleId:string; sheetId:string }
  | { t:'assignClass'; nodeId:CNodeId; className:string };

type Store = EditorState & {
  opsPast: Op[];
  opsFuture: Op[];

  setActiveVariant: (dim: string, value: string) => void;
  ensureRule: (selector: StyleRule['selector'], conditions: VariantMap) => string;
  setDecl: (ruleId: string, kv: Declaration) => void;
  removeRule: (ruleId: string) => void;
  assignClass: (nodeId: CNodeId, className: string) => void;

  undo: () => void;
  redo: () => void;
};

function initProject(): Project {
  const p = createEmptyProject();
  p.stylesheets = [baseUIStyles];
  p.tokens = seedTokens;
  return p;
}

export const useV4Store = create<Store>((set, get) => ({
  project: initProject(),
  ui: {
    canvas: { width: 1200, height: 800, zoom: 1, orientation: 'landscape' },
    variants: { screen: 'base', theme: 'light' },
    selection: null,
  },
  opsPast: [],
  opsFuture: [],

  setActiveVariant: (dim, value) => {
    const state = get();
    set({ ui: { ...state.ui, variants: { ...state.ui.variants, [dim]: value } } });
  },

  ensureRule: (selector, conditions) => {
    const state = get();
    const sheets = state.project.stylesheets || [];
    const sheet = sheets[0] || { id:'sheet-0', name:'Default', rules: [] as StyleRule[] };
    if (!sheets.length) {
      state.project.stylesheets = [sheet];
    }
    // find
    const found = sheet.rules.find(r =>
      JSON.stringify(r.selector) === JSON.stringify(selector) &&
      JSON.stringify(r.conditions) === JSON.stringify(conditions)
    );
    if (found) return found.id;
    const rule: StyleRule = {
      id: `rule_${Math.random().toString(36).slice(2,9)}`,
      selector,
      conditions,
      declarations: {},
    };
    sheet.rules = [...sheet.rules, rule];
    set({ project: { ...state.project, stylesheets: [...state.project.stylesheets] }, opsPast: [...state.opsPast, { t:'addRule', sheetId: sheet.id, rule }], opsFuture: [] });
    return rule.id;
  },

  setDecl: (ruleId, kv) => {
    const state = get();
    const sheets = state.project.stylesheets || [];
    outer: for (const s of sheets) {
      const idx = s.rules.findIndex(r => r.id === ruleId);
      if (idx >= 0) {
        const r = s.rules[idx];
        const nextDecl = { ...r.declarations, ...kv };
        const nextRule = { ...r, declarations: nextDecl };
        s.rules = [...s.rules.slice(0, idx), nextRule, ...s.rules.slice(idx+1)];
        set({
          project: { ...state.project, stylesheets: [...sheets] },
          opsPast: [...state.opsPast, { t:'setDecl', ruleId, kv }],
          opsFuture: [],
        });
        break outer;
      }
    }
  },

  removeRule: (ruleId) => {
    const state = get();
    const sheets = state.project.stylesheets || [];
    for (const s of sheets) {
      const before = s.rules.length;
      s.rules = s.rules.filter(r => r.id !== ruleId);
      if (s.rules.length !== before) {
        set({
          project: { ...state.project, stylesheets: [...sheets] },
          opsPast: [...state.opsPast, { t:'removeRule', ruleId, sheetId: s.id }],
          opsFuture: [],
        });
        return;
      }
    }
  },

  assignClass: (nodeId, className) => {
    const state = get();
    const n = state.project.nodes[nodeId];
    if (!n) return;
    const setCls = new Set([...(n.classList || [])]);
    setCls.add(className);
    state.project.nodes[nodeId] = { ...n, classList: Array.from(setCls) };
    set({ project: { ...state.project }, opsPast: [...state.opsPast, { t:'assignClass', nodeId, className }], opsFuture: [] });
  },

  undo: () => {
    // NOTE: op-based undo scaffolding (implement per-op inversion as needed)
    // For Phase 0, leave as no-op to avoid breaking UX.
    console.warn('undo() not implemented yet (Phase 0 scaffold)');
  },
  redo: () => {
    console.warn('redo() not implemented yet (Phase 0 scaffold)');
  },
}));
