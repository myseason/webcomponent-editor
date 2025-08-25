'use client';
/**
 * StylesSection (완성판 1차)
 * - 템플릿 InspectorFilter(전문가 모드면 무시) + TagPolicy(항상 적용) 기반으로
 *   허용된 스타일만 노출/편집
 * - 그룹:
 *   1) Layout     2) Background     3) Spacing
 *   4) Border     5) Effects        6) Typography
 *   7) Custom (허용된 CSS 키만 추가 가능)
 *
 * 레이아웃 가드:
 *  - display === 'inline' → width/height 숨김
 *  - position === 'static' → top/left/right/bottom 숨김
 *
 * 규칙: 훅 최상위, any 금지, 얕은 복사 update 시그니처 사용
 */

import React from 'react';
import { useEditor } from '../../useEditor';
import type {
    CSSDict,
    EditorState,
    InspectorFilter,
    NodeId,
    NodePropsWithMeta,
    TagPolicyMap,
} from '../../../core/types';
import {
    filterStyleKeysByTemplateAndTag,
    getTagPolicy,
    isContainerTag,
} from '../../../runtime/capabilities';

/* ──────────────────────────────
 * 공통 작은 컴포넌트/유틸
 * ────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <div className="text-[11px] font-semibold text-gray-600 mb-1">{children}</div>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 mb-2">
            <div className="w-40 text-[12px] text-gray-600">{label}</div>
            <div className="flex-1">{children}</div>
        </div>
    );
}

/** 공통: raw 문자열 입력(예: 100%, 240px, auto 등) */
function TextStyleField({
                            value,
                            placeholder,
                            onChange,
                        }: {
    value: string | number | undefined;
    placeholder?: string;
    onChange: (next: string) => void;
}) {
    return (
        <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={value === undefined ? '' : String(value)}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />
    );
}

/** 선택형 필드 */
function SelectStyleField({
                              value,
                              options,
                              onChange,
                          }: {
    value: string | undefined;
    options: string[];
    onChange: (next: string) => void;
}) {
    return (
        <select
            className="w-full border rounded px-2 py-1 text-sm bg-white"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
        >
            {value === undefined && <option value="">(unset)</option>}
            {options.map((op) => (
                <option key={op} value={op}>
                    {op}
                </option>
            ))}
        </select>
    );
}

/** 컬러 필드 */
function ColorField({
                        value,
                        onChange,
                    }: {
    value: string | undefined;
    onChange: (next: string) => void;
}) {
    const safe = typeof value === 'string' && value.startsWith('#') && (value.length === 7 || value.length === 4)
        ? value
        : '#ffffff';
    return (
        <input
            type="color"
            className="h-8 w-12 border rounded"
            value={safe}
            onChange={(e) => onChange(e.target.value)}
            title={value ?? ''}
        />
    );
}

/* ──────────────────────────────
 * 본문
 * ────────────────────────────── */

