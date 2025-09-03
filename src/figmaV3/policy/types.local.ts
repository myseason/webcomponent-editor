export type InspectorModePolicy = {
    /** Inspector에서 노출을 허용할 prop 키 목록 (예: 'src','alt','href'...) */
    allowProps?: string[];
    /** Inspector에서 노출을 허용할 style 키 목록 (예: 'display','position','width'...). '*' 허용 */
    allowStyles?: string[];
    /** 명시적으로 숨길 prop 키 목록 (allowAll일 때도 숨김) */
    denyProps?: string[];
    /** 명시적으로 숨길 style 키 목록 (allowAll일 때도 숨김) */
    denyStyles?: string[];
    /**
     * 고급 모드에서 전부 허용할지 여부.
     * - undefined/true: 전부 허용(deny 제외)
     * - false: allow 목록만 허용
     */
    allowAllInExpert?: boolean;
};

export type ComponentInspectorPolicyV2 = {
    /** 모드별 정책 */
    modes?: {
        basic?: InspectorModePolicy;
        expert?: InspectorModePolicy;
    };
    /**
     * 기존 v1 정책과의 호환(유지): inspector.controls['props:key'|'styles:key']?.visible
     * - v2를 사용하지 않는 동안에도 기존 동작을 유지하기 위함
     */
    inspector?: {
        controls?: Record<string, { visible?: boolean }>;
    };
};