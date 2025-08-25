'use client';
/**
 * StylesSection — 초보 친화 + 요구사항 반영
 * - Background: None/Color/Image/Transparent 모드, URL & Upload 지원
 * - Effects: boxShadow, filter (+ opacity 유지)
 * - Layout: display:flex 시 flexDirection/justify/align/gap 노출
 * - 템플릿/TagPolicy 기반 가시성/비활성 유지(배지 표기)
 */

import React from 'react';
import { useEditor } from '../../useEditor';
import type {
    CSSDict,
    InspectorFilter,
    NodeId,
    NodePropsWithMeta,
    TagPolicy,
    TagPolicyMap,
} from '../../../core/types';
import {
    filterStyleKeysByTemplateAndTag,
    getTagPolicy,
    isContainerTag,
} from '../../../runtime/capabilities';

// 추가 import (StylesSection.tsx 상단)
import {
    AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
    AlignHorizontalSpaceBetween, AlignHorizontalSpaceAround, AlignHorizontalDistributeCenter,
    AlignStartVertical, AlignCenterVertical, AlignEndVertical,
    AlignVerticalSpaceBetween, AlignVerticalSpaceAround, AlignVerticalDistributeCenter,
    StretchHorizontal, StretchVertical,
    GalleryHorizontal, GalleryVertical, ArrowLeftRight, ArrowUpDown,
} from 'lucide-react';

// 파일 안: 공통 아이콘 토글 컴포넌트(작고 재사용성↑, any 금지)
type LucideIconCmp = React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;

