import type { EditorStoreState } from '../../store/types';
import { GLOBAL_STYLE_POLICY } from '../../policy/globalStylePolicy';

// 기준 소스에 타입 export가 없으므로, 실제 상수에서 타입을 추론합니다.
type StylePolicy = typeof GLOBAL_STYLE_POLICY;

export const StylePolicyService = {
    /** 전체 정책(읽기 전용) */
    getStylePolicy(_s: EditorStoreState): StylePolicy {
        // 현 구조상 정책은 정적 상수로 제공됨 (스토어 의존 없음)
        return GLOBAL_STYLE_POLICY;
    },

    /** 색상 팔레트 */
    getColorPalette(s: EditorStoreState) {
        const p = this.getStylePolicy(s) as any;
        // colors.palette가 없을 수도 있으니 안전하게 폴백
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
        // 예: p.shadows?.presets: {label,value}[] 형태 가정, 없으면 []
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
        // 정책이 없을 수도 있으므로 안전 폴백
        return p?.gradients ?? {};
    },
};