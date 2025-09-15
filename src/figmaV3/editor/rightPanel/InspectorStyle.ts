export type LocaleLabel = { ko?: string; en?: string };

export type Option = {
    value: string | number;
    label?: LocaleLabel;
    description?: string;
};

export type DependentGroup = {
    label?: LocaleLabel;
    properties: Record<string, PropertySpec>;
};

export type ShorthandSpec = {
    enabled: boolean;
    syntax?: string;
    mapsTo: string[];
    strategy?: "tokenized" | "freeform";
    twoWayBinding?: "last-write-wins" | "shorthand-dominant" | "detail-dominant";
    examples?: string[];
    layers?: {
        multipleAllowed: boolean;
        shorthandSupportsMultiple: boolean;
        uiHint?: LocaleLabel;
    };
};

export type UIControl =
    | "icons"
    | "chips"
    | "select"
    | "input"
    | "color"
    | "ratio";

export type Preset = {
    value: string;
    label?: string;
    icon?: string;
};

export type PropertySpec = {
    cssKey: string;
    label?: { ko?: string; en?: string };
    description?: string;

    control?: UIControl;
    presets?: Preset[];
    placeholder?: string;
    options?: Array<{ value: string; label?: { ko?: string; en?: string } }>;

    /** 값에 따른 2차 속성 노출 */
    dependentProperties?: {
        [value: string]: DependentGroup;
    };

    /** 상세 속성(“상세” 펼침) */
    detailProperties?: Record<string, PropertySpec>;

    shorthand?: {
        enabled: boolean;
        syntax?: string;
        examples?: string[];
        layered?: boolean;
        layerLimit?: number;
        longhandKeys?: string[];
    };

    ui?: {
        lockUnit?: boolean;
        indentLevel?: number;
        tooltip?: string;
        freeInput?: boolean;
        freeInputSize?: 'sm' | 'md' | 'lg';
    };
};

export type GroupSpec = {
    label?: { ko?: string; en?: string };
    properties: Record<string, PropertySpec>;
};

export type SectionSpec = {
    label?: LocaleLabel;
    groups: Record<string, GroupSpec>;
};

export type InspectorStyle = {
    meta?: { schema: string; lang: string[] };
    Layout: SectionSpec;
    Typography: SectionSpec;
    Appearance: SectionSpec;
    Effects: SectionSpec;
    Interactivity: SectionSpec;
};

