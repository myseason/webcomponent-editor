import type { EditorState, Node, StylePolicy } from '../../core/types';
import { getDefinition } from '../../core/registry';
import { GLOBAL_STYLE_POLICY } from '../../policy/globalStylePolicy';
import { deepMerge } from '../../runtime/deepMerge';

/** 태그 선택 */
function pickTag(s: EditorState, n: Node): string {
    const tagFromNode = (n.props as any)?.__tag ?? getDefinition(n.componentId)?.capabilities?.defaultTag ?? 'div';
    return String(tagFromNode || 'div');
}

/** 키 정규화 (: → .) */
function normalizeControlPath(path: string): string {
    return path.replace(/:/g, '.');
}

export const StylePolicyService = {
    /** 태그 그룹 seed 생성 (TagPolicy → 그룹이 존재하면 기본 visible=true) */
    makeTagGroupSeed(tagPolicy: any): Partial<StylePolicy> {
        const groups = tagPolicy?.styles?.groups ?? {};
        const seed: Partial<StylePolicy> = {};
        for (const g of Object.keys(groups)) {
            (seed as any)[g] = { visible: true, controls: {} };
            for (const k of groups[g] ?? []) {
                (seed as any)[g].controls[k] = { visible: true };
            }
        }
        return seed;
    },

    /** 유효 정책 계산 */
    computeEffectivePolicy(state: EditorState, node: Node): StylePolicy {
        const ui = state.ui;
        const tag = pickTag(state, node);
        const tagPolicy = (state.project.tagPolicies as any)?.[tag] ?? {};

        // 전역 + 태그 그룹 seed
        const base = deepMerge(GLOBAL_STYLE_POLICY, this.makeTagGroupSeed(tagPolicy));

        if (ui.expertMode) return base;

        // Page 모드면 ComponentPolicy inspector 오버레이 적용
        if (ui.mode === 'Page') {
            const cp = (state.project.policies as any)?.components?.[node.componentId];
            if (cp?.inspector) {
                // flat controls 맵 → 그룹별로 역전개
                let overlay: any = { ...cp.inspector };
                if (cp.inspector.controls) {
                    overlay = { ...overlay };
                    for (const [flatKey, ctl] of Object.entries(cp.inspector.controls)) {
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

    /** 그룹 가시성 */
    getGroupVisibility(eff: StylePolicy, groupName: keyof StylePolicy): boolean {
        const group = (eff as any)[groupName];
        if (!group || group.visible === false) return false;
        if (!group.controls) return false;
        for (const key in group.controls) {
            if (this.getControlVisibility(eff, `${String(groupName)}.${key}`)) return true;
        }
        return false;
    },

    /** 컨트롤 가시성 */
    getControlVisibility(eff: StylePolicy, controlPath: string): boolean {
        const normalized = normalizeControlPath(controlPath);
        const [groupName, controlName] = normalized.split('.') as [keyof StylePolicy, string];
        if (!groupName || !controlName) return false;

        const group = (eff as any)[groupName];
        if (!group || group.visible === false) return false;

        const ctl = group.controls?.[controlName];
        return ctl?.visible !== false; // undefined → 보임
    },
};