export function StylesSection() {
    const state = useEditor();
    const nodeId: NodeId = state.ui.selectedId ?? state.project.rootId;
    const node = state.project.nodes[nodeId];

    const props = (node.props as NodePropsWithMeta) ?? {};
    const tag = props.__tag ?? 'div';

    const expertMode = Boolean(state.ui.expertMode);
    const templateFilter: InspectorFilter | undefined = state.project.inspectorFilters?.[node.componentId];

    const projectPolicies: TagPolicyMap | undefined = state.project.tagPolicies;
    const tagPolicy = getTagPolicy(tag, projectPolicies);

    // 현재 element 스타일 스냅샷
    const el = (node.styles?.element ?? {}) as CSSDict;

    // 그룹별 후보 키
    const LAYOUT_KEYS = [
        'display',
        'position',
        'width',
        'height',
        'overflow',
        'top',
        'left',
        'right',
        'bottom',
    ];
    const BG_KEYS = ['backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundRepeat', 'backgroundPosition'];
    const SPACING_KEYS = ['margin', 'padding'];
    const BORDER_KEYS = [
        'border',
        'borderWidth',
        'borderStyle',
        'borderColor',
        'borderRadius',
    ];
    const EFFECT_KEYS = ['boxShadow', 'opacity', 'filter'];
    const TYPO_KEYS = [
        'color',
        'fontFamily',
        'fontSize',
        'fontWeight',
        'lineHeight',
        'letterSpacing',
        'textAlign',
        'textDecoration',
    ];

    // 템플릿/태그 정책 교차 필터 (전문가 모드면 템플릿 필터 무시, TagPolicy는 적용)
    const allow = (keys: string[]) =>
        new Set(filterStyleKeysByTemplateAndTag(keys, templateFilter, tag, state.project.tagPolicies, expertMode));

    const layoutAllowed = allow(LAYOUT_KEYS);
    const bgAllowed = allow(BG_KEYS);
    const spacingAllowed = allow(SPACING_KEYS);
    const borderAllowed = allow(BORDER_KEYS);
    const effectAllowed = allow(EFFECT_KEYS);
    const typoAllowed = allow(TYPO_KEYS);

    // 레이아웃 가드
    const display = (el.display as string) ?? 'block';
    const position = (el.position as string) ?? 'static';
    const isInline = display === 'inline';
    const isStatic = position === 'static';

    // 컨테이너 여부(참고 안내)
    const container = isContainerTag(tag, tagPolicy);

    // 저장 유틸
    const patch = (kv: CSSDict) => {
        state.updateNodeStyles(nodeId, { element: kv });
    };

    // CUSTOM 그룹에서 사용하는 "허용 스타일 키 판단" 헬퍼
    const isStyleKeyAllowed = (key: string): boolean => {
        const res = filterStyleKeysByTemplateAndTag([key], templateFilter, tag, state.project.tagPolicies, expertMode);
        return res.length > 0;
    };

    // CUSTOM UI 로컬 상태
    const [newKey, setNewKey] = React.useState<string>('');
    const [newVal, setNewVal] = React.useState<string>('');
    const onAddCustom = () => {
        const key = newKey.trim();
        if (!key) return;
        if (!isStyleKeyAllowed(key)) {
            alert(`'${key}' 스타일은 현재 태그/정책에서 허용되지 않습니다.`);
            return;
        }
        patch({ [key]: newVal } as CSSDict);
        setNewKey('');
        setNewVal('');
    };

    // 이미 사용 중인 키 중 "표준 그룹"에 속한 것들을 제외하고 남은 것이 커스텀 후보
    const STANDARD_KEYS = new Set([
        ...LAYOUT_KEYS,
        ...BG_KEYS,
        ...SPACING_KEYS,
        ...BORDER_KEYS,
        ...EFFECT_KEYS,
        ...TYPO_KEYS,
    ]);
    const customEntries = Object.entries(el).filter(([k]) => !STANDARD_KEYS.has(k));

    /* ──────────────────────────────
     * 렌더
     * ────────────────────────────── */

    return (
        <div className="px-2 pt-2">
            {/* Layout */}
            <SectionTitle>Layout</SectionTitle>
            <div className="mb-3">
                {/* display */}
                {layoutAllowed.has('display') && (
                    <Row label="display">
                        <SelectStyleField
                            value={(el.display as string) ?? 'block'}
                            options={['block', 'inline', 'inline-block', 'flex', 'grid']}
                            onChange={(v) => patch({ display: v })}
                        />
                    </Row>
                )}

                {/* position */}
                {layoutAllowed.has('position') && (
                    <Row label="position">
                        <SelectStyleField
                            value={(el.position as string) ?? 'static'}
                            options={['static', 'relative', 'absolute', 'fixed', 'sticky']}
                            onChange={(v) => patch({ position: v })}
                        />
                    </Row>
                )}

                {/* width / height (inline이면 숨김) */}
                {!isInline && layoutAllowed.has('width') && (
                    <Row label="width">
                        <TextStyleField value={el.width} placeholder="e.g. 100%, 240px" onChange={(v) => patch({ width: v })} />
                    </Row>
                )}
                {!isInline && layoutAllowed.has('height') && (
                    <Row label="height">
                        <TextStyleField value={el.height} placeholder="e.g. auto, 320px" onChange={(v) => patch({ height: v })} />
                    </Row>
                )}

                {/* top/left/right/bottom (position:static이면 숨김) */}
                {!isStatic && layoutAllowed.has('top') && (
                    <Row label="top">
                        <TextStyleField value={el.top} placeholder="e.g. 0, 12px" onChange={(v) => patch({ top: v })} />
                    </Row>
                )}
                {!isStatic && layoutAllowed.has('left') && (
                    <Row label="left">
                        <TextStyleField value={el.left} placeholder="e.g. 0, 12px" onChange={(v) => patch({ left: v })} />
                    </Row>
                )}
                {!isStatic && layoutAllowed.has('right') && (
                    <Row label="right">
                        <TextStyleField value={el.right} placeholder="e.g. 0, 12px" onChange={(v) => patch({ right: v })} />
                    </Row>
                )}
                {!isStatic && layoutAllowed.has('bottom') && (
                    <Row label="bottom">
                        <TextStyleField value={el.bottom} placeholder="e.g. 0, 12px" onChange={(v) => patch({ bottom: v })} />
                    </Row>
                )}

                {/* overflow */}
                {layoutAllowed.has('overflow') && (
                    <Row label="overflow">
                        <SelectStyleField
                            value={(el.overflow as string) ?? 'visible'}
                            options={['visible', 'hidden', 'scroll', 'auto']}
                            onChange={(v) => patch({ overflow: v })}
                        />
                    </Row>
                )}
            </div>

            {/* Background */}
            <SectionTitle>Background</SectionTitle>
            <div className="mb-3">
                {bgAllowed.has('backgroundColor') && (
                    <Row label="backgroundColor">
                        <ColorField value={typeof el.backgroundColor === 'string' ? (el.backgroundColor as string) : undefined} onChange={(v) => patch({ backgroundColor: v })} />
                    </Row>
                )}
                {bgAllowed.has('backgroundImage') && (
                    <Row label="backgroundImage">
                        <TextStyleField
                            value={el.backgroundImage}
                            placeholder='e.g. url("/path.png")'
                            onChange={(v) => patch({ backgroundImage: v })}
                        />
                    </Row>
                )}
                {bgAllowed.has('backgroundSize') && (
                    <Row label="backgroundSize">
                        <SelectStyleField
                            value={(el.backgroundSize as string) ?? 'auto'}
                            options={['auto', 'cover', 'contain']}
                            onChange={(v) => patch({ backgroundSize: v })}
                        />
                    </Row>
                )}
                {bgAllowed.has('backgroundRepeat') && (
                    <Row label="backgroundRepeat">
                        <SelectStyleField
                            value={(el.backgroundRepeat as string) ?? 'repeat'}
                            options={['repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'space', 'round']}
                            onChange={(v) => patch({ backgroundRepeat: v })}
                        />
                    </Row>
                )}
                {bgAllowed.has('backgroundPosition') && (
                    <Row label="backgroundPosition">
                        <SelectStyleField
                            value={(el.backgroundPosition as string) ?? 'center'}
                            options={['left top','left center','left bottom','center top','center','center bottom','right top','right center','right bottom']}
                            onChange={(v) => patch({ backgroundPosition: v })}
                        />
                    </Row>
                )}
            </div>

            {/* Spacing */}
            <SectionTitle>Spacing</SectionTitle>
            <div className="mb-3">
                {spacingAllowed.has('margin') && (
                    <Row label="margin">
                        <TextStyleField value={el.margin} placeholder="e.g. 0 auto" onChange={(v) => patch({ margin: v })} />
                    </Row>
                )}
                {spacingAllowed.has('padding') && (
                    <Row label="padding">
                        <TextStyleField value={el.padding} placeholder="e.g. 8px 12px" onChange={(v) => patch({ padding: v })} />
                    </Row>
                )}
            </div>

            {/* Border */}
            <SectionTitle>Border</SectionTitle>
            <div className="mb-3">
                {borderAllowed.has('border') && (
                    <Row label="border">
                        <TextStyleField value={el.border} placeholder="e.g. 1px solid #ddd" onChange={(v) => patch({ border: v })} />
                    </Row>
                )}
                {borderAllowed.has('borderWidth') && (
                    <Row label="borderWidth">
                        <TextStyleField value={el.borderWidth} placeholder="e.g. 1px" onChange={(v) => patch({ borderWidth: v })} />
                    </Row>
                )}
                {borderAllowed.has('borderStyle') && (
                    <Row label="borderStyle">
                        <SelectStyleField
                            value={el.borderStyle as string | undefined}
                            options={['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset']}
                            onChange={(v) => patch({ borderStyle: v })}
                        />
                    </Row>
                )}
                {borderAllowed.has('borderColor') && (
                    <Row label="borderColor">
                        <ColorField
                            value={typeof el.borderColor === 'string' ? (el.borderColor as string) : undefined}
                            onChange={(v) => patch({ borderColor: v })}
                        />
                    </Row>
                )}
                {borderAllowed.has('borderRadius') && (
                    <Row label="borderRadius">
                        <TextStyleField value={el.borderRadius} placeholder="e.g. 4px, 50%" onChange={(v) => patch({ borderRadius: v })} />
                    </Row>
                )}
            </div>

            {/* Effects */}
            <SectionTitle>Effects</SectionTitle>
            <div className="mb-3">
                {effectAllowed.has('boxShadow') && (
                    <Row label="boxShadow">
                        <TextStyleField value={el.boxShadow} placeholder="e.g. 0 1px 4px rgba(0,0,0,.2)" onChange={(v) => patch({ boxShadow: v })} />
                    </Row>
                )}
                {effectAllowed.has('opacity') && (
                    <Row label="opacity">
                        <input
                            type="number"
                            step={0.05}
                            min={0}
                            max={1}
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={typeof el.opacity === 'number' ? el.opacity : el.opacity ? Number(el.opacity) : 1}
                            onChange={(e) => {
                                const num = Number(e.target.value);
                                const val = Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : 1;
                                patch({ opacity: val });
                            }}
                        />
                    </Row>
                )}
                {effectAllowed.has('filter') && (
                    <Row label="filter">
                        <TextStyleField value={el.filter} placeholder="e.g. blur(4px) brightness(1.1)" onChange={(v) => patch({ filter: v })} />
                    </Row>
                )}
            </div>

            {/* Typography */}
            <SectionTitle>Typography</SectionTitle>
            <div className="mb-3">
                {typoAllowed.has('color') && (
                    <Row label="color">
                        <ColorField value={typeof el.color === 'string' ? (el.color as string) : undefined} onChange={(v) => patch({ color: v })} />
                    </Row>
                )}
                {typoAllowed.has('fontFamily') && (
                    <Row label="fontFamily">
                        <TextStyleField value={el.fontFamily} placeholder={`e.g. Inter, "Noto Sans", system-ui`} onChange={(v) => patch({ fontFamily: v })} />
                    </Row>
                )}
                {typoAllowed.has('fontSize') && (
                    <Row label="fontSize">
                        <TextStyleField value={el.fontSize} placeholder="e.g. 14px, 1rem" onChange={(v) => patch({ fontSize: v })} />
                    </Row>
                )}
                {typoAllowed.has('fontWeight') && (
                    <Row label="fontWeight">
                        <SelectStyleField
                            value={el.fontWeight as string | undefined}
                            options={['100','200','300','400','500','600','700','800','900','normal','bold','bolder','lighter']}
                            onChange={(v) => patch({ fontWeight: v })}
                        />
                    </Row>
                )}
                {typoAllowed.has('lineHeight') && (
                    <Row label="lineHeight">
                        <TextStyleField value={el.lineHeight} placeholder="e.g. 1.5, 20px" onChange={(v) => patch({ lineHeight: v })} />
                    </Row>
                )}
                {typoAllowed.has('letterSpacing') && (
                    <Row label="letterSpacing">
                        <TextStyleField value={el.letterSpacing} placeholder="e.g. 0.5px" onChange={(v) => patch({ letterSpacing: v })} />
                    </Row>
                )}
                {typoAllowed.has('textAlign') && (
                    <Row label="textAlign">
                        <SelectStyleField
                            value={el.textAlign as string | undefined}
                            options={['left', 'center', 'right', 'justify', 'start', 'end']}
                            onChange={(v) => patch({ textAlign: v })}
                        />
                    </Row>
                )}
                {typoAllowed.has('textDecoration') && (
                    <Row label="textDecoration">
                        <SelectStyleField
                            value={el.textDecoration as string | undefined}
                            options={['none', 'underline', 'line-through', 'overline']}
                            onChange={(v) => patch({ textDecoration: v })}
                        />
                    </Row>
                )}
            </div>

            {/* Custom */}
            <SectionTitle>Custom</SectionTitle>
            <div className="mb-2 text-[12px] text-gray-500">
                허용된 CSS 키만 추가/편집됩니다. 템플릿 필터(기본 모드) + TagPolicy(항상 적용)가 반영됩니다.
            </div>
            {/* 현재 커스텀 키 목록 */}
            <div className="mb-2">
                {customEntries.length === 0 ? (
                    <div className="text-[12px] text-gray-500">No custom styles.</div>
                ) : (
                    customEntries.map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2 mb-1">
                            <span className="text-[12px] w-48 truncate" title={k}>{k}</span>
                            <input
                                className="flex-1 border rounded px-2 py-1 text-sm"
                                value={v === undefined ? '' : String(v)}
                                onChange={(e) => patch({ [k]: e.target.value } as CSSDict)}
                            />
                            <button
                                className="text-[12px] border rounded px-2 py-1"
                                onClick={() => patch({ [k]: undefined } as CSSDict)}
                                title="Remove"
                            >
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </div>
            {/* 새 커스텀 키/값 추가 */}
            <div className="flex items-center gap-2">
                <input
                    className="w-56 border rounded px-2 py-1 text-sm"
                    placeholder="CSS key (e.g. gap, objectFit)"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                />
                <input
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    placeholder="value"
                    value={newVal}
                    onChange={(e) => setNewVal(e.target.value)}
                />
                <button className="text-[12px] border rounded px-2 py-1" onClick={onAddCustom}>
                    Add
                </button>
            </div>

            {/* 컨테이너 힌트 */}
            {!container && (
                <div className="text-[11px] text-amber-700 mt-3">
                    This tag is a non-container (void or non-wrapper). Flex/Grid container controls are unavailable.
                </div>
            )}
        </div>
    );
}