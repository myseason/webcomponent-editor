// stylePresets.ts — 스타일 프리셋/한도 기본 정책 (확장 가능)

export type ShadowPresetItem = {
    inset?: boolean;
    x: string;
    y: string;
    blur: string;
    spread: string;
    color: string;
};

export type ShadowPreset = {
    label: string;
    item: ShadowPresetItem;
};

export type FilterItem = { fn: string; arg: string };
export type FilterPreset = { label: string; items: FilterItem[] };

export type TypographyPolicy = {
    fontFamilies?: string[];          // 선택적으로 제공 (UI는 기존 입력 유지)
    weightOptions: string[];          // MiniSelectV1 옵션
    alignOptions: string[];
    transformOptions: string[];
};

export type BackgroundPolicy = {
    sizeOptions: string[];
    repeatOptions: string[];
    positionOptions: string[];
    attachmentOptions: string[];
};

export type BorderPolicy = {
    styleOptions: string[];
    radiusPresets?: string[];         // (미사용 가능) 문서화용/향후 확장
};

export type ColorPolicy = {
    palette?: string[];               // (옵션) ColorField 등에서 사용 가능
};

export type StylePolicy = {
    gradient: {
        maxStops: number;           // gradient stop 개수 제한
        anglePresets: string[];     // linear-gradient 각도 프리셋
    };
    shadows: {
        presets: ShadowPreset[];
    };
    filters: {
        presets: FilterPreset[];
    };
    typography: TypographyPolicy;
    background: BackgroundPolicy;
    border: BorderPolicy;
    colors?: ColorPolicy;
};

// ===== 기본값 =====
export const DEFAULT_STYLE_POLICY: StylePolicy = {
    gradient: {
        maxStops: 5,
        anglePresets: ['0deg', '45deg', '90deg', '180deg', '270deg'],
    },
    shadows: {
        presets: [
            {
                label: '— preset —',
                item: {
                    inset: false,
                    x: '0px',
                    y: '0px',
                    blur: '0px',
                    spread: '0px',
                    color: 'rgba(0,0,0,0.2)',
                },
            },
            {
                label: 'soft',
                item: { inset: false, x: '0px', y: '2px', blur: '8px', spread: '0px', color: 'rgba(0,0,0,0.15)' },
            },
            {
                label: 'medium',
                item: { inset: false, x: '0px', y: '4px', blur: '12px', spread: '0px', color: 'rgba(0,0,0,0.20)' },
            },
            {
                label: 'hard',
                item: { inset: false, x: '0px', y: '8px', blur: '20px', spread: '0px', color: 'rgba(0,0,0,0.25)' },
            },
            {
                label: 'inner',
                item: { inset: true, x: '0px', y: '2px', blur: '6px', spread: '0px', color: 'rgba(0,0,0,0.20)' },
            },
        ],
    },
    filters: {
        presets: [
            { label: '— preset —', items: [] },
            { label: 'soften', items: [{ fn: 'blur', arg: '4px' }] },
            { label: 'vivid', items: [{ fn: 'contrast', arg: '1.1' }, { fn: 'saturate', arg: '1.1' }] },
            { label: 'desaturate', items: [{ fn: 'grayscale', arg: '1' }, { fn: 'brightness', arg: '1.05' }] },
            { label: 'warm', items: [{ fn: 'sepia', arg: '0.3' }, { fn: 'saturate', arg: '1.05' }] },
        ],
    },
    typography: {
        fontFamilies: undefined, // UI는 입력 유지. 필요 시 프로젝트 정책에서 배열 제공
        weightOptions: ['', '100','200','300','400','500','600','700','800','900','bold','normal'],
        alignOptions: ['', 'left','center','right','justify','start','end'],
        transformOptions: ['', 'none','capitalize','uppercase','lowercase'],
    },
    background: {
        sizeOptions: ['', 'cover', 'contain', 'auto'],
        repeatOptions: ['', 'no-repeat', 'repeat', 'repeat-x', 'repeat-y', 'space', 'round'],
        positionOptions: [
            '',
            'left top','left center','left bottom',
            'center top','center','center bottom',
            'right top','right center','right bottom',
        ],
        attachmentOptions: ['', 'scroll', 'fixed', 'local'],
    },
    border: {
        styleOptions: ['', 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset'],
        radiusPresets: undefined,
    },
    colors: {
        palette: undefined,
    },
};