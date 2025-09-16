export type LocaleLabel = { ko?: string; en?: string };

export type Option = {
    value: string | number;
    label?: LocaleLabel;
    description?: string;
    iconKey?: string;     // 아이콘 매핑 키 (InspectorStyleIcons.getIconFor)
    disabled?: boolean;
};

export type UISize = 'xs'|'sm'|'md'|'lg'|'xl';
export type UIWidth = number | `${number}px` | `${number}%` | 'auto';

type UIControl =
    | 'icons'      // 아이콘 칩 (라디오와 유사)
    | 'chips'      // 텍스트 칩
    | 'select'     // 셀렉트(단/다중)
    | 'radio'      // 라디오 그룹
    | 'checkbox'   // 체크박스 그룹(다중)
    | 'input'      // 자유 입력
    | 'color'
    | 'ratio';

/** 표시 조건식: 컨텍스트/다른 값/논리 연산 */
export type WhenExpr =
    | { all: WhenExpr[] }
    | { any: WhenExpr[] }
    | { not: WhenExpr }
    | { context: 'isContainer' | 'parentDisplay'; is?: string|number|boolean; in?: Array<string|number|boolean> }
    | { value: string /* cssKey */, is?: string|number|boolean; in?: Array<string|number|boolean> };

export type PropertySpec = {
    label?: LocaleLabel;
    description?: string;

    // 렌더 타입/데이터
    control?: UIControl;
    options?: Option[];                       // select/radio/checkbox/chips/icons
    presets?: { value: string; label?: string; icon?: string }[]; // (구버전 호환)

    placeholder?: string;                     // input/ratio에 사용

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
        layered?: boolean;       // 다중 레이어 가능(예: background, shadow 등)
        layerLimit?: number;     // 메인 행에서는 N개까지만 허용, 상세에서 확장
        longhandKeys?: string[]; // 상세에서 풀어줄 롱핸드 키
    };

    // 표시 조건 (없으면 항상 표시)
    displayWhen?: WhenExpr;

    // UI 힌트
    ui?: {
        tooltip?: string;
        dense?: boolean;
        align?: 'start'|'center';

        // 크기/가로폭
        size?: UISize;           // xs~xl
        width?: UIWidth;
        minWidth?: UIWidth;
        maxWidth?: UIWidth;

        // Select
        variant?: 'native'|'dropdown';
        searchable?: boolean;
        multiple?: boolean;

        // Radio/Checkbox
        columns?: 1|2|3|4;
        wrap?: boolean;

        // Input
        inputType?: 'text'|'number'|'url'|'time';
        prefixIconKey?: string;
        suffixIconKey?: string;

        // 칩 + 입력 혼합 사용(추가 수치 입력)
        extraInput?: {
            enabled: boolean;
            type?: 'text'|'number';
            size?: UISize;
            width?: UIWidth;
            placeholder?: string;
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

export type InspectorStyle = {
    meta?: { schema: string; lang: string[] };
    Layout: SectionSpec;
    Typography: SectionSpec;
    Appearance: SectionSpec;
    Effects: SectionSpec;
    Interactivity: SectionSpec;
};

// ─────────────────────────────────────────────────────────────
// 기본 스키마 데이터 (v2.3)
// ─────────────────────────────────────────────────────────────
export const INSPECTOR_STYLE: InspectorStyle = {
    meta: { schema: 'inspector-style@2.3', lang: ['en','ko'] },

    Layout: {
        label: { ko: '레이아웃', en: 'Layout' },
        groups: {
            'Display & Flow': {
                properties: {
                    display: {
                        label: { ko: '배치 방식', en: 'Display' },
                        control: 'chips',
                        options: [
                            { value: 'block'   },
                            { value: 'inline'  },
                            { value: 'flex', iconKey: 'layout.display:flex' },
                            { value: 'grid', iconKey: 'layout.display:grid' },
                        ],
                        ui: { lockUnit: true, tooltip: '요소의 배치 컨텍스트', size: 'sm' },

                        // 값에 따른 2차 속성 (컨테이너/아이템 조건은 displayWhen으로 제어)
                        dependentProperties: {
                            // Flex 컨테이너 (display=flex AND isContainer=true)
                            flex: {
                                label: { ko: 'Flex 컨테이너' },
                                displayWhen: {
                                    all: [
                                        { value: 'display', is: 'flex' },
                                        { context: 'isContainer', is: true }
                                    ]
                                },
                                properties: {
                                    flexDirection: {
                                        label: { ko: '방향' },
                                        control: 'icons',
                                        options: [
                                            { value: 'row',           iconKey: 'layout.flexDirection:row' },
                                            { value: 'row-reverse',   iconKey: 'layout.flexDirection:row-reverse' },
                                            { value: 'column',        iconKey: 'layout.flexDirection:column' },
                                            { value: 'column-reverse',iconKey: 'layout.flexDirection:column-reverse' },
                                        ],
                                        ui: { size: 'xs', columns: 4 }
                                    },
                                    justifyContent: {
                                        label: { ko: '주축 정렬' },
                                        control: 'icons',
                                        options: [
                                            { value: 'flex-start',   iconKey: 'layout.justifyContent:flex-start' },
                                            { value: 'center',       iconKey: 'layout.justifyContent:center' },
                                            { value: 'flex-end',     iconKey: 'layout.justifyContent:flex-end' },
                                            { value: 'space-between',iconKey: 'layout.justifyContent:space-between' },
                                            { value: 'space-around', iconKey: 'layout.justifyContent:space-around' },
                                            { value: 'space-evenly', iconKey: 'layout.justifyContent:space-evenly' },
                                        ],
                                        ui: { size: 'xs', columns: 3 }
                                    },
                                    alignItems: {
                                        label: { ko: '교차축 정렬' },
                                        control: 'icons',
                                        options: [
                                            { value: 'flex-start', iconKey: 'layout.alignItems:flex-start' },
                                            { value: 'center',     iconKey: 'layout.alignItems:center' },
                                            { value: 'flex-end',   iconKey: 'layout.alignItems:flex-end' },
                                            { value: 'stretch',    iconKey: 'layout.alignItems:stretch' },
                                        ],
                                        ui: { size: 'xs', columns: 4 }
                                    },
                                    flexWrap: {
                                        label: { ko: '줄바꿈' },
                                        control: 'select',
                                        options: [{ value: 'nowrap' }, { value: 'wrap' }, { value: 'wrap-reverse' }],
                                        ui: { size: 'sm', width: 120, variant: 'native' }
                                    },
                                    gap: {
                                        label: { ko: '간격' },
                                        control: 'chips',
                                        options: [{ value: 'auto' }, { value: '1' }, { value: '2' }, { value: '4' }],
                                        ui: {
                                            size: 'xs',
                                            extraInput: { enabled: true, type: 'text', size: 'xs', width: 48, placeholder: 'ex) 10px' }
                                        }
                                    },
                                }
                            },

                            // Grid 컨테이너 (display=grid AND isContainer=true)
                            grid: {
                                label: { ko: 'Grid 컨테이너' },
                                displayWhen: {
                                    all: [
                                        { value: 'display', is: 'grid' },
                                        { context: 'isContainer', is: true }
                                    ]
                                },
                                properties: {
                                    gridTemplateColumns: {
                                        label: { ko: '열 개수' },
                                        control: 'chips',
                                        options: [
                                            { value: 'auto' },
                                            { value: 'repeat(1,1fr)' }, { value: 'repeat(2,1fr)' }, { value: 'repeat(3,1fr)' },
                                            { value: 'repeat(4,1fr)' }, { value: 'repeat(5,1fr)' },
                                        ],
                                        placeholder: 'repeat(n,1fr)',
                                        ui: { size: 'xs', extraInput: { enabled: true, size: 'xs', width: 110, placeholder: 'repeat(6,1fr)' } }
                                    },
                                    gridTemplateRows: {
                                        label: { ko: '행 개수' },
                                        control: 'chips',
                                        options: [
                                            { value: 'auto' },
                                            { value: 'repeat(1,1fr)' }, { value: 'repeat(2,1fr)' }, { value: 'repeat(3,1fr)' },
                                            { value: 'repeat(4,1fr)' }, { value: 'repeat(5,1fr)' },
                                        ],
                                        placeholder: 'repeat(n,1fr)',
                                        ui: { size: 'xs', extraInput: { enabled: true, size: 'xs', width: 110, placeholder: 'repeat(6,1fr)' } }
                                    },
                                    justifyItems: {
                                        label: { ko: '가로 정렬' },
                                        control: 'select',
                                        options: [{ value: 'stretch' }, { value: 'start' }, { value: 'center' }, { value: 'end' }],
                                        ui: { size: 'sm', width: 120 }
                                    },
                                    alignItems: {
                                        label: { ko: '세로 정렬' },
                                        control: 'select',
                                        options: [{ value: 'stretch' }, { value: 'start' }, { value: 'center' }, { value: 'end' }],
                                        ui: { size: 'sm', width: 120 }
                                    },
                                }
                            },

                            // Flex 아이템 (부모가 flex일 때)
                            '*:flex-item': {
                                label: { ko: 'Flex 아이템' },
                                displayWhen: { context: 'parentDisplay', is: 'flex' },
                                properties: {
                                    alignSelf: {
                                        label: { ko: '개별 정렬' },
                                        control: 'select',
                                        options: [{ value: 'auto' }, { value: 'flex-start' }, { value: 'center' }, { value: 'flex-end' }, { value: 'stretch' }],
                                        ui: { size: 'sm', width: 140 }
                                    },
                                    order: {
                                        label: { ko: '순서' },
                                        control: 'input',
                                        placeholder: '0',
                                        ui: { size: 'xs', width: 80, inputType: 'number' }
                                    },
                                    flex: {
                                        label: { ko: '성장/축소/기준' },
                                        control: 'input',
                                        placeholder: '1 1 auto',
                                        ui: { size: 'xs', width: 140 }
                                    },
                                }
                            },

                            // Grid 아이템 (부모가 grid일 때)
                            '*:grid-item': {
                                label: { ko: 'Grid 아이템' },
                                displayWhen: { context: 'parentDisplay', is: 'grid' },
                                properties: {
                                    gridColumn: {
                                        label: { ko: '열 범위' },
                                        control: 'input',
                                        placeholder: '1 / 3',
                                        ui: { size: 'xs', width: 100 }
                                    },
                                    gridRow: {
                                        label: { ko: '행 범위' },
                                        control: 'input',
                                        placeholder: '1 / 2',
                                        ui: { size: 'xs', width: 100 }
                                    },
                                    justifySelf: {
                                        label: { ko: '가로 정렬(개별)' },
                                        control: 'select',
                                        options: [{ value: 'start' }, { value: 'center' }, { value: 'end' }, { value: 'stretch' }],
                                        ui: { size: 'sm', width: 120 }
                                    },
                                    alignSelf: {
                                        label: { ko: '세로 정렬(개별)' },
                                        control: 'select',
                                        options: [{ value: 'start' }, { value: 'center' }, { value: 'end' }, { value: 'stretch' }],
                                        ui: { size: 'sm', width: 120 }
                                    },
                                }
                            },
                        }
                    },

                    overflow: {
                        label: { ko: '오버플로우' },
                        control: 'select',
                        options: [{ value: 'visible' }, { value: 'hidden' }, { value: 'scroll' }, { value: 'auto' }],
                        ui: { lockUnit: true, size: 'sm', width: 140 }
                    },
                }
            },

            Sizing: {
                properties: {
                    width: {
                        label: { ko: '너비' },
                        control: 'chips',
                        options: [{ value: 'auto' }],
                        placeholder: 'ex) 320px / 50%',
                        ui: { lockUnit: true, size: 'xs', extraInput: { enabled: true, size: 'xs', width: 120, placeholder: 'ex) 320px' } }
                    },
                    height: {
                        label: { ko: '높이' },
                        control: 'chips',
                        options: [{ value: 'auto' }],
                        placeholder: 'ex) 200px / 50%',
                        ui: { lockUnit: true, size: 'xs', extraInput: { enabled: true, size: 'xs', width: 120, placeholder: 'ex) 200px' } }
                    },
                    aspectRatio: {
                        label: { ko: '종횡비' },
                        control: 'ratio',
                        presets: [{ value: '1/1', label: '1:1' }, { value: '16/9', label: '16:9' }],
                        placeholder: 'ex) 4/3',
                        ui: { size: 'xs', width: 120 }
                    },
                    boxSizing: {
                        label: { ko: '크기 계산' },
                        control: 'select',
                        options: [{ value: 'content-box' }, { value: 'border-box' }],
                        ui: { size: 'sm', width: 140 }
                    },
                }
            },

            Spacing: {
                properties: {
                    padding: {
                        label: { ko: '패딩' },
                        control: 'chips',
                        options: [{ value: '0' }, { value: '2px' }, { value: '4px' }, { value: '8px' }, { value: '16px' }],
                        ui: { lockUnit: true, size: 'xs', extraInput: { enabled: true, size: 'xs', width: 90, placeholder: 'ex) 12px' } },
                        detailProperties: {
                            paddingTop:    { label: { ko: '위' },   control: 'input', ui: { size: 'xs', width: 90 } },
                            paddingRight:  { label: { ko: '오른쪽' }, control: 'input', ui: { size: 'xs', width: 90 } },
                            paddingBottom: { label: { ko: '아래' }, control: 'input', ui: { size: 'xs', width: 90 } },
                            paddingLeft:   { label: { ko: '왼쪽' }, control: 'input', ui: { size: 'xs', width: 90 } },
                        }
                    },
                    margin: {
                        label: { ko: '마진' },
                        control: 'chips',
                        options: [{ value: '0' }, { value: '2px' }, { value: '4px' }, { value: '8px' }, { value: '16px' }],
                        ui: { lockUnit: true, size: 'xs', extraInput: { enabled: true, size: 'xs', width: 90, placeholder: 'ex) 12px' } },
                        detailProperties: {
                            marginTop:    { label: { ko: '위' },   control: 'input', ui: { size: 'xs', width: 90 } },
                            marginRight:  { label: { ko: '오른쪽' }, control: 'input', ui: { size: 'xs', width: 90 } },
                            marginBottom: { label: { ko: '아래' }, control: 'input', ui: { size: 'xs', width: 90 } },
                            marginLeft:   { label: { ko: '왼쪽' }, control: 'input', ui: { size: 'xs', width: 90 } },
                        }
                    },
                    gap: {
                        label: { ko: '간격' },
                        control: 'chips',
                        options: [{ value: '0' }, { value: '2px' }, { value: '4px' }, { value: '8px' }, { value: '16px' }],
                        ui: { size: 'xs', extraInput: { enabled: true, size: 'xs', width: 90, placeholder: 'ex) 12px' } }
                    },
                }
            },
        }
    },

    Typography: {
        label: { ko: '서체', en: 'Typography' },
        groups: {
            Font: {
                properties: {
                    fontFamily: {
                        label: { ko: '글꼴' },
                        control: 'select',
                        options: [{ value: 'Inter' }, { value: 'Pretendard' }, { value: 'Noto Sans' }],
                        ui: { size: 'sm', width: 160 }
                    },
                    fontSize: {
                        label: { ko: '크기' },
                        control: 'chips',
                        options: [{ value: '10px' }, { value: '12px' }, { value: '14px' }, { value: '16px' }, { value: '20px' }],
                        ui: { size: 'xs', extraInput: { enabled: true, size: 'xs', width: 80, placeholder: 'ex) 18px' } }
                    },
                    fontStyle: {
                        label: { ko: '스타일' },
                        control: 'select',
                        options: [{ value: 'normal' }, { value: 'italic' }, { value: 'oblique' }],
                        ui: { size: 'sm', width: 120 }
                    },
                    fontWeight: {
                        label: { ko: '굵기' },
                        control: 'select',
                        options: [{ value: '300' }, { value: '400' }, { value: '500' }, { value: '700' }],
                        ui: { size: 'sm', width: 120 }
                    },
                    color: {
                        label: { ko: '글자색' },
                        control: 'color',
                        ui: { size: 'sm' }
                    },
                }
            },
            Text: {
                properties: {
                    textAlign: {
                        label: { ko: '정렬' },
                        control: 'icons',
                        options: [
                            { value: 'left',    iconKey: 'typography.textAlign:left' },
                            { value: 'center',  iconKey: 'typography.textAlign:center' },
                            { value: 'right',   iconKey: 'typography.textAlign:right' },
                            { value: 'justify', iconKey: 'typography.textAlign:justify' },
                        ],
                        ui: { size: 'xs', columns: 4 }
                    },
                    lineHeight: {
                        label: { ko: '줄 높이' },
                        control: 'chips',
                        options: [{ value: '1' }, { value: '1.2' }, { value: '1.5' }, { value: '2' }],
                        ui: { size: 'xs', extraInput: { enabled: true, size: 'xs', width: 80, placeholder: '1.4 / 20px' } }
                    },
                    letterSpacing: {
                        label: { ko: '자간' },
                        control: 'chips',
                        options: [{ value: '0' }, { value: '0.5px' }, { value: '1px' }],
                        ui: { size: 'xs', extraInput: { enabled: true, size: 'xs', width: 80, placeholder: 'ex) 0.2px' } }
                    },
                    textTransform: {
                        label: { ko: '대소문자' },
                        control: 'select',
                        options: [{ value: 'none' }, { value: 'capitalize' }, { value: 'uppercase' }, { value: 'lowercase' }],
                        ui: { size: 'sm', width: 140 }
                    },
                    textDecoration: {
                        label: { ko: '장식' },
                        control: 'select',
                        options: [{ value: 'none' }, { value: 'underline' }, { value: 'line-through' }],
                        ui: { size: 'sm', width: 140 }
                    },
                }
            },
            'Content Flow': {
                properties: {
                    whiteSpace: {
                        label: { ko: '공백 처리' },
                        control: 'select',
                        options: [{ value: 'normal' }, { value: 'nowrap' }, { value: 'pre' }, { value: 'pre-wrap' }],
                        ui: { size: 'sm', width: 160 }
                    },
                    wordBreak: {
                        label: { ko: '줄바꿈' },
                        control: 'select',
                        options: [{ value: 'normal' }, { value: 'break-all' }, { value: 'keep-all' }],
                        ui: { size: 'sm', width: 140 }
                    },
                    textOverflow: {
                        label: { ko: '넘침 표시' },
                        control: 'select',
                        options: [{ value: 'clip' }, { value: 'ellipsis' }],
                        ui: { size: 'sm', width: 140 }
                    },
                }
            },
        }
    },

    Appearance: {
        label: { ko: '모양', en: 'Appearance' },
        groups: {
            Fill: {
                properties: {
                    backgroundColor: {
                        label: { ko: '배경색' },
                        control: 'color',
                        ui: { lockUnit: true, size: 'sm' }
                    },
                    background: {
                        label: { ko: '배경 상세' },
                        control: 'input',
                        shorthand: {
                            enabled: true,
                            layered: true,
                            layerLimit: 1,
                            syntax: '<color> | <image> <position> / <size> repeat | ...',
                            longhandKeys: ['backgroundImage','backgroundPosition','backgroundSize','backgroundRepeat','backgroundClip','backgroundOrigin','backgroundAttachment']
                        },
                        detailProperties: {
                            backgroundImage: {
                                label: { ko: '이미지' },
                                control: 'input',
                                placeholder: 'url(...) / none',
                                dependentProperties: {
                                    '*': {
                                        label: { ko: '이미지 설정' },
                                        properties: {
                                            backgroundSize: {
                                                label: { ko: '크기' },
                                                control: 'select',
                                                options: [{ value: 'auto' }, { value: 'cover' }, { value: 'contain' }],
                                                ui: { size: 'sm', width: 140 }
                                            },
                                            backgroundRepeat: {
                                                label: { ko: '반복' },
                                                control: 'select',
                                                options: [{ value: 'repeat' }, { value: 'no-repeat' }, { value: 'repeat-x' }, { value: 'repeat-y' }],
                                                ui: { size: 'sm', width: 140 }
                                            },
                                            backgroundPosition: {
                                                label: { ko: '위치' },
                                                control: 'input',
                                                placeholder: 'ex) 50% 50%',
                                                ui: { size: 'sm', width: 140 }
                                            },
                                            backgroundClip: {
                                                label: { ko: '클립' },
                                                control: 'select',
                                                options: [{ value: 'border-box' }, { value: 'padding-box' }, { value: 'content-box' }],
                                                ui: { size: 'sm', width: 140 }
                                            },
                                            backgroundOrigin: {
                                                label: { ko: '기원' },
                                                control: 'select',
                                                options: [{ value: 'padding-box' }, { value: 'border-box' }, { value: 'content-box' }],
                                                ui: { size: 'sm', width: 140 }
                                            },
                                            backgroundAttachment: {
                                                label: { ko: '고정' },
                                                control: 'select',
                                                options: [{ value: 'scroll' }, { value: 'fixed' }, { value: 'local' }],
                                                ui: { size: 'sm', width: 140 }
                                            },
                                        }
                                    }
                                }
                            }
                        }
                    },
                }
            },

            Border: {
                properties: {
                    border: {
                        label: { ko: '테두리' },
                        control: 'chips',
                        options: [{ value: '1px solid currentColor' }, { value: '2px solid currentColor' }],
                        shorthand: {
                            enabled: true,
                            syntax: '<width> || <style> || <color>',
                            examples: ['1px solid #000'],
                            longhandKeys: ['borderWidth','borderStyle','borderColor']
                        },
                        detailProperties: {
                            borderWidth: {
                                label: { ko: '두께' },
                                control: 'chips',
                                options: [{ value: '1px' }, { value: '2px' }, { value: '4px' }, { value: '8px' }, { value: '16px' }],
                                ui: { size: 'xs', extraInput: { enabled: true, size: 'xs', width: 80 } }
                            },
                            borderStyle: {
                                label: { ko: '스타일' },
                                control: 'select',
                                options: [{ value: 'none' }, { value: 'solid' }, { value: 'dashed' }, { value: 'dotted' }],
                                ui: { size: 'sm', width: 120 }
                            },
                            borderColor: {
                                label: { ko: '색상' },
                                control: 'color',
                                ui: { size: 'sm' }
                            },
                        }
                    },
                    borderRadius: {
                        label: { ko: '모서리' },
                        control: 'chips',
                        options: [{ value: '0' }, { value: '2px' }, { value: '4px' }, { value: '8px' }, { value: '16px' }],
                        ui: { size: 'xs', extraInput: { enabled: true, size: 'xs', width: 80 } },
                        detailProperties: {
                            borderTopLeftRadius:     { label: { ko: '좌상' }, control: 'input', ui: { size: 'xs', width: 80 } },
                            borderTopRightRadius:    { label: { ko: '우상' }, control: 'input', ui: { size: 'xs', width: 80 } },
                            borderBottomRightRadius: { label: { ko: '우하' }, control: 'input', ui: { size: 'xs', width: 80 } },
                            borderBottomLeftRadius:  { label: { ko: '좌하' }, control: 'input', ui: { size: 'xs', width: 80 } },
                        }
                    },
                    outline: {
                        label: { ko: '외곽선' },
                        control: 'chips',
                        options: [{ value: '1px solid currentColor' }],
                        shorthand: {
                            enabled: true,
                            syntax: '<outline-width> || <outline-style> || <outline-color>',
                            examples: ['1px solid #000'],
                            longhandKeys: ['outlineWidth','outlineStyle','outlineColor']
                        },
                        detailProperties: {
                            outlineWidth: { label: { ko: '두께' }, control: 'chips',
                                options: [{ value: '0' }, { value: '2px' }, { value: '4px' }, { value: '8px' }, { value: '16px' }],
                                ui: { size: 'xs', extraInput: { enabled: true, size: 'xs', width: 80 } }
                            },
                            outlineStyle: { label: { ko: '스타일' }, control: 'select',
                                options: [{ value: 'none' }, { value: 'solid' }, { value: 'dashed' }, { value: 'dotted' }],
                                ui: { size: 'sm', width: 120 }
                            },
                            outlineColor: { label: { ko: '색상' }, control: 'color', ui: { size: 'sm' } },
                        }
                    },
                    opacity: {
                        label: { ko: '투명도' },
                        control: 'chips',
                        options: [{ value: '0' }, { value: '0.25' }, { value: '0.75' }, { value: '1' }],
                        ui: { size: 'xs', extraInput: { enabled: true, size: 'xs', width: 80, placeholder: '0~1' } }
                    },
                }
            },
        }
    },

    Effects: {
        label: { ko: '효과', en: 'Effects' },
        groups: {
            Visual: {
                properties: {
                    opacity: {
                        label: { ko: '투명도' },
                        control: 'chips',
                        options: [{ value: '0' }, { value: '0.25' }, { value: '0.5' }, { value: '0.75' }, { value: '1' }],
                        ui: { size: 'xs', extraInput: { enabled: true, size: 'xs', width: 80, placeholder: '0~1' } }
                    },
                    filter: {
                        label: { ko: '그래픽 효과' },
                        control: 'chips',
                        options: [
                            { value: 'none' },
                            { value: 'blur(4px)' },
                            { value: 'brightness(0.9)' },
                            { value: 'contrast(1.2)' },
                            { value: 'grayscale(1)' },
                        ],
                        shorthand: {
                            enabled: true,
                            layered: true,
                            layerLimit: 1,
                            syntax: '<filter-function-list>',
                            longhandKeys: ['blur','brightness','contrast','grayscale','hue-rotate','invert','saturate','sepia','drop-shadow']
                        },
                        detailProperties: {
                            blur:         { label: { ko: '블러' },        control: 'input', ui: { size: 'xs', width: 100 }, placeholder: 'blur(6px)' },
                            brightness:   { label: { ko: '밝기' },        control: 'input', ui: { size: 'xs', width: 100 }, placeholder: 'brightness(1.1)' },
                            contrast:     { label: { ko: '대비' },        control: 'input', ui: { size: 'xs', width: 100 }, placeholder: 'contrast(1.2)' },
                            grayscale:    { label: { ko: '그레이스케일' }, control: 'input', ui: { size: 'xs', width: 100 }, placeholder: 'grayscale(1)' },
                            'hue-rotate': { label: { ko: '색상 회전' },   control: 'input', ui: { size: 'xs', width: 120 }, placeholder: 'hue-rotate(30deg)' },
                            invert:       { label: { ko: '반전' },        control: 'input', ui: { size: 'xs', width: 100 }, placeholder: 'invert(1)' },
                            saturate:     { label: { ko: '채도' },        control: 'input', ui: { size: 'xs', width: 100 }, placeholder: 'saturate(1.2)' },
                            sepia:        { label: { ko: '세피아' },      control: 'input', ui: { size: 'xs', width: 100 }, placeholder: 'sepia(1)' },
                            'drop-shadow':{ label: { ko: '드롭 섀도' },   control: 'input', ui: { size: 'xs', width: 140 }, placeholder: 'drop-shadow(0 2px 6px #0003)' },
                        }
                    },
                    mixBlendMode: {
                        label: { ko: '블렌드' },
                        control: 'select',
                        options: [
                            { value: 'normal' }, { value: 'multiply' }, { value: 'screen' },
                            { value: 'overlay' }, { value: 'darken' }, { value: 'lighten' },
                            { value: 'color-dodge' }, { value: 'color-burn' }, { value: 'hard-light' },
                            { value: 'soft-light' }, { value: 'difference' }, { value: 'exclusion' },
                            { value: 'hue' }, { value: 'saturation' }, { value: 'color' }, { value: 'luminosity' },
                        ],
                        ui: { size: 'sm', width: 170 }
                    },
                }
            },

            Transform: {
                properties: {
                    transform: {
                        label: { ko: '변형' },
                        control: 'chips',
                        options: [{ value: 'none' }, { value: 'scale(1.05)' }, { value: 'rotate(5deg)' }, { value: 'translate(0, 4px)' }],
                        shorthand: {
                            enabled: true,
                            layered: true,
                            layerLimit: 1,
                            syntax: '<transform-function>+',
                            longhandKeys: ['translate','translateX','translateY','scale','scaleX','scaleY','rotate','skew','skewX','skewY']
                        },
                        detailProperties: {
                            translate:  { label: { ko: '이동' },   control: 'input', ui: { size: 'xs', width: 140 }, placeholder: 'translate(10px, 0)' },
                            translateX: { label: { ko: '이동 X' }, control: 'input', ui: { size: 'xs', width: 120 }, placeholder: 'translateX(8px)' },
                            translateY: { label: { ko: '이동 Y' }, control: 'input', ui: { size: 'xs', width: 120 }, placeholder: 'translateY(8px)' },
                            scale:      { label: { ko: '스케일' }, control: 'input', ui: { size: 'xs', width: 120 }, placeholder: 'scale(1.1)' },
                            rotate:     { label: { ko: '회전' },   control: 'input', ui: { size: 'xs', width: 120 }, placeholder: 'rotate(10deg)' },
                            skew:       { label: { ko: '기울임' }, control: 'input', ui: { size: 'xs', width: 120 }, placeholder: 'skew(5deg, 0)' },
                        }
                    },
                    transformOrigin: {
                        label: { ko: '기준점' },
                        control: 'input',
                        placeholder: '50% 50% / center',
                        ui: { size: 'xs', width: 140 }
                    },
                    perspective: {
                        label: { ko: '원근' },
                        control: 'input',
                        placeholder: '600px',
                        ui: { size: 'xs', width: 100 }
                    },
                }
            },

            Transition: {
                properties: {
                    transition: {
                        label: { ko: '전환 효과' },
                        control: 'chips',
                        options: [{ value: 'all 150ms ease-out' }, { value: 'opacity 200ms ease-in' }],
                        shorthand: {
                            enabled: true,
                            layered: true,
                            layerLimit: 1,
                            syntax: '<property> <duration> <timing-function>? <delay>?',
                            longhandKeys: ['transitionProperty','transitionDuration','transitionTimingFunction','transitionDelay']
                        },
                        detailProperties: {
                            transitionProperty:        { label: { ko: '대상 속성' }, control: 'input', ui: { size: 'xs', width: 140 }, placeholder: 'opacity, transform' },
                            transitionDuration:        { label: { ko: '지속' },     control: 'input', ui: { size: 'xs', width: 100 }, placeholder: '200ms' },
                            transitionTimingFunction:  { label: { ko: '속도 곡선' }, control: 'select',
                                options: [{ value: 'ease' }, { value: 'linear' }, { value: 'ease-in' }, { value: 'ease-out' }, { value: 'ease-in-out' }],
                                ui: { size: 'xs', width: 140 }
                            },
                            transitionDelay:           { label: { ko: '지연' },     control: 'input', ui: { size: 'xs', width: 100 }, placeholder: '0ms' },
                        }
                    }
                }
            },
        }
    },

    Interactivity: {
        label: { ko: '상호작용', en: 'Interactivity' },
        groups: {
            'User Interaction': {
                properties: {
                    cursor: {
                        label: { ko: '커서' },
                        control: 'select',
                        options: [{ value: 'auto' }, { value: 'default' }, { value: 'pointer' }, { value: 'text' }, { value: 'move' }],
                        ui: { size: 'sm', width: 140 }
                    },
                    pointerEvents: {
                        label: { ko: '포인터 이벤트' },
                        control: 'select',
                        options: [{ value: 'auto' }, { value: 'none' }],
                        ui: { size: 'sm', width: 140 }
                    },
                    userSelect: {
                        label: { ko: '텍스트 선택' },
                        control: 'select',
                        options: [{ value: 'auto' }, { value: 'text' }, { value: 'none' }],
                        ui: { size: 'sm', width: 140 }
                    },
                }
            }
        }
    },
};