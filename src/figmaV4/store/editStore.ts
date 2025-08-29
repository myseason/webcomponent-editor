/**
 * figmaV4/store/editStore.ts
 * Zustand store for v4 editor. Ops-based actions.
 */
import { create } from 'zustand';
import type { EditorState, VariantMap, StyleRule, CNodeId, Declaration, Project, StyleSheet } from '../core/types';
import { createEmptyProject } from '../core/schema';
import { baseUIStyles } from '../style/presets.stylesheet';
import { seedTokens } from '../core/tokens';

/** Operation log for undo/redo (to be completed per-op) */
type Op =
  | { t:'setDecl'; ruleId:string; kv: Declaration }
  | { t:'addRule'; sheetId:string; rule: StyleRule }
  | { t:'removeRule'; ruleId:string; sheetId:string }
  | { t:'assignClass'; nodeId:CNodeId; className:string }
  | { t:'setActiveVariant'; dim:string; value:string }
  | { t:'setEnvVar'; envName:string; key:string; value:string }
  | { t:'setActiveEnv'; envName:string }
  | { t:'setSelection'; id: CNodeId | null };

type Store = EditorState & {
  /** op logs */
  opsPast: Op[];
  opsFuture: Op[];

  /** UI actions */
  setSelection: (id: CNodeId | null) => void;
  setActiveVariant: (dim: string, value: string) => void;
  setActiveEnv: (envName: string) => void;

  /** StyleGraph actions */
  ensureRule: (selector: StyleRule['selector'], conditions: VariantMap) => string;
  findRuleId: (nodeId: CNodeId, conditions: VariantMap) => string | null;
  setDecl: (ruleId: string, kv: Declaration) => void;
  removeRule: (ruleId: string) => void;
  assignClass: (nodeId: CNodeId, className: string) => void;

  /** Env/DataSource actions */
  setEnvVar: (envName: string, key: string, value: string) => void;
  upsertDataSource: (envName: string, ds: any) => void;

  /** Inspector helpers */
  getEffectiveDecl: (nodeId: CNodeId) => Declaration;
  getCascadeForNode: (nodeId: CNodeId) => { base: Declaration; tablet: Declaration; mobile: Declaration; current: Declaration };

  /** Undo/Redo */
  undo: () => void;
  redo: () => void;
};

function initProject(): Project {
  const p = createEmptyProject();
  p.stylesheets = [baseUIStyles];
  p.tokens = seedTokens;
  return p;
}

function shallowMerge(a: any, b: any) { return { ...(a || {}), ...(b || {}) }; }

function conditionsEqual(a: VariantMap, b: VariantMap) {
  return JSON.stringify(a || {}) === JSON.stringify(b || {});
}