// ─────────────────────────────────────────────────────────────
// 스키마 데이터 (샘플/기본)
// ─────────────────────────────────────────────────────────────
export const INSPECTOR_STYLE: InspectorStyle = {
    meta: { schema: "inspector-style@2.1", lang: ["en", "ko"] },
    Layout: {
        label: { ko: '레이아웃' },
        groups: {
            'Display & Flow': {
                properties: {
                    display: {
                        cssKey: 'display',
                        label: { ko: '배치 방식' },
                        control: 'chips', // text chip
                        presets: [
                            { value: 'block' }, { value: 'inline' }, { value: 'flex', icon: 'layout.display:flex' }, { value: 'grid', icon: 'layout.display:grid' }
                        ],
                        ui: { lockUnit: true, tooltip: '요소의 배치 컨텍스트 설정' },
                        dependentProperties: {
                            // flex 선택 시
                            flex: {
                                label: { ko: 'Flex 컨테이너' },
                                properties: {
                                    flexDirection: {
                                        cssKey: 'flexDirection',
                                        label: { ko: '방향' },
                                        control: 'icons',
                                        presets: [
                                            { value: 'row', icon: 'layout.flexDirection:row' },
                                            { value: 'row-reverse', icon: 'layout.flexDirection:row-reverse' },
                                            { value: 'column', icon: 'layout.flexDirection:column' },
                                            { value: 'column-reverse', icon: 'layout.flexDirection:column-reverse' },
                                        ],
                                    },
                                    justifyContent: {
                                        cssKey: 'justifyContent',
                                        label: { ko: '주축 정렬' },
                                        control: 'icons',
                                        presets: [
                                            { value: 'flex-start', icon: 'layout.justifyContent:flex-start' },
                                            { value: 'center', icon: 'layout.justifyContent:center' },
                                            { value: 'flex-end', icon: 'layout.justifyContent:flex-end' },
                                            { value: 'space-between', icon: 'layout.justifyContent:space-between' },
                                            { value: 'space-around', icon: 'layout.justifyContent:space-around' },
                                            { value: 'space-evenly', icon: 'layout.justifyContent:space-evenly' },
                                        ],
                                    },
                                    alignItems: {
                                        cssKey: 'alignItems',
                                        label: { ko: '교차축 정렬' },
                                        control: 'icons',
                                        presets: [
                                            { value: 'flex-start', icon: 'layout.alignItems:flex-start' },
                                            { value: 'center', icon: 'layout.alignItems:center' },
                                            { value: 'flex-end', icon: 'layout.alignItems:flex-end' },
                                            { value: 'stretch', icon: 'layout.alignItems:stretch' },
                                        ],
                                    },
                                    flexWrap: {
                                        cssKey: 'flexWrap',
                                        label: { ko: '줄바꿈' },
                                        control: 'select',
                                        options: [{ value: 'nowrap' }, { value: 'wrap' }, { value: 'wrap-reverse' }],
                                    },
                                    gap: {
                                        cssKey: 'gap',
                                        label: { ko: '간격' },
                                        control: 'chips',
                                        presets: [
                                            { value: 'auto' }, { value: '1' }, { value: '2' }, { value: '4' }, { value: '8' },
                                            { value: '16' }, { value: '20' },{ value: '24' }
                                        ],
                                        ui: { freeInput: true, freeInputSize: 'sm' },
                                        // 추가 인풋은 UI에서 칩 외 “+” 팝오버 or 인풋 허용
                                    },
                                    // flex items (아이템 속성) - 상황에 따라 여기에 추가 가능
                                    alignSelf: {
                                        cssKey: 'alignSelf',
                                        label: { ko: '항목 정렬(개별)' },
                                        control: 'select',
                                        options: [{ value: 'auto' }, { value: 'flex-start' }, { value: 'center' }, { value: 'flex-end' }, { value: 'stretch' }],
                                    },
                                    order: {
                                        cssKey: 'order',
                                        label: { ko: '순서' },
                                        control: 'input',
                                        placeholder: '0',
                                    },
                                    flex: {
                                        cssKey: 'flex',
                                        label: { ko: '성장/축소/기준' },
                                        control: 'input',
                                        placeholder: '1 1 auto',
                                    },
                                },
                            },
                            // grid 선택 시
                            grid: {
                                label: { ko: 'Grid 컨테이너' },
                                properties: {
                                    gridTemplateColumns: {
                                        cssKey: 'gridTemplateColumns',
                                        label: { ko: '열 개수' },
                                        control: 'chips',
                                        presets: [
                                            { value: 'auto' }, { value: '1' }, { value: '2' }, { value: '3' }, { value: '4' },
                                            { value: '5' }, { value: '6' }, { value: '7' }
                                        ],
                                        placeholder: 'auto',
                                        ui: { freeInput: true, freeInputSize: 'sm' },
                                    },
                                    gridTemplateRows: {
                                        cssKey: 'gridTemplateRows',
                                        label: { ko: '행 개수' },
                                        control: 'chips',
                                        presets: [
                                            { value: 'auto' }, { value: '1' }, { value: '2' }, { value: '3' }, { value: '4' },
                                            { value: '5' }, { value: '6' }, { value: '7' }
                                        ],
                                        placeholder: 'auto',
                                        ui: { freeInput: true, freeInputSize: 'sm' },
                                    },
                                    justifyItems: {
                                        cssKey: 'justifyItems',
                                        label: { ko: '가로 정렬' },
                                        control: 'select',
                                        options: [{ value: 'stretch' }, { value: 'start' }, { value: 'center' }, { value: 'end' }],
                                    },
                                    alignItems: {
                                        cssKey: 'alignItems',
                                        label: { ko: '세로 정렬' },
                                        control: 'select',
                                        options: [{ value: 'stretch' }, { value: 'start' }, { value: 'center' }, { value: 'end' }],
                                    },
                                },
                            },
                        },
                    },
                    overflow: {
                        cssKey: 'overflow',
                        label: { ko: '오버플로우' },
                        control: 'select',
                        options: [{ value: 'visible' }, { value: 'hidden' }, { value: 'scroll' }, { value: 'auto' }],
                        ui: { lockUnit: true },
                    },
                },
            },

            Sizing: {
                properties: {
                    width: {
                        cssKey: 'width',
                        label: { ko: '너비' },
                        control: 'chips',
                        presets: [{ value: 'auto' }],
                        placeholder: 'e.g. 320px / 50%',
                        ui: { lockUnit: true },
                    },
                    height: {
                        cssKey: 'height',
                        label: { ko: '높이' },
                        control: 'chips',
                        presets: [{ value: 'auto' }],
                        placeholder: 'e.g. 200px / 50%',
                        ui: { lockUnit: true },
                    },
                    aspectRatio: {
                        cssKey: 'aspectRatio',
                        label: { ko: '종횡비' },
                        control: 'chips',
                        presets: [{ value: '1/1', label: '1:1' }, { value: '4/3', label: '16:9' }, { value: '16/9', label: '16:9' }],
                        placeholder: 'e.g. 4/3',
                        ui: { freeInput: true, freeInputSize: 'sm' },
                    },
                    boxSizing: {
                        cssKey: 'boxSizing',
                        label: { ko: '크기 계산' },
                        control: 'select',
                        options: [{ value: 'content-box' }, { value: 'border-box' }],
                    },
                },
            },

            Spacing: {
                properties: {
                    padding: {
                        cssKey: 'padding',
                        label: { ko: '패딩' },
                        control: 'chips',
                        presets: [{ value: '0' }, { value: '2' }, { value: '4' }, { value: '8' }, { value: '16' }],
                        detailProperties: {
                            paddingTop: {
                                cssKey: 'paddingTop',
                                label: { ko: '위' },
                                control: 'chips',
                                presets: [{ value: '0' }, { value: '2' }, { value: '4' }, { value: '8' }],
                                ui: { freeInput: true, freeInputSize: 'sm' },
                            },
                            paddingRight: {
                                cssKey: 'paddingRight',
                                label: { ko: '오른쪽' },
                                control: 'chips',
                                presets: [{ value: '0' }, { value: '2' }, { value: '4' }, { value: '8' }],
                                ui: { freeInput: true, freeInputSize: 'sm' },
                            },
                            paddingBottom: {
                                cssKey: 'paddingBottom',
                                label: { ko: '아래' },
                                control: 'chips',
                                presets: [{ value: '0' }, { value: '2' }, { value: '4' }, { value: '8' }],
                                ui: { freeInput: true, freeInputSize: 'sm' },
                            },
                            paddingLeft: {
                                cssKey: 'paddingLeft',
                                label: { ko: '왼쪽' },
                                control: 'chips',
                                presets: [{ value: '0' }, { value: '2' }, { value: '4' }, { value: '8' }],
                                ui: { freeInput: true, freeInputSize: 'sm' },
                            },
                        },
                        ui: { lockUnit: true, freeInput: true, freeInputSize: 'sm' },
                    },
                    margin: {
                        cssKey: 'margin',
                        label: { ko: '마진' },
                        control: 'chips',
                        presets: [{ value: '0' }, { value: '2' }, { value: '4' }, { value: '8' }, { value: '16' }],
                        detailProperties: {
                            marginTop: {
                                cssKey: 'marginTop',
                                label: { ko: '위' },
                                control: 'chips',
                                presets: [{ value: '0' }, { value: '2' }, { value: '4' }, { value: '8' }],
                                ui: { freeInput: true, freeInputSize: 'sm' },
                            },
                            marginRight: {
                                cssKey: 'marginRight',
                                label: { ko: '오른쪽' },
                                control: 'chips',
                                presets: [{ value: '0' }, { value: '2' }, { value: '4' }, { value: '8' }],
                                ui: { freeInput: true, freeInputSize: 'sm' },
                            },
                            marginBottom: {
                                cssKey: 'marginBottom',
                                label: { ko: '아래' },
                                control: 'chips',
                                presets: [{ value: '0' }, { value: '2' }, { value: '4' }, { value: '8' }],
                                ui: { freeInput: true, freeInputSize: 'sm' },
                            },
                            marginLeft: {
                                cssKey: 'marginLeft',
                                label: { ko: '왼쪽' },
                                control: 'chips',
                                presets: [{ value: '0' }, { value: '2' }, { value: '4' }, { value: '8' }],
                                ui: { freeInput: true, freeInputSize: 'sm' },
                            },
                        },
                        ui: { lockUnit: true, freeInput: true, freeInputSize: 'sm' },
                    },
                    gap: {
                        cssKey: 'gap',
                        label: { ko: '간격' },
                        control: 'chips',
                        presets: [{ value: '0' }, { value: '2' }, { value: '4' }, { value: '8' }, { value: '16' }],
                        ui: { freeInput: true, freeInputSize: 'sm' },
                },
                },
            },
        },
    },

    Typography: {
        label: { ko: '서체' },
        groups: {
            Font: {
                properties: {
                    fontFamily: {
                        cssKey: 'fontFamily',
                        label: { ko: '글꼴' },
                        control: 'select', // 폰트 리스트 바인딩
                        options: [{ value: 'Inter' }, { value: 'Pretendard' }, { value: 'Noto Sans' }],
                        ui: {freeInput: true, freeInputSize: 'md' },
                    },
                    fontSize: {
                        cssKey: 'fontSize',
                        label: { ko: '크기' },
                        control: 'chips',
                        presets: [{ value: '10' }, { value: '12' }, { value: '14' }, { value: '16' }],
                        placeholder: 'e.g. 18px',
                        ui: {freeInput: true, freeInputSize: 'sm' },
                    },
                    fontStyle: {
                        cssKey: 'fontStyle',
                        label: { ko: '스타일' },
                        control: 'select',
                        options: [{ value: 'normal' }, { value: 'italic' }, { value: 'oblique' }],
                    },
                    fontWeight: {
                        cssKey: 'fontWeight',
                        label: { ko: '굵기' },
                        control: 'select',
                        options: [
                            { value: '300' }, { value: '400' }, { value: '500' },
                            { value: '700' }, { value: '800' }, { value: '900' },
                            { value: 'normal' }, { value: 'bold' }, { value: 'lighter' }, { value: 'bolder' }
                        ],
                        ui: {freeInput: true, freeInputSize: 'sm' },
                    },
                    color: {
                        cssKey: 'color',
                        label: { ko: '글자색' },
                        control: 'color',
                    },
                },
            },
            Text: {
                properties: {
                    textAlign: {
                        cssKey: 'textAlign',
                        label: { ko: '정렬' },
                        control: 'icons',
                        presets: [
                            { value: 'left', icon: 'typography.textAlign:left' },
                            { value: 'center', icon: 'typography.textAlign:center' },
                            { value: 'right', icon: 'typography.textAlign:right' },
                            { value: 'justify', icon: 'typography.textAlign:justify' },
                        ],
                    },
                    lineHeight: {
                        cssKey: 'lineHeight',
                        label: { ko: '줄 높이' },
                        control: 'chips',
                        presets: [{ value: '1' }, { value: '1.2' }, { value: '1.5' }, { value: '2' }],
                        placeholder: 'e.g. 1.4 or 20px',
                        ui: {freeInput: true, freeInputSize: 'sm' },
                    },
                    letterSpacing: {
                        cssKey: 'letterSpacing',
                        label: { ko: '자간' },
                        control: 'chips',
                        presets: [{ value: '0' }, { value: '0.5' }, { value: '1' }, { value: '2' }],
                        placeholder: 'e.g. 0.2px',
                        ui: {freeInput: true, freeInputSize: 'sm' },
                    },
                    textTransform: {
                        cssKey: 'textTransform',
                        label: { ko: '대소문자' },
                        control: 'select', // 또는 icons 가능
                        options: [{ value: 'none' }, { value: 'capitalize' }, { value: 'uppercase' }, { value: 'lowercase' }],
                    },
                    textDecoration: {
                        cssKey: 'textDecoration',
                        label: { ko: '장식' },
                        control: 'select', // 또는 icons 가능
                        options: [{ value: 'none' }, { value: 'underline' }, { value: 'line-through' }],
                    },
                },
            },
            'Content Flow': {
                properties: {
                    whiteSpace: {
                        cssKey: 'whiteSpace',
                        label: { ko: '공백 처리' },
                        control: 'select',
                        options: [{ value: 'normal' }, { value: 'nowrap' }, { value: 'pre' }, { value: 'pre-wrap' }],
                    },
                    wordBreak: {
                        cssKey: 'wordBreak',
                        label: { ko: '줄바꿈' },
                        control: 'select',
                        options: [{ value: 'normal' }, { value: 'break-all' }, { value: 'keep-all' }],
                    },
                    textOverflow: {
                        cssKey: 'textOverflow',
                        label: { ko: '넘침 표시' },
                        control: 'select',
                        options: [{ value: 'clip' }, { value: 'ellipsis' }],
                    },
                },
            },
        },
    },

    Appearance: {
        label: { ko: '모양' },
        groups: {
            'Fill': {
                properties: {
                    backgroundColor: {
                        cssKey: 'backgroundColor',
                        label: { ko: '배경색' },
                        control: 'color',
                        ui: { lockUnit: true },
                    },

                    // 배경 상세(이미지 포함)
                    background: {
                        cssKey: 'background', // shorthand
                        label: { ko: '배경 상세' },
                        control: 'input',
                        shorthand: {
                            enabled: true,
                            layered: true,     // 여러개 가능
                            layerLimit: 1,     // shorthand는 UI에서 1개만 (추가는 longhand로)
                            syntax: '<color> | <image> <position> / <size> repeat | ...',
                            longhandKeys: ['backgroundImage','backgroundPosition','backgroundSize','backgroundRepeat','backgroundClip','backgroundOrigin','backgroundAttachment'],
                        },
                        detailProperties: {
                            backgroundImage: {
                                cssKey: 'backgroundImage',
                                label: { ko: '이미지' },
                                control: 'input',
                                placeholder: 'url(...) / none',
                                dependentProperties: {
                                    // 값이 none이 아니면 size/repeat/position/clip/origin/attachment 노출
                                    '*': {
                                        label: { ko: '이미지 설정' },
                                        properties: {
                                            backgroundSize: {
                                                cssKey: 'backgroundSize',
                                                label: { ko: '크기' },
                                                control: 'select',
                                                options: [{ value: 'auto' }, { value: 'cover' }, { value: 'contain' }],
                                            },
                                            backgroundRepeat: {
                                                cssKey: 'backgroundRepeat',
                                                label: { ko: '반복' },
                                                control: 'select',
                                                options: [{ value: 'repeat' }, { value: 'no-repeat' }, { value: 'repeat-x' }, { value: 'repeat-y' }],
                                            },
                                            backgroundPosition: {
                                                cssKey: 'backgroundPosition',
                                                label: { ko: '위치' },
                                                control: 'input',
                                                placeholder: 'e.g. 50% 50%',
                                            },
                                            backgroundClip: {
                                                cssKey: 'backgroundClip',
                                                label: { ko: '클립' },
                                                control: 'select',
                                                options: [{ value: 'border-box' }, { value: 'padding-box' }, { value: 'content-box' }],
                                            },
                                            backgroundOrigin: {
                                                cssKey: 'backgroundOrigin',
                                                label: { ko: '기원' },
                                                control: 'select',
                                                options: [{ value: 'padding-box' }, { value: 'border-box' }, { value: 'content-box' }],
                                            },
                                            backgroundAttachment: {
                                                cssKey: 'backgroundAttachment',
                                                label: { ko: '고정' },
                                                control: 'select',
                                                options: [{ value: 'scroll' }, { value: 'fixed' }, { value: 'local' }],
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    // + 버튼을 눌러 longhand로 추가 레이어를 쌓는 형태는 UI 레벨에서 처리 (spec은 위 longhandKeys 참조)
                },
            },

            Border: {
                properties: {
                    border: {
                        cssKey: 'border', // shorthand
                        label: { ko: '테두리' },
                        control: 'chips',
                        //presets: [{ value: '1px solid currentColor' }],
                        shorthand: {
                            enabled: true,
                            syntax: '<width> || <style> || <color>',
                            examples: ['1px solid #000'],
                            longhandKeys: ['borderWidth','borderStyle','borderColor'],
                        },
                        placeholder: '1px solid color',
                        ui: {freeInput: true, freeInputSize: 'lg' },
                        detailProperties: {
                            borderWidth: {
                                cssKey: 'borderWidth',
                                label: { ko: '두께' },
                                control: 'chips',
                                presets: [{ value: '0' },{ value: '1' }, { value: '2' }, { value: '4' }],
                                ui: {freeInput: true, freeInputSize: 'sm' },
                            },
                            borderStyle: {
                                cssKey: 'borderStyle',
                                label: { ko: '스타일' },
                                control: 'select',
                                options: [{ value: 'none' }, { value: 'solid' }, { value: 'dashed' }, { value: 'dotted' }],
                            },
                            borderColor: {
                                cssKey: 'borderColor',
                                label: { ko: '색상' },
                                control: 'color',
                            },
                        },
                    },
                    borderRadius: {
                        cssKey: 'borderRadius',
                        label: { ko: '모서리' },
                        control: 'chips',
                        presets: [{ value: '0' }, { value: '2' }, { value: '4' }, { value: '8' }],
                        ui: {freeInput: true, freeInputSize: 'sm' },
                        detailProperties: {
                            borderTopLeftRadius: {
                                cssKey: 'borderTopLeftRadius',
                                label: { ko: '좌상' },
                                control: 'chips',
                                presets: [{ value: '0' }, { value: '2' }, { value: '4' }, { value: '8' }],
                                ui: {freeInput: true, freeInputSize: 'sm' },
                            },
                            borderTopRightRadius: {
                                cssKey: 'borderTopRightRadius',
                                label: { ko: '우상' },
                                control: 'chips',
                                presets: [{ value: '0' }, { value: '2' }, { value: '4' }, { value: '8' }],
                                ui: {freeInput: true, freeInputSize: 'sm' },
                            },
                            borderBottomRightRadius: {
                                cssKey: 'borderBottomRightRadius',
                                label: { ko: '우하' },
                                control: 'chips',
                                presets: [{ value: '0' }, { value: '2' }, { value: '4' }, { value: '8' }],
                                ui: {freeInput: true, freeInputSize: 'sm' },
                            },
                            borderBottomLeftRadius: {
                                cssKey: 'borderBottomLeftRadius',
                                label: { ko: '좌하' },
                                control: 'chips',
                                presets: [{ value: '0' }, { value: '2' }, { value: '4' }, { value: '8' }],
                                ui: {freeInput: true, freeInputSize: 'sm' },
                            },
                        },
                    },
                    outline: {
                        cssKey: 'outline', // shorthand
                        label: { ko: '외곽선' },
                        control: 'chips',
                        //presets: [{ value: '1px solid currentColor' }],
                        shorthand: {
                            enabled: true,
                            syntax: '<outline-width> || <outline-style> || <outline-color>',
                            examples: ['1px solid #000'],
                            longhandKeys: ['outlineWidth','outlineStyle','outlineColor'],
                        },
                        placeholder: '1px solid color',
                        ui: {freeInput: true, freeInputSize: 'lg' },
                        detailProperties: {
                            outlineWidth: {
                                cssKey: 'outlineWidth',
                                label: { ko: '두께' },
                                control: 'chips',
                                presets: [{ value: '0' }, { value: '2' }, { value: '4' }, { value: '8' }],
                                placeholder: '0',
                                ui: {freeInput: true, freeInputSize: 'sm' },
                            },
                            outlineStyle: {
                                cssKey: 'outlineStyle',
                                label: { ko: '스타일' },
                                control: 'select',
                                options: [{ value: 'none' }, { value: 'solid' }, { value: 'dashed' }, { value: 'dotted' }],
                            },
                            outlineColor: {
                                cssKey: 'outlineColor',
                                label: { ko: '색상' },
                                control: 'color',
                            },
                        },
                    },
                    opacity: {
                        cssKey: 'opacity',
                        label: { ko: '투명도' },
                        control: 'chips',
                        presets: [{ value: '0' }, { value: '0.25' }, { value: '0.75' }, { value: '1' }],
                        placeholder: '0 ~ 1',
                         ui: {freeInput: true, freeInputSize: 'sm' },
                    },
                },
            },
        },
    },

    Effects: {
        label: { ko: '효과' },
        groups: {
            Visual: {
                properties: {
                    opacity: {
                        cssKey: 'opacity',
                        label: { ko: '투명도' },
                        control: 'chips',
                        presets: [{ value: '0' }, { value: '0.25' }, { value: '0.5' }, { value: '1' }],
                        placeholder: '0 ~ 1',
                        ui: {freeInput: true, freeInputSize: 'sm' },
                    },
                    filter: {
                        cssKey: 'filter',              // CSS shorthand (함수 리스트)
                        label: { ko: '그래픽 효과' },
                        control: 'chips',
                        presets: [
                            { value: 'none' },
                            { value: 'blur(4px)' },
                            { value: 'brightness(0.9)' },
                            { value: 'contrast(1.2)' },
                            { value: 'grayscale(1)' },
                        ],
                        shorthand: {
                            enabled: true,
                            layered: true,               // 여러 함수 조합 가능
                            layerLimit: 1,               // 메인(행)에서는 1개만 간단 입력, 상세에서 여러 개 관리
                            syntax: '<filter-function-list>',
                            longhandKeys: ['blur', 'brightness', 'contrast', 'grayscale', 'hue-rotate', 'invert', 'saturate', 'sepia', 'drop-shadow'],
                        },
                        // UI 분해용 상세: 실제로는 모두 filter로 기록/갱신
                        detailProperties: {
                            // 숫자/길이형은 placeholder 제공
                            blur:        { cssKey: 'filter', label: { ko: '블러' },        control: 'input', placeholder: 'e.g. blur(6px)' },
                            brightness:  { cssKey: 'filter', label: { ko: '밝기' },        control: 'input', placeholder: 'e.g. brightness(1.1)' },
                            contrast:    { cssKey: 'filter', label: { ko: '대비' },        control: 'input', placeholder: 'e.g. contrast(1.2)' },
                            grayscale:   { cssKey: 'filter', label: { ko: '그레이스케일' }, control: 'input', placeholder: 'e.g. grayscale(1)' },
                            'hue-rotate':{ cssKey: 'filter', label: { ko: '색상 회전' },   control: 'input', placeholder: 'e.g. hue-rotate(30deg)' },
                            invert:      { cssKey: 'filter', label: { ko: '반전' },        control: 'input', placeholder: 'e.g. invert(1)' },
                            saturate:    { cssKey: 'filter', label: { ko: '채도' },        control: 'input', placeholder: 'e.g. saturate(1.2)' },
                            sepia:       { cssKey: 'filter', label: { ko: '세피아' },      control: 'input', placeholder: 'e.g. sepia(1)' },
                            'drop-shadow': { cssKey: 'filter', label: { ko: '드롭 섀도' }, control: 'input', placeholder: 'e.g. drop-shadow(0 2px 6px #0003)' },
                        },
                    },
                    mixBlendMode: {
                        cssKey: 'mixBlendMode',
                        label: { ko: '블렌드' },
                        control: 'select',
                        options: [
                            { value: 'normal' }, { value: 'multiply' }, { value: 'screen' },
                            { value: 'overlay' }, { value: 'darken' }, { value: 'lighten' },
                            { value: 'color-dodge' }, { value: 'color-burn' }, { value: 'hard-light' },
                            { value: 'soft-light' }, { value: 'difference' }, { value: 'exclusion' },
                            { value: 'hue' }, { value: 'saturation' }, { value: 'color' }, { value: 'luminosity' },
                        ],
                    },
                },
            },

            Shadows: {
                properties: {
                    boxShadow: {
                        cssKey: 'boxShadow',
                        label: { ko: '요소 그림자' },
                        control: 'chips',
                        presets: [
                            { value: 'none' },
                            { value: '0 1px 3px rgba(0,0,0,0.2)' },
                            { value: '0 2px 8px rgba(0,0,0,0.25)' },
                            { value: '0 4px 16px rgba(0,0,0,0.2)' },
                        ],
                        shorthand: {
                            enabled: true,
                            layered: true,               // 그림자 다중 레이어 가능
                            layerLimit: 1,               // 메인 행에서는 1개만 간단 입력
                            syntax: '<offset-x> <offset-y> <blur-radius>? <spread-radius>? <color>?',
                            longhandKeys: ['offsetX','offsetY','blur','spread','color'],
                        },
                        // 분해 입력(모두 boxShadow 문자열에 병합)
                        detailProperties: {
                            offsetX: { cssKey: 'boxShadow', label: { ko: 'X' }, control: 'input', placeholder: 'e.g. 0' },
                            offsetY: { cssKey: 'boxShadow', label: { ko: 'Y' }, control: 'input', placeholder: 'e.g. 2px' },
                            blur:    { cssKey: 'boxShadow', label: { ko: '블러' }, control: 'input', placeholder: 'e.g. 8px' },
                            spread:  { cssKey: 'boxShadow', label: { ko: '스프레드' }, control: 'input', placeholder: 'e.g. 0' },
                            color:   { cssKey: 'boxShadow', label: { ko: '색상' }, control: 'color' },
                        },
                    },
                    textShadow: {
                        cssKey: 'textShadow',
                        label: { ko: '텍스트 그림자' },
                        control: 'chips',
                        presets: [
                            { value: 'none' },
                            { value: '0 1px 1px rgba(0,0,0,0.3)' },
                        ],
                        shorthand: {
                            enabled: true,
                            layered: true,
                            layerLimit: 1,
                            syntax: '<offset-x> <offset-y> <blur-radius>? <color>?',
                            longhandKeys: ['offsetX','offsetY','blur','color'],
                        },
                        detailProperties: {
                            offsetX: { cssKey: 'textShadow', label: { ko: 'X' }, control: 'input', placeholder: 'e.g. 0' },
                            offsetY: { cssKey: 'textShadow', label: { ko: 'Y' }, control: 'input', placeholder: 'e.g. 1px' },
                            blur:    { cssKey: 'textShadow', label: { ko: '블러' }, control: 'input', placeholder: 'e.g. 2px' },
                            color:   { cssKey: 'textShadow', label: { ko: '색상' }, control: 'color' },
                        },
                    },
                },
            },

            Transform: {
                properties: {
                    transform: {
                        cssKey: 'transform',
                        label: { ko: '변형' },
                        control: 'chips',
                        presets: [
                            { value: 'none' },
                            { value: 'scale(1.05)' },
                            { value: 'rotate(5deg)' },
                            { value: 'translate(0, 4px)' },
                        ],
                        shorthand: {
                            enabled: true,
                            layered: true,               // 여러 변형 함수를 조합
                            layerLimit: 1,               // 메인에서는 1개 간단 입력
                            syntax: '<transform-function>+',
                            longhandKeys: ['translate','translateX','translateY','scale','scaleX','scaleY','rotate','skew','skewX','skewY'],
                        },
                        detailProperties: {
                            translate:  { cssKey: 'transform', label: { ko: '이동' },   control: 'input', placeholder: 'e.g. translate(10px, 0)' },
                            translateX: { cssKey: 'transform', label: { ko: '이동 X' }, control: 'input', placeholder: 'e.g. translateX(8px)' },
                            translateY: { cssKey: 'transform', label: { ko: '이동 Y' }, control: 'input', placeholder: 'e.g. translateY(8px)' },
                            scale:      { cssKey: 'transform', label: { ko: '스케일' }, control: 'input', placeholder: 'e.g. scale(1.1)' },
                            rotate:     { cssKey: 'transform', label: { ko: '회전' },   control: 'input', placeholder: 'e.g. rotate(10deg)' },
                            skew:       { cssKey: 'transform', label: { ko: '기울임' }, control: 'input', placeholder: 'e.g. skew(5deg, 0)' },
                        },
                    },
                    transformOrigin: {
                        cssKey: 'transformOrigin',
                        label: { ko: '기준점' },
                        control: 'input',
                        placeholder: 'e.g. 50% 50% / center',
                    },
                    perspective: {
                        cssKey: 'perspective',
                        label: { ko: '원근' },
                        control: 'input',
                        placeholder: 'e.g. 600px',
                    },
                },
            },

            Transition: {
                properties: {
                    transition: {
                        cssKey: 'transition',
                        label: { ko: '전환 효과' },
                        control: 'chips',
                        presets: [
                            { value: 'all 150ms ease-out' },
                            { value: 'opacity 200ms ease-in' },
                        ],
                        shorthand: {
                            enabled: true,
                            layered: true,               // 여러 트랜지션 조합
                            layerLimit: 1,               // 메인에서는 1개 간단 입력
                            syntax: '<property> <duration> <timing-function>? <delay>?',
                            longhandKeys: ['transitionProperty','transitionDuration','transitionTimingFunction','transitionDelay'],
                        },
                        detailProperties: {
                            transitionProperty: {
                                cssKey: 'transitionProperty',
                                label: { ko: '대상 속성' },
                                control: 'input',
                                placeholder: 'e.g. opacity, transform',
                            },
                            transitionDuration: {
                                cssKey: 'transitionDuration',
                                label: { ko: '지속' },
                                control: 'input',
                                placeholder: 'e.g. 200ms',
                            },
                            transitionTimingFunction: {
                                cssKey: 'transitionTimingFunction',
                                label: { ko: '속도 곡선' },
                                control: 'select',
                                options: [{ value: 'ease' }, { value: 'linear' }, { value: 'ease-in' }, { value: 'ease-out' }, { value: 'ease-in-out' }],
                            },
                            transitionDelay: {
                                cssKey: 'transitionDelay',
                                label: { ko: '지연' },
                                control: 'input',
                                placeholder: 'e.g. 0ms',
                            },
                        },
                    },
                },
            },

            Animations: {
                properties: {
                    // Transition 다중 구성용 섹션을 쪼갤 때 활용 (UI 레벨에서 배열 관리)
                    animation: {
                        cssKey: 'animation',
                        label: { ko: '애니메이션' },
                        control: 'chips',
                        presets: [{ value: 'none' }],
                        shorthand: {
                            enabled: true,
                            layered: true,               // 여러 애니메이션 조합 가능
                            layerLimit: 1,               // 메인에서는 1개 간단 입력
                            syntax: '<name> <duration> <timing-function>? <delay>? <iteration-count>? <direction>? <fill-mode>? <play-state>?',
                            longhandKeys: [
                                'animationName','animationDuration','animationTimingFunction','animationDelay',
                                'animationIterationCount','animationDirection','animationFillMode','animationPlayState'
                            ],
                        },
                        detailProperties: {
                            animationName:            { cssKey: 'animationName',            label: { ko: '이름' },     control: 'input',  placeholder: 'e.g. fadeIn' },
                            animationDuration:        { cssKey: 'animationDuration',        label: { ko: '지속' },     control: 'input',  placeholder: 'e.g. 400ms' },
                            animationTimingFunction:  { cssKey: 'animationTimingFunction',  label: { ko: '속도 곡선' }, control: 'select',
                                options: [{ value: 'ease' }, { value: 'linear' }, { value: 'ease-in' }, { value: 'ease-out' }, { value: 'ease-in-out' }] },
                            animationDelay:           { cssKey: 'animationDelay',           label: { ko: '지연' },     control: 'input',  placeholder: 'e.g. 0ms' },
                            animationIterationCount:  { cssKey: 'animationIterationCount',  label: { ko: '반복' },     control: 'input',  placeholder: 'e.g. infinite / 1' },
                            animationDirection:       { cssKey: 'animationDirection',       label: { ko: '방향' },     control: 'select',
                                options: [{ value: 'normal' }, { value: 'reverse' }, { value: 'alternate' }, { value: 'alternate-reverse' }] },
                            animationFillMode:        { cssKey: 'animationFillMode',        label: { ko: '채움' },     control: 'select',
                                options: [{ value: 'none' }, { value: 'forwards' }, { value: 'backwards' }, { value: 'both' }] },
                            animationPlayState:       { cssKey: 'animationPlayState',       label: { ko: '재생' },     control: 'select',
                                options: [{ value: 'running' }, { value: 'paused' }] },
                        },
                    },
                },
            },
        },
    },

    Interactivity: {
        label: { ko: '상호작용' },
        groups: {
            'User Interaction': {
                properties: {
                    cursor: {
                        cssKey: 'cursor',
                        label: { ko: '커서' },
                        control: 'select',
                        options: [{ value: 'auto' }, { value: 'default' }, { value: 'pointer' }, { value: 'text' }, { value: 'move' }],
                    },
                    pointerEvents: {
                        cssKey: 'pointerEvents',
                        label: { ko: '포인터 이벤트' },
                        control: 'select',
                        options: [{ value: 'auto' }, { value: 'none' }],
                    },
                    userSelect: {
                        cssKey: 'userSelect',
                        label: { ko: '텍스트 선택' },
                        control: 'select',
                        options: [{ value: 'auto' }, { value: 'text' }, { value: 'none' }],
                    },
                },
            },
        },
    },
};