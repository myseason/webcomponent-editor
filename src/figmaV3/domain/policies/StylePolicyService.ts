import type { EditorState, Node, StylePolicy } from '../../core/types';
import { GLOBAL_STYLE_POLICY } from '../../policy/globalStylePolicy';
import { getDefinition } from '../../core/registry';
import { deepMerge } from '../../runtime/deepMerge';

/** 태그 선택 (노드 → props.__tag → def.defaultTag → 'div') */
function resolveTag(state: EditorState, node: Node): string {
    const byNode = (node.props as any)?.__tag;
    if (byNode) return String(byNode);
    const def = getDefinition(node.componentId);
    return String(def?.capabilities?.defaultTag ?? 'div');
}

/** 키 정규화: "styles:layout.display" | "styles.layout.display" → "layout.display" */
function normalizeControlPath(path: string): string {
    let s = path.replace(/:/g, '.');
    if (s.startsWith('styles.')) s = s.slice('styles.'.length);
    return s;
}

/** TagPolicy → 그룹 시드(visible=true) 생성 */
function makeTagGroupSeed(tagPolicy: any): Partial<StylePolicy> {
    const groups: Record<string, string[]> = tagPolicy?.styles?.groups ?? {};
    const seed: Partial<StylePolicy> = {};
    for (const g of Object.keys(groups)) {
        (seed as any)[g] = { visible: true, controls: {} };
        for (const k of groups[g] ?? []) {
            (seed as any)[g].controls[k] = { visible: true };
        }
    }
    return seed;
}

export const StylePolicyService = {
    /**
     * 유효 정책 계산
     * - Global + TagGroupSeed (+ Component inspector overlay in Page mode unless expert)
     */
    computeEffectivePolicy(state: EditorState, node: Node): StylePolicy {
        const ui = state.ui;
        const tagName = resolveTag(state, node);
        const tagPolicy = (state.project.tagPolicies as any)?.[tagName] ?? {};

        // 1) Global + TagGroupSeed
        const base = deepMerge(GLOBAL_STYLE_POLICY, makeTagGroupSeed(tagPolicy));

        // 2) Expert 모드면 컴포넌트 오버레이 무시
        if (ui.expertMode)
            return base;

        // 3) Page 모드일 때만 컴포넌트 오버레이 적용
        if (ui.mode === 'Page') {
            const cp = (state.project.policies as any)?.components?.[node.componentId];
            const insp = cp?.inspector;
            if (insp) {
                // flat controls → 그룹 오버레이로 역전개
                let overlay: any = { ...insp };
                if (insp.controls) {
                    overlay = { ...overlay };
                    for (const [flatKey, ctl] of Object.entries(insp.controls)) {
                        const nk = normalizeControlPath(flatKey);
                        const [g, c] = nk.split('.');
                        if (!g || !c) continue;
                        overlay[g] = overlay[g] ?? { controls: {} };
                        overlay[g].controls = overlay[g].controls ?? {};
                        overlay[g].controls[c] = { ...(overlay[g].controls[c] ?? {}), ctl };
                    }
                }
                return deepMerge(base, overlay);
            }
        }

        return base;
    },

    /** 그룹 가시성: 그룹이 숨김이면 false, 컨트롤 중 하나라도 보이면 true */
    getGroupVisibility(eff: StylePolicy, groupName: string): boolean {
        const group: any = (eff as any)[groupName];
        if (!group || group.visible === false) return false;
        const ctlMap = group.controls ?? {};
        for (const key of Object.keys(ctlMap)) {
            if (this.getControlVisibility(eff, `${groupName}.${key}`)) return true;
        }
        return false;
    },

    /** 컨트롤 가시성: undefined는 보임, false만 숨김 */
    getControlVisibility(eff: StylePolicy, controlPath: string): boolean {
        const nk = normalizeControlPath(controlPath);
        const [g, c] = nk.split('.');
        if (!g || !c)
            return false;

        const group: any = (eff as any)[g];
        if (!group || group.visible === false)
            return false;

        const ctl = group.controls?.[c];

        return ctl?.visible !== false;
    },
};