const IconBtn: React.FC<{
    active?: boolean;
    title: string;
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
}> = ({ active, title, onClick, children, disabled }) => (
    <button
        type="button"
        className={`h-8 w-8 grid place-items-center border rounded ${active ? 'bg-gray-900 text-white' : 'bg-white'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={title}
        aria-label={title}
        onClick={onClick}
        disabled={disabled}
    >
        {children}
    </button>
);

/* ───────────────── UI 소품 ───────────────── */

const Section: React.FC<{ title: string; open: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, open, onToggle, children }) => (
    <div className="mb-3">
        <button type="button" onClick={onToggle} className="w-full text-left text-[12px] font-semibold text-gray-700 px-2 py-1 bg-gray-50 border rounded">
            {open ? '▾' : '▸'} {title}
        </button>
        {open && <div className="mt-2">{children}</div>}
    </div>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="text-[12px] text-gray-600">{children}</div>
);

const MiniInput: React.FC<{ value: string | number | undefined; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
    <input className="w-full border rounded px-2 py-1 text-sm" value={value === undefined ? '' : String(value)} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
);

const MiniSelect: React.FC<{ value: string | undefined; options: string[]; onChange: (v: string) => void }> = ({ value, options, onChange }) => (
    <select className="w-full border rounded px-2 py-1 text-sm bg-white" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {value === undefined && <option value="">(unset)</option>}
        {options.map((op) => <option key={op} value={op}>{op}</option>)}
    </select>
);

const ColorField: React.FC<{ value: string | undefined; onChange: (v: string) => void }> = ({ value, onChange }) => {
    const safe = typeof value === 'string' && value.startsWith('#') && (value.length === 7 || value.length === 4) ? value : '#ffffff';
    return <input type="color" className="h-8 w-12 border rounded" value={safe} onChange={(e) => onChange(e.target.value)} />;
};

const DisabledHint: React.FC<{ reason: 'template' | 'tag' }> = ({ reason }) => (
    <span className={`text-[11px] ml-2 ${reason === 'tag' ? 'text-amber-700' : 'text-gray-500'}`}>
    {reason === 'tag' ? '🔒 TagPolicy' : '▣ Template'}
  </span>
);

/* ───────────────── 도메인 유틸 ───────────────── */

type DisallowReason = 'template' | 'tag' | null;

function reasonForKey(key: string, tagPolicy: TagPolicy | undefined, tf: InspectorFilter | undefined, expert: boolean): DisallowReason {
    if (tagPolicy?.styles?.allow && !tagPolicy.styles.allow.includes(key)) return 'tag';
    if (tagPolicy?.styles?.deny && tagPolicy.styles.deny.includes(key)) return 'tag';
    if (!expert && tf?.styles) {
        if (tf.styles.allow && !tf.styles.allow.includes(key)) return 'template';
        if (tf.styles.deny && tf.styles.deny.includes(key)) return 'template';
    }
    return null;
}

function useAllowed(keys: ReadonlyArray<string>, tf: InspectorFilter | undefined, tag: string, m: TagPolicyMap | undefined, expert: boolean): Set<string> {
    const deps = React.useMemo(() => [...keys].join(','), [keys]);
    return React.useMemo(() => new Set<string>(filterStyleKeysByTemplateAndTag([...keys], tf, tag, m, expert)), [deps, tf, tag, m, expert]);
}

/* ───────────────── 본문 ───────────────── */

export function StylesSection() {
    const state = useEditor();
    const nodeId: NodeId = state.ui.selectedId ?? state.project.rootId;
    const node = state.project.nodes[nodeId];

    const props = (node.props as NodePropsWithMeta) ?? {};
    const tag = props.__tag ?? 'div';
    const expert = Boolean(state.ui.expertMode);
    const tf = state.project.inspectorFilters?.[node.componentId];
    const tagPolicy = getTagPolicy(tag, state.project.tagPolicies);

    const el = (node.styles?.element ?? {}) as CSSDict;
    const patch = (kv: CSSDict) => state.updateNodeStyles(nodeId, { element: kv });

    // 그룹 키 (string[]로 선언)
    const KEYS = {
        layout: ['display', 'overflow', 'width', 'height'],
        typo: ['color', 'fontSize', 'fontWeight', 'textAlign'],
        position: ['position', 'top', 'left', 'right', 'bottom'],
        spacing: ['margin', 'padding'],
        border: ['border', 'borderRadius'],
        background: ['backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundRepeat', 'backgroundPosition'],
        effects: ['boxShadow', 'filter', 'opacity'],
        flex: ['flexDirection', 'justifyContent', 'alignItems', 'gap'],
    };

    const allow = {
        layout: useAllowed(KEYS.layout, tf, tag, state.project.tagPolicies, expert),
        typo: useAllowed(KEYS.typo, tf, tag, state.project.tagPolicies, expert),
        position: useAllowed(KEYS.position, tf, tag, state.project.tagPolicies, expert),
        spacing: useAllowed(KEYS.spacing, tf, tag, state.project.tagPolicies, expert),
        border: useAllowed(KEYS.border, tf, tag, state.project.tagPolicies, expert),
        background: useAllowed(KEYS.background, tf, tag, state.project.tagPolicies, expert),
        effects: useAllowed(KEYS.effects, tf, tag, state.project.tagPolicies, expert),
        flex: useAllowed(KEYS.flex, tf, tag, state.project.tagPolicies, expert),
    };

    // 가드/상태
    const display = (el.display as string) ?? 'block';
    const position = (el.position as string) ?? 'static';
    const isInline = display === 'inline';
    const isStatic = position === 'static';
    const container = isContainerTag(tag, tagPolicy);

    const dis = (k: string): DisallowReason => reasonForKey(k, tagPolicy, tf, expert);

    // 섹션 열림 상태
    const [open, setOpen] = React.useState({
        layout: true,
        typo: true,
        position: true,
        spacing: true,
        border: false,
        background: true,
        effects: true,
        custom: false,
    });

    /* ─────────── Background 모드 유도 ─────────── */
    type BgMode = 'none' | 'color' | 'image' | 'transparent';
    const currentBgMode: BgMode = (() => {
        if (typeof el.backgroundImage === 'string' && el.backgroundImage.trim() !== '') return 'image';
        if (el.backgroundColor === 'transparent') return 'transparent';
        if (typeof el.backgroundColor === 'string') return 'color';
        return 'none';
    })();

    const setBgMode = (mode: BgMode) => {
        const kv: CSSDict = {};
        if (mode === 'none') {
            kv.backgroundColor = undefined;
            kv.backgroundImage = undefined;
        } else if (mode === 'color') {
            kv.backgroundImage = undefined; // 이미지 제거
            if (typeof el.backgroundColor !== 'string' || el.backgroundColor === 'transparent') kv.backgroundColor = '#ffffff';
        } else if (mode === 'image') {
            kv.backgroundColor = undefined; // 투명/컬러 제거
            if (typeof el.backgroundImage !== 'string') kv.backgroundImage = 'url("")';
        } else if (mode === 'transparent') {
            kv.backgroundImage = undefined;
            kv.backgroundColor = 'transparent';
        }
        patch(kv);
    };

    // 업로드 핸들러 (dataURL로 배경 이미지 저장)
    const onBgFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === 'string' ? reader.result : '';
            if (!dataUrl) return;
            patch({ backgroundImage: `url("${dataUrl}")` });
        };
        reader.readAsDataURL(file);
        // 같은 파일 다시 선택 가능하도록 값 초기화
        e.currentTarget.value = '';
    };

    // URL -> backgroundImage
    const [bgUrlDraft, setBgUrlDraft] = React.useState<string>('');
    const applyBgUrl = () => {
        const url = bgUrlDraft.trim();
        if (!url) return;
        patch({ backgroundImage: `url("${url}")` });
        setBgUrlDraft('');
    };

    // 프리셋(간단)
    const applyFlexPreset = (name: 'row' | 'row-center' | 'column' | 'centered') => {
        if (!container) return;
        if (display !== 'flex') patch({ display: 'flex' });
        const base: CSSDict = {};
        if (name === 'row') Object.assign(base, { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'stretch', gap: '8px' });
        if (name === 'row-center') Object.assign(base, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '8px' });
        if (name === 'column') Object.assign(base, { flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'stretch', gap: '8px' });
        if (name === 'centered') Object.assign(base, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' });
        patch(base);
    };

    // 커스텀 추가 상태
    const [customKey, setCustomKey] = React.useState('');
    const [customVal, setCustomVal] = React.useState('');
    const onAddCustom = () => {
        const k = customKey.trim();
        if (!k) return;
        const reason = dis(k);
        if (reason) {
            alert(`'${k}' 사용 불가: ${reason === 'tag' ? 'TagPolicy' : 'Template 제한'}`);
            return;
        }
        patch({ [k]: customVal } as CSSDict);
        setCustomKey('');
        setCustomVal('');
    };

    return (
        <div className="px-2 pt-2">
            {!expert && tf?.styles && (
                <div className="text-[11px] text-gray-500 mb-2">
                    템플릿 필터가 일부 스타일을 숨겼습니다. (Expert 모드에서 무시)
                </div>
            )}

            {/* Presets */}
            <Section title="Presets (Flex)" open={true} onToggle={() => void 0}>
                <div className="flex flex-wrap gap-2">
                    <button className="text-[12px] px-2 py-1 border rounded" onClick={() => applyFlexPreset('row')} disabled={!container || Boolean(dis('flexDirection'))}>Row</button>
                    <button className="text-[12px] px-2 py-1 border rounded" onClick={() => applyFlexPreset('row-center')} disabled={!container || Boolean(dis('justifyContent'))}>Row • Center</button>
                    <button className="text-[12px] px-2 py-1 border rounded" onClick={() => applyFlexPreset('column')} disabled={!container || Boolean(dis('flexDirection'))}>Column</button>
                    <button className="text-[12px] px-2 py-1 border rounded" onClick={() => applyFlexPreset('centered')} disabled={!container || Boolean(dis('justifyContent'))}>Centered</button>
                </div>
                {!container && <div className="text-[11px] text-amber-700 mt-1">이 태그는 컨테이너가 아니므로 Flex 프리셋을 사용할 수 없습니다.</div>}
            </Section>

            {/* 1) Layout */}
            <Section title="Layout" open={open.layout} onToggle={() => setOpen({ ...open, layout: !open.layout })}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {/* display */}
                    <div>
                        <Label>display</Label>
                        {allow.layout.has('display') ? (
                            <div className="mt-1 grid grid-cols-4 gap-1">
                                {['block', 'inline', 'flex', 'grid'].map((v) => (
                                    <button key={v} className={`text-[12px] px-2 py-1 border rounded ${(el.display as string | undefined) === v ? 'bg-gray-900 text-white' : ''}`} onClick={() => patch({ display: v })}>
                                        {v[0].toUpperCase() + v.slice(1)}
                                    </button>
                                ))}
                            </div>
                        ) : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('display') ?? 'template'} /></div>}
                    </div>

                    {/* overflow */}
                    <div>
                        <Label>overflow</Label>
                        {allow.layout.has('overflow') ? (
                            <div className="mt-1">
                                <MiniSelect value={el.overflow as string | undefined} options={['visible', 'hidden', 'scroll', 'auto']} onChange={(v) => patch({ overflow: v })} />
                            </div>
                        ) : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('overflow') ?? 'template'} /></div>}
                    </div>

                    {/* width / height (inline 숨김) */}
                    {!isInline ? (
                        <>
                            <div>
                                <Label>width</Label>
                                {allow.layout.has('width') ? <div className="mt-1"><MiniInput value={el.width} placeholder="100%, 240px" onChange={(v) => patch({ width: v })} /></div>
                                    : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('width') ?? 'template'} /></div>}
                            </div>
                            <div>
                                <Label>height</Label>
                                {allow.layout.has('height') ? <div className="mt-1"><MiniInput value={el.height} placeholder="auto, 320px" onChange={(v) => patch({ height: v })} /></div>
                                    : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('height') ?? 'template'} /></div>}
                            </div>
                        </>
                    ) : (
                        <div className="text-[11px] text-amber-700 col-span-full">display:inline에서는 width/height 설정 불가</div>
                    )}
                </div>

                {/* display:flex → 세부 컨트롤 */}
                {container && (el.display as string) === 'flex' && (
                    <div className="mt-2">
                        {/*
      주축/교차축 아이콘 세트 계산:
      - row/row-reverse:  justify => Horizontal, align => Vertical
      - column/column-reverse: justify => Vertical,   align => Horizontal
    */}
                        {(() => {
                            const dir = (el.flexDirection as string) ?? 'row';
                            const isColumn = dir === 'column' || dir === 'column-reverse';

                            // 주축(=justify) 아이콘들
                            const justifyIcons: { v: string; title: string; I: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }> }[] =
                                isColumn
                                    ? [
                                        { v: 'flex-start', title: 'flex-start', I: AlignStartVertical },
                                        { v: 'center', title: 'center', I: AlignCenterVertical },
                                        { v: 'flex-end', title: 'flex-end', I: AlignEndVertical },
                                        { v: 'space-between', title: 'space-between', I: AlignVerticalSpaceBetween },
                                        { v: 'space-around', title: 'space-around', I: AlignVerticalSpaceAround },
                                        { v: 'space-evenly', title: 'space-evenly', I: AlignVerticalDistributeCenter },
                                    ]
                                    : [
                                        { v: 'flex-start', title: 'flex-start', I: AlignStartHorizontal },
                                        { v: 'center', title: 'center', I: AlignCenterHorizontal },
                                        { v: 'flex-end', title: 'flex-end', I: AlignEndHorizontal },
                                        { v: 'space-between', title: 'space-between', I: AlignHorizontalSpaceBetween },
                                        { v: 'space-around', title: 'space-around', I: AlignHorizontalSpaceAround },
                                        { v: 'space-evenly', title: 'space-evenly', I: AlignHorizontalDistributeCenter },
                                    ];

                            // 교차축(=align-items) 아이콘들
                            const alignIcons: { v: string; title: string; I: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }> }[] =
                                isColumn
                                    ? [
                                        { v: 'flex-start', title: 'flex-start', I: AlignStartHorizontal },
                                        { v: 'center', title: 'center', I: AlignCenterHorizontal },
                                        { v: 'flex-end', title: 'flex-end', I: AlignEndHorizontal },
                                        // stretch는 교차축 방향 아이콘 사용
                                        { v: 'stretch', title: 'stretch', I: StretchHorizontal },
                                    ]
                                    : [
                                        { v: 'flex-start', title: 'flex-start', I: AlignStartVertical },
                                        { v: 'center', title: 'center', I: AlignCenterVertical },
                                        { v: 'flex-end', title: 'flex-end', I: AlignEndVertical },
                                        { v: 'stretch', title: 'stretch', I: StretchVertical },
                                    ];

                            return (
                                <div className="grid grid-cols-12 gap-1 items-start">
                                    {/* direction (3칸) */}
                                    <div className="col-span-3">
                                        <Label>direction</Label>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {[
                                                { v: 'row', title: 'row', I: GalleryHorizontal },
                                                { v: 'row-reverse', title: 'row-reverse', I: ArrowLeftRight },
                                                { v: 'column', title: 'column', I: GalleryVertical },
                                                { v: 'column-reverse', title: 'column-reverse', I: ArrowUpDown },
                                            ].map(({ v, title, I }) => (
                                                <IconBtn
                                                    key={v}
                                                    title={title}
                                                    active={el.flexDirection === v}
                                                    disabled={!allow.flex.has('flexDirection')}
                                                    onClick={() => patch({ flexDirection: v })}
                                                >
                                                    <I size={16} aria-hidden />
                                                </IconBtn>
                                            ))}
                                        </div>
                                        {!allow.flex.has('flexDirection') && (
                                            <div className="text-[11px] text-gray-400 mt-1">
                                                제한됨 <DisabledHint reason={dis('flexDirection') ?? 'template'} />
                                            </div>
                                        )}
                                    </div>

                                    {/* justify (주축, 5칸) */}
                                    <div className="col-span-5">
                                        <Label>justify</Label>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {justifyIcons.map(({ v, title, I }) => (
                                                <IconBtn
                                                    key={v}
                                                    title={title}
                                                    active={el.justifyContent === v}
                                                    disabled={!allow.flex.has('justifyContent')}
                                                    onClick={() => patch({ justifyContent: v })}
                                                >
                                                    <I size={16} aria-hidden />
                                                </IconBtn>
                                            ))}
                                        </div>
                                        {!allow.flex.has('justifyContent') && (
                                            <div className="text-[11px] text-gray-400 mt-1">
                                                제한됨 <DisabledHint reason={dis('justifyContent') ?? 'template'} />
                                            </div>
                                        )}
                                    </div>

                                    {/* align (교차축, 4칸) */}
                                    <div className="col-span-4">
                                        <Label>align</Label>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {alignIcons.map(({ v, title, I }) => (
                                                <IconBtn
                                                    key={v}
                                                    title={title}
                                                    active={el.alignItems === v}
                                                    disabled={!allow.flex.has('alignItems')}
                                                    onClick={() => patch({ alignItems: v })}
                                                >
                                                    <I size={16} aria-hidden />
                                                </IconBtn>
                                            ))}
                                        </div>
                                        {!allow.flex.has('alignItems') && (
                                            <div className="text-[11px] text-gray-400 mt-1">
                                                제한됨 <DisabledHint reason={dis('alignItems') ?? 'template'} />
                                            </div>
                                        )}
                                    </div>

                                    {/* gap (아래줄, direction 아래 정렬) */}
                                    <div className="col-span-3 mt-1">
                                        <Label>gap</Label>
                                        {allow.flex.has('gap') ? (
                                            <div className="mt-1 w-[84px]">
                                                <MiniInput value={el.gap} placeholder="8px" onChange={(v) => patch({ gap: v })} />
                                            </div>
                                        ) : (
                                            <div className="text-[11px] text-gray-400">
                                                제한됨 <DisabledHint reason={dis('gap') ?? 'template'} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </Section>

            {/* 2) Typography */}
            <Section title="Typography" open={open.typo} onToggle={() => setOpen({ ...open, typo: !open.typo })}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                        <Label>color</Label>
                        {allow.typo.has('color') ? (
                            <div className="mt-1 flex items-center gap-2">
                                <ColorField value={typeof el.color === 'string' ? (el.color as string) : undefined} onChange={(v) => patch({ color: v })} />
                                <button className="text-[12px] border rounded px-2 py-1" onClick={() => patch({ color: undefined })}>Clear</button>
                            </div>
                        ) : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('color') ?? 'template'} /></div>}
                    </div>
                    <div>
                        <Label>fontSize</Label>
                        {allow.typo.has('fontSize') ? <div className="mt-1"><MiniInput value={el.fontSize} placeholder="14px, 1rem" onChange={(v) => patch({ fontSize: v })} /></div>
                            : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('fontSize') ?? 'template'} /></div>}
                    </div>
                    <div>
                        <Label>fontWeight</Label>
                        {allow.typo.has('fontWeight') ? (
                            <div className="mt-1 grid grid-cols-2 gap-1">
                                {['400','700'].map((w) => (
                                    <button key={w} className={`text-[12px] px-2 py-1 border rounded ${(el.fontWeight as string | number | undefined)?.toString() === w ? 'bg-gray-900 text-white' : ''}`} onClick={() => patch({ fontWeight: w })}>
                                        {w === '400' ? 'Regular' : 'Bold'}
                                    </button>
                                ))}
                            </div>
                        ) : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('fontWeight') ?? 'template'} /></div>}
                    </div>
                    <div>
                        <Label>textAlign</Label>
                        {allow.typo.has('textAlign') ? (
                            <div className="mt-1 grid grid-cols-3 gap-1">
                                {['left','center','right'].map((a) => (
                                    <button key={a} className={`text-[12px] px-2 py-1 border rounded ${el.textAlign === a ? 'bg-gray-900 text-white' : ''}`} onClick={() => patch({ textAlign: a })}>
                                        {a}
                                    </button>
                                ))}
                            </div>
                        ) : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('textAlign') ?? 'template'} /></div>}
                    </div>
                </div>
            </Section>

            {/* 3) Position */}
            <Section title="Position" open={open.position} onToggle={() => setOpen({ ...open, position: !open.position })}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                        <Label>position</Label>
                        {allow.position.has('position') ? <div className="mt-1"><MiniSelect value={el.position as string | undefined} options={['static','relative','absolute','fixed','sticky']} onChange={(v) => patch({ position: v })} /></div>
                            : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('position') ?? 'template'} /></div>}
                    </div>
                    {!isStatic ? (
                        <div className="md:col-span-2">
                            <Label>offset</Label>
                            <div className="mt-1 grid grid-cols-4 gap-2">
                                {(['top','left','right','bottom'] as const).map((k) => (
                                    <MiniInput key={k} value={el[k]} placeholder={k} onChange={(v) => patch({ [k]: v } as CSSDict)} />
                                ))}
                            </div>
                        </div>
                    ) : <div className="text-[11px] text-amber-700 md:col-span-2">position:static에서는 offset을 설정할 수 없습니다.</div>}
                </div>
            </Section>

            {/* 4) Margin & Padding */}
            <Section title="Margin & Padding" open={open.spacing} onToggle={() => setOpen({ ...open, spacing: !open.spacing })}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                        <Label>margin</Label>
                        {allow.spacing.has('margin') ? <div className="mt-1"><MiniInput value={el.margin} placeholder="0 auto / 8px 12px" onChange={(v) => patch({ margin: v })} /></div>
                            : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('margin') ?? 'template'} /></div>}
                    </div>
                    <div>
                        <Label>padding</Label>
                        {allow.spacing.has('padding') ? <div className="mt-1"><MiniInput value={el.padding} placeholder="8px 12px" onChange={(v) => patch({ padding: v })} /></div>
                            : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('padding') ?? 'template'} /></div>}
                    </div>
                </div>
            </Section>

            {/* 5) Border */}
            <Section title="Border" open={open.border} onToggle={() => setOpen({ ...open, border: !open.border })}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                        <Label>border</Label>
                        {allow.border.has('border') ? <div className="mt-1"><MiniInput value={el.border} placeholder="1px solid #ddd" onChange={(v) => patch({ border: v })} /></div>
                            : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('border') ?? 'template'} /></div>}
                    </div>
                    <div>
                        <Label>borderRadius</Label>
                        {allow.border.has('borderRadius') ? <div className="mt-1"><MiniInput value={el.borderRadius} placeholder="4px, 50%" onChange={(v) => patch({ borderRadius: v })} /></div>
                            : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('borderRadius') ?? 'template'} /></div>}
                    </div>
                </div>
            </Section>

            {/* 6) Background — Color / Image / Transparent */}
            <Section title="Background" open={open.background} onToggle={() => setOpen({ ...open, background: !open.background })}>
                <div className="grid grid-cols-1 gap-2">
                    <div>
                        <Label>mode</Label>
                        <div className="mt-1 grid grid-cols-4 gap-1">
                            {(['none','color','image','transparent'] as const).map((m) => (
                                <button
                                    key={m}
                                    className={`text-[12px] px-2 py-1 border rounded ${currentBgMode === m ? 'bg-gray-900 text-white' : ''}`}
                                    onClick={() => setBgMode(m)}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color */}
                    {currentBgMode === 'color' && (
                        <div>
                            <Label>backgroundColor</Label>
                            {allow.background.has('backgroundColor') ? (
                                <div className="mt-1 flex items-center gap-2">
                                    <ColorField value={typeof el.backgroundColor === 'string' ? (el.backgroundColor as string) : undefined} onChange={(v) => patch({ backgroundColor: v })} />
                                    <button className="text-[12px] border rounded px-2 py-1" onClick={() => patch({ backgroundColor: undefined })}>Clear</button>
                                </div>
                            ) : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('backgroundColor') ?? 'template'} /></div>}
                        </div>
                    )}

                    {/* Image */}
                    {currentBgMode === 'image' && (
                        <>
                            <div>
                                <Label>URL</Label>
                                {allow.background.has('backgroundImage') ? (
                                    <div className="mt-1 flex items-center gap-2">
                                        <MiniInput value={bgUrlDraft} placeholder="https://... 또는 /path.png" onChange={setBgUrlDraft} />
                                        <button className="text-[12px] border rounded px-2 py-1" onClick={applyBgUrl}>Apply</button>
                                        <button className="text-[12px] border rounded px-2 py-1" onClick={() => patch({ backgroundImage: undefined })}>Clear</button>
                                    </div>
                                ) : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('backgroundImage') ?? 'template'} /></div>}
                            </div>
                            <div>
                                <Label>Upload</Label>
                                {allow.background.has('backgroundImage') ? (
                                    <input type="file" accept="image/*" className="mt-1 text-sm" onChange={onBgFile} />
                                ) : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('backgroundImage') ?? 'template'} /></div>}
                            </div>

                            {/* Size/Repeat/Position (허용될 때만) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div>
                                    <Label>backgroundSize</Label>
                                    {allow.background.has('backgroundSize')
                                        ? <div className="mt-1"><MiniSelect value={el.backgroundSize as string | undefined} options={['auto','cover','contain']} onChange={(v) => patch({ backgroundSize: v })} /></div>
                                        : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('backgroundSize') ?? 'template'} /></div>}
                                </div>
                                <div>
                                    <Label>backgroundRepeat</Label>
                                    {allow.background.has('backgroundRepeat')
                                        ? <div className="mt-1"><MiniSelect value={el.backgroundRepeat as string | undefined} options={['no-repeat','repeat','repeat-x','repeat-y','space','round']} onChange={(v) => patch({ backgroundRepeat: v })} /></div>
                                        : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('backgroundRepeat') ?? 'template'} /></div>}
                                </div>
                                <div>
                                    <Label>backgroundPosition</Label>
                                    {allow.background.has('backgroundPosition')
                                        ? <div className="mt-1"><MiniSelect value={el.backgroundPosition as string | undefined} options={['left top','left center','left bottom','center top','center','center bottom','right top','right center','right bottom']} onChange={(v) => patch({ backgroundPosition: v })} /></div>
                                        : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('backgroundPosition') ?? 'template'} /></div>}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Transparent는 모드 스위치에서 처리됨 */}
                </div>
            </Section>

            {/* 7) Effects */}
            <Section title="Effects" open={open.effects} onToggle={() => setOpen({ ...open, effects: !open.effects })}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                        <Label>boxShadow</Label>
                        {allow.effects.has('boxShadow') ? <div className="mt-1"><MiniInput value={el.boxShadow} placeholder="0 1px 4px rgba(0,0,0,.2)" onChange={(v) => patch({ boxShadow: v })} /></div>
                            : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('boxShadow') ?? 'template'} /></div>}
                    </div>
                    <div>
                        <Label>filter</Label>
                        {allow.effects.has('filter') ? <div className="mt-1"><MiniInput value={el.filter} placeholder="blur(4px) brightness(1.1)" onChange={(v) => patch({ filter: v })} /></div>
                            : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('filter') ?? 'template'} /></div>}
                    </div>
                    <div>
                        <Label>opacity</Label>
                        {allow.effects.has('opacity') ? (
                            <div className="mt-1">
                                <input
                                    type="number"
                                    step={0.05}
                                    min={0}
                                    max={1}
                                    className="w-full border rounded px-2 py-1 text-sm"
                                    value={typeof el.opacity === 'number' ? el.opacity : el.opacity ? Number(el.opacity) : 1}
                                    onChange={(e) => {
                                        const n = Number(e.target.value);
                                        const v = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
                                        patch({ opacity: v });
                                    }}
                                />
                            </div>
                        ) : <div className="text-[12px] text-gray-400">제한됨 <DisabledHint reason={dis('opacity') ?? 'template'} /></div>}
                    </div>
                </div>
            </Section>

            {/* 8) Custom */}
            <Section title="Custom" open={open.custom} onToggle={() => setOpen({ ...open, custom: !open.custom })}>
                <div className="text-[12px] text-gray-500 mb-2">허용된 CSS 키만 추가/편집됩니다. (템플릿/TagPolicy 반영)</div>
                <div className="space-y-1">
                    {Object.entries(el)
                        .filter(([k]) => !Object.values(KEYS).flat().includes(k))
                        .map(([k, v]) => (
                            <div key={k} className="grid grid-cols-5 gap-2 items-center">
                                <div className="col-span-2 text-[12px] truncate" title={k}>{k}</div>
                                <input className="col-span-2 border rounded px-2 py-1 text-sm" value={v === undefined ? '' : String(v)} onChange={(e) => patch({ [k]: e.target.value } as CSSDict)} />
                                <button className="text-[12px] border rounded px-2 py-1" onClick={() => patch({ [k]: undefined } as CSSDict)}>✕</button>
                            </div>
                        ))}
                </div>
                <div className="grid grid-cols-5 gap-2 mt-2">
                    <input className="col-span-2 border rounded px-2 py-1 text-sm" placeholder="CSS key (e.g. gap)" value={customKey} onChange={(e) => setCustomKey(e.target.value)} />
                    <input className="col-span-2 border rounded px-2 py-1 text-sm" placeholder="value" value={customVal} onChange={(e) => setCustomVal(e.target.value)} />
                    <button className="text-[12px] border rounded px-2 py-1" onClick={onAddCustom}>Add</button>
                </div>
            </Section>
        </div>
    );
}