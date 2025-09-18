import {StyleGroupKey} from "@/figmaV3/core/types";

export type StyleValues = Record<string, string | undefined>;
export type SetStyleValue = (k: string, v: string | undefined) => void;

export type LocaleLabel = { ko?: string; en?: string };

export type Option = {
    value: string | number;
    label?: LocaleLabel;
    description?: string;
    iconKey?: string; // 아이콘 매핑 키 (InspectorStyleIcons.getIconFor)
    disabled?: boolean;
};

// UI 크기 힌트: 실제 픽셀/폭은 NewInspector가 책임
export type UISize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** 표시 조건식: 컨텍스트/다른 값/논리 연산 */
export type WhenExpr =
    | { all: WhenExpr[] }
    | { any: WhenExpr[] }
    | { not: WhenExpr }
    | {
    context: 'isContainer' | 'parentDisplay';
    is?: string | number | boolean;
    in?: Array<string | number | boolean>;
}
    | {
    value: string /* cssKey(=propKey) */;
    is?: string | number | boolean;
    in?: Array<string | number | boolean>;
};

export type PropertySpec = {
    label?: LocaleLabel;
    description?: string;

    // 렌더 타입/데이터
    control?: 'icons' | 'chips' | 'select' | 'radio' | 'checkbox' | 'input' | 'color' | 'ratio';
    options?: Option[]; // select/radio/checkbox/chips/icons
    presets?: { value: string; label?: string; icon?: string }[]; // (구버전 호환)
    placeholder?: string; // input/ratio에 사용

    // 값에 따른 2차 속성 노출 (예: display:flex → flex 관련 속성들)
    dependentProperties?: {
        [value: string | '*']: DependentGroupSpec;
    };

    // 상세 속성 (“상세” 펼침 시 노출)
    detailProperties?: Record<string, PropertySpec>;

    // shorthand(우선 입력) / 레이어링 힌트
    shorthand?: {
        enabled: boolean;
        syntax?: string;
        examples?: string[];
        layered?: boolean; // 다중 레이어 가능(예: background, shadow 등)
        layerLimit?: number; // 메인 행에서는 N개까지만 허용, 상세에서 확장
        longhandKeys?: string[]; // 상세에서 풀어줄 롱핸드 키
    };

    // 표시 조건 (없으면 항상 표시)
    displayWhen?: WhenExpr;

    // UI 힌트(크기·폭은 NewInspector가 책임)
    ui?: {
        tooltip?: string;
        dense?: boolean;
        align?: 'start' | 'center';

        // 크기 힌트만 유지 (실제 픽셀 폭은 NewInspector에서 결정)
        size?: UISize; // xs~xl

        // Select
        variant?: 'native' | 'dropdown';
        searchable?: boolean;
        multiple?: boolean;

        // Radio/Checkbox
        columns?: 1 | 2 | 3 | 4;
        wrap?: boolean;

        // Input
        inputType?: 'text' | 'number' | 'url' | 'time';
        prefixIconKey?: string;
        suffixIconKey?: string;

        // 칩 + 입력 혼합 사용(추가 수치 입력)
        extraInput?: {
            enabled: boolean;
            type?: 'text' | 'number';
            size?: UISize;
            placeholder?: string; // width 제거
        };

        /** 업로드 버튼(파일 선택) — input 옆 suffix 버튼으로 노출 */
        uploadButton?: {
            enabled: boolean;
            accept?: string;  // e.g. 'image/*'
            /** 파일을 CSS 값으로 변환하는 방법 */
            toValue?: 'url()' | 'dataURL' | 'objectURL';
            /** url()일 때, 포맷: e.g. 'url(${src})' — 기본값은 자동으로 'url(...)' 생성 */
            template?: string;
            /** 비동기 업로더 키(있다면 업로드 API로 전송 후 CDN URL을 value에 주입) */
            uploaderKey?: string; // 프로젝트 업로더 식별자
            iconKey?: string; // 버튼 아이콘 선택용 키 (예: 'upload' | 'file' | 'cloud-upload' | 'link')
        };

        // 1차 락 단위
        lockUnit?: boolean;
    };
};

/** 종속 그룹(값 기반 2차 속성 묶음)에 displayWhen을 부여할 수 있도록 확장 */
export type DependentGroupSpec = {
    label?: LocaleLabel;
    properties: Record<string, PropertySpec>;
    displayWhen?: WhenExpr; // 조건 만족 시에만 노출
};

export type GroupSpec = {
    label?: LocaleLabel;
    properties: Record<string, PropertySpec>;
};

export type SectionSpec = {
    label?: LocaleLabel;
    groups: Record<string, GroupSpec>;
};

export interface SectionProps {
    values: StyleValues;
    setValue: SetStyleValue;
    locks: Record<string, boolean>;
    onToggleLock: (k: string) => void;
    expanded: Record<string, boolean>;
    /** 상세를 펼칠 때 호출(원본처럼 시드 가능) */
    openDetail: (detailKey: string, seed?: () => void) => void;
    canLock?: boolean; // ★ 추가
    getCpVisible?: (g: StyleGroupKey) => boolean | undefined;
}