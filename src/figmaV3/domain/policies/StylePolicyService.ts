import type { EditorStoreState } from '../../store/types';
import type { Node, StylePolicy, ComponentPolicy } from '../../core/types';
import { getDefinition } from '../../core/registry';
import { GLOBAL_STYLE_POLICY } from '../../policy/globalStylePolicy';
import { GLOBAL_TAG_POLICIES } from '../../policy/globalTagPolicy';
import { deepMerge } from '../../runtime/deepMerge';

/**
 * 정책 병합/가시성 계산을 담당하는 서비스 (레이아웃 비침투)
 * - 레이아웃/렌더러는 건드리지 않고, "보여줄지 말지"만 결정합니다.
 */
type PolicyGroup = {
    visible?: boolean;
    controls?: Record<string, { visible?: boolean }>;
};

function pickTag(s: EditorStoreState, n: Node): string {
    // 우선순위: 노드의 __tag → 컴포넌트 정의의 defaultTag → 'div'
    const tagFromNode =
        (n.props as any)?.__tag ??
        getDefinition(n.componentId)?.capabilities?.defaultTag ??
        'div';
    return String(tagFromNode || 'div');
}

function getComponentPolicy(
    s: EditorStoreState,
    componentId: string | undefined
): ComponentPolicy | undefined {
    if (!componentId) return undefined;
    // 프로젝트 설정 내 오버라이드에서 컴포넌트별 정책을 찾습니다.
    // core/types.ts 상에서 project.policies?.components가 Partial<Record<string, ComponentPolicy>>로 정의되어 있음
    const p = s.project?.policies as any;
    const map = p?.components as Record<string, ComponentPolicy> | undefined;
    return map?.[componentId];
}

function normalizeControlPath(path: string): string {
    // 현 레포에는 콜론/점 표기가 혼재. 저장/조회 모두 호환하기 위해 점 표기로 통일 조회 + 콜론도 fallback
    // ex) "styles.layout.display" | "styles:layout.display" | "styles:layout:display"
    return path.replace(/:/g, '.');
}

export const StylePolicyService = {
    /**
     * 전역 StylePolicy (정적)
     */
    getStylePolicy(_s: EditorStoreState): StylePolicy {
        return GLOBAL_STYLE_POLICY;
    },

    /**
     * 노드 기준 최종(Effective) 정책 계산
     * - ExpertMode: ComponentPolicy 무시 (Style + Tag만)
     * - Page 모드: Style + Tag + Component(inspector) 병합
     * - Component 모드: Style + Tag만
     */
    computeEffectivePolicy(s: EditorStoreState, node: Node): StylePolicy {
        const ui = s.ui;
        const tag = pickTag(s, node);
        const tagPolicy = (GLOBAL_TAG_POLICIES as any)?.[tag] ?? {};

        // 기본: 전역 + 태그 정책
        const basePolicy = deepMerge(GLOBAL_STYLE_POLICY, tagPolicy);

        // 고급 모드면 ComponentPolicy 무시
        if (ui.expertMode) return basePolicy;

        if (ui.mode === 'Page') {
            const cp = getComponentPolicy(s, node.componentId);
            if (cp?.inspector) {
                // inspector 스코프만 병합 (가시성 제어 목적)
                return deepMerge(basePolicy, cp.inspector);
            }
        }
        // Component 모드: base만
        return basePolicy;
    },

    /**
     * 그룹 가시성 판단
     */
    getGroupVisibility(effective: StylePolicy, groupName: keyof StylePolicy): boolean {
        const group = (effective as any)[groupName] as PolicyGroup | undefined;
        if (!group || group.visible === false) return false;

        // 컨트롤이 없으면 숨김 처리
        if (!group.controls) return false;

        // 하위 컨트롤 중 1개라도 보이면 그룹 보임
        for (const key in group.controls) {
            if (this.getControlVisibility(effective, `${String(groupName)}.${key}`)) {
                return true;
            }
        }
        return false;
    },

    /**
     * 컨트롤별 가시성 판단
     * @param controlPath ex) "layout.display" / "typography.fontSize"
     */
    getControlVisibility(effective: StylePolicy, controlPath: string): boolean {
        const normalized = normalizeControlPath(controlPath);
        const [groupName, controlName] = normalized.split('.') as [keyof StylePolicy, string];
        if (!groupName || !controlName) return false;

        const group = (effective as any)[groupName] as PolicyGroup | undefined;
        if (!group || group.visible === false) return false;

        const control = group.controls?.[controlName];
        return control?.visible !== false;
    },

    // ===== 아래는 기존 유틸(색/폰트/프리셋 등) 유지 =====

    /** 색상 팔레트 */
    getColorPalette(s: EditorStoreState) {
        const p = this.getStylePolicy(s) as any;
        return p?.colors?.palette ?? [];
    },

    /** 폰트 패밀리 */
    getFontFamilies(s: EditorStoreState) {
        const p = this.getStylePolicy(s) as any;
        return p?.typography?.fontFamilies ?? [];
    },

    /** 그림자 프리셋 */
    getShadowPresets(s: EditorStoreState) {
        const p = this.getStylePolicy(s) as any;
        return p?.shadows?.presets ?? [];
    },

    /** 필터 프리셋 */
    getFilterPresets(s: EditorStoreState) {
        const p = this.getStylePolicy(s) as any;
        return p?.filters?.presets ?? [];
    },

    /** 그라디언트 정책 (예: maxStops 등) */
    getGradientPolicy(s: EditorStoreState) {
        const p = this.getStylePolicy(s) as any;
        return p?.gradients ?? {};
    },
};