export const useV4Store = create<Store>((set, get) => ({
  project: initProject(),
  ui: {
    canvas: { width: 1200, height: 800, zoom: 1, orientation: 'landscape' },
    variants: { screen: 'base', theme: 'light' },
    selection: null,
    activeEnv: 'dev',
  },
  opsPast: [],
  opsFuture: [],

  /** UI actions */
  setSelection: (id) => {
    const state = get();
    set({ ui: { ...state.ui, selection: id }, opsPast: [...state.opsPast, { t:'setSelection', id }], opsFuture: [] });
  },

  setActiveVariant: (dim, value) => {
    const state = get();
    set({
      ui: { ...state.ui, variants: { ...state.ui.variants, [dim]: value } },
      opsPast: [...state.opsPast, { t:'setActiveVariant', dim, value }],
      opsFuture: [],
    });
  },

  setActiveEnv: (envName) => {
    const state = get();
    if (!state.project.environments || !state.project.environments[envName]) return;
    set({ ui: { ...state.ui, activeEnv: envName }, opsPast: [...state.opsPast, { t:'setActiveEnv', envName }], opsFuture: [] });
  },

  /** StyleGraph actions */
  ensureRule: (selector, conditions) => {
    const state = get();
    const sheets = state.project.stylesheets || [];
    let sheet: StyleSheet | null = sheets[0] || null;
    if (!sheet) {
      sheet = { id:'sheet-0', name:'Default', rules: [] };
      state.project.stylesheets = [sheet];
    }
    const found = sheet.rules.find(r => JSON.stringify(r.selector) === JSON.stringify(selector) && conditionsEqual(r.conditions, conditions));
    if (found) return found.id;
    const rule: StyleRule = {
      id: `rule_${Math.random().toString(36).slice(2,9)}`,
      selector,
      conditions,
      declarations: {},
    };
    sheet.rules = [...sheet.rules, rule];
    set({
      project: { ...state.project, stylesheets: [...state.project.stylesheets] },
      opsPast: [...state.opsPast, { t:'addRule', sheetId: sheet.id, rule }],
      opsFuture: [],
    });
    return rule.id;
  },

  findRuleId: (nodeId, conditions) => {
    const state = get();
    const sheets = state.project.stylesheets || [];
    for (const s of sheets) {
      const rule = s.rules.find(r => r.selector.by === 'node' && r.selector.ref === nodeId && conditionsEqual(r.conditions, conditions));
      if (rule) return rule.id;
    }
    return null;
  },

  setDecl: (ruleId, kv) => {
    const state = get();
    const sheets = state.project.stylesheets || [];
    for (const s of sheets) {
      const idx = s.rules.findIndex(r => r.id === ruleId);
      if (idx >= 0) {
        const r = s.rules[idx];
        const nextRule: StyleRule = { ...r, declarations: shallowMerge(r.declarations, kv) };
        s.rules = [...s.rules.slice(0, idx), nextRule, ...s.rules.slice(idx+1)];
        set({
          project: { ...state.project, stylesheets: [...sheets] },
          opsPast: [...state.opsPast, { t:'setDecl', ruleId, kv }],
          opsFuture: [],
        });
        return;
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

  /** Env/DataSource */
  setEnvVar: (envName, key, value) => {
    const state = get();
    const envs = state.project.environments || {};
    const env = envs[envName];
    if (!env) return;
    envs[envName] = { ...env, variables: { ...env.variables, [key]: value } };
    set({ project: { ...state.project, environments: { ...envs } }, opsPast: [...state.opsPast, { t:'setEnvVar', envName, key, value }], opsFuture: [] });
  },

  upsertDataSource: (envName, ds) => {
    const state = get();
    const envs = state.project.environments || {};
    const env = envs[envName];
    if (!env) return;
    const arr = [...(env.dataSources || [])];
    const idx = arr.findIndex((x:any) => x.id === ds.id);
    if (idx >= 0) arr[idx] = ds; else arr.push(ds);
    envs[envName] = { ...env, dataSources: arr };
    set({ project: { ...state.project, environments: { ...envs } } });
  },

  /** Inspector helpers */
  getEffectiveDecl: (nodeId) => {
    const state = get();
    const v = state.ui.variants || {};
    const sheets = state.project.stylesheets || [];
    let out: Declaration = {};
    const compId = state.project.nodes[nodeId]?.componentId;
    for (const s of sheets) {
      for (const r of s.rules) {
        // component-level base
        const isComp = r.selector.by === 'component' && r.selector.ref === compId;
        const isNode = r.selector.by === 'node' && r.selector.ref === nodeId;
        if (!isComp && !isNode) continue;
        const themeOk = !r.conditions.theme || r.conditions.theme === v.theme;
        const stateOk = !r.conditions.state || r.conditions.state === v.state;
        if (!themeOk || !stateOk) continue;
        const screen = r.conditions.screen;
        if (!screen) {
          out = shallowMerge(out, r.declarations);
        } else if (screen === v.screen) {
          out = shallowMerge(out, r.declarations);
        }
      }
    }
    return out;
  },

  getCascadeForNode: (nodeId) => {
    const state = get();
    const sheets = state.project.stylesheets || [];
    let base: Declaration = {};
    let tablet: Declaration = {};
    let mobile: Declaration = {};
    const compId = state.project.nodes[nodeId]?.componentId;
    for (const s of sheets) {
      for (const r of s.rules) {
        const isComp = r.selector.by === 'component' && r.selector.ref === compId;
        const isNode = r.selector.by === 'node' && r.selector.ref === nodeId;
        if (!isComp && !isNode) continue;
        const screen = r.conditions.screen;
        if (!screen) base = shallowMerge(base, r.declarations);
        if (screen === 'tablet') tablet = shallowMerge(tablet, r.declarations);
        if (screen === 'mobile') mobile = shallowMerge(mobile, r.declarations);
      }
    }
    const current = get().getEffectiveDecl(nodeId);
    return { base, tablet, mobile, current };
  },

  
  /** Undo/Redo — basic inversion for style ops */
  undo: () => {
    const state = get();
    const past = [...state.opsPast];
    if (!past.length) return;
    const op = past.pop()!;
    // apply inverse
    if (op.t === 'setDecl') {
      // cannot reconstruct previous values without a history of before; noop for now
      console.warn('undo setDecl not reversible without before-value log');
    } else if (op.t === 'addRule') {
      // remove that rule
      const sheets = state.project.stylesheets || [];
      for (const s of sheets) {
        const before = s.rules.length;
        s.rules = s.rules.filter(r => r.id !== op.rule.id);
        if (s.rules.length !== before) break;
      }
      set({ project: { ...state.project, stylesheets: [...(state.project.stylesheets||[])] }, opsPast: past, opsFuture: [op, ...state.opsFuture] });
      return;
    } else if (op.t === 'removeRule') {
      // cannot restore without the rule payload; noop
      console.warn('undo removeRule not possible without saved rule payload');
    } else if (op.t === 'assignClass') {
      const n = state.project.nodes[op.nodeId];
      if (n?.classList) {
        state.project.nodes[op.nodeId] = { ...n, classList: n.classList.filter(c => c !== op.className) };
        set({ project: { ...state.project }, opsPast: past, opsFuture: [op, ...state.opsFuture] });
        return;
      }
    } else if (op.t === 'setActiveVariant' || op.t === 'setActiveEnv' || op.t === 'setSelection' || op.t === 'setEnvVar') {
      // UI/env ops skip for now
      console.warn('undo for this op is not implemented');
    }
    // default move op to future
    set({ opsPast: past, opsFuture: [op, ...state.opsFuture] });
  },
  redo: () => {
    const state = get();
    const fut = [...state.opsFuture];
    if (!fut.length) return;
    const op = fut.shift()!;
    // reapply op (limited)
    if (op.t === 'addRule') {
      const sheets = state.project.stylesheets || [];
      const sheet = sheets.find(s => s.id === op.sheetId) || sheets[0];
      if (sheet) sheet.rules = [...sheet.rules, op.rule];
      set({ project: { ...state.project, stylesheets: [...(state.project.stylesheets||[])] }, opsPast: [...state.opsPast, op], opsFuture: fut });
      return;
    } else if (op.t === 'assignClass') {
      const n = state.project.nodes[op.nodeId];
      if (n) {
        const setCls = new Set([...(n.classList || [])]); setCls.add(op.className);
        state.project.nodes[op.nodeId] = { ...n, classList: Array.from(setCls) };
        set({ project: { ...state.project }, opsPast: [...state.opsPast, op], opsFuture: fut });
        return;
      }
    }
    set({ opsPast: [...state.opsPast, op], opsFuture: fut });
  },

}));
