'use client';

/**
 * StylesSection — 초보 친화 + 프리셋 강화
 * - Background: 모드(Color / Image / Transparent / None) + Gradient 프리셋 + URL/Upload
 * - Effects: boxShadow / filter 프리셋 칩 + opacity 숫자 입력
 * - Layout: display:flex → 아이콘 토글(주축/교차축 아이콘 자동 전환), gap
 * - Grid: 기본 프리셋 + 상세 v1 (columns/rows/gap/auto-flow/alignments)  ※ Layout 섹션 내부에 위치
 * - 템플릿/TagPolicy 기반 가시성/비활성(배지 표기), Expert ON 시 템플릿 무시
 *
 * 규칙:
 * - any 금지, 훅 최상위, 얕은 복사 업데이트(state.updateNodeStyles)
 * - SSOT 타입(core/types.ts) 사용
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

// ───────────────────────────────────────────────────────────────
// Icons (lucide-react)
// ───────────────────────────────────────────────────────────────
import {
    AlignStartHorizontal,
    AlignCenterHorizontal,
    AlignEndHorizontal,
    AlignHorizontalSpaceBetween,
    AlignHorizontalSpaceAround,
    AlignHorizontalDistributeCenter,
    AlignStartVertical,
    AlignCenterVertical,
    AlignEndVertical,
    AlignVerticalSpaceBetween,
    AlignVerticalSpaceAround,
    AlignVerticalDistributeCenter,
    StretchHorizontal,
    StretchVertical,
    GalleryHorizontal,
    GalleryVertical,
    ArrowLeftRight,
    ArrowUpDown,
} from 'lucide-react';

/* ───────────────── UI 소품(최소 스타일) ───────────────── */
const Section: React.FC<{
    title: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}> = ({ title, open, onToggle, children }) => (
    <div className="border-t border-neutral-200 pt-3 mt-3">
        <button
            className="w-full text-left text-[12px] uppercase tracking-wide text-neutral-500 mb-2 flex items-center gap-2"
            onClick={onToggle}
        >
            <span className="inline-block w-3">{open ? '▾' : '▸'}</span>
            <span>{title}</span>
        </button>
        {open && <div className="space-y-2">{children}</div>}
    </div>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="text-[12px] text-neutral-600">{children}</div>
);

const MiniInput: React.FC<{
    value: string | number | undefined;
    onChange: (v: string) => void;
    placeholder?: string;
}> = ({ value, onChange, placeholder }) => (
    <input
        className="w-full px-2 py-1 border rounded text-[12px]"
        value={value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
    />
);

const MiniSelect: React.FC<{
    value: string | undefined;
    options: string[];
    onChange: (v: string) => void;
}> = ({ value, options, onChange }) => (
    <select
        className="w-full px-2 py-1 border rounded text-[12px]"
        value={value === undefined ? '' : value}
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

const ColorField: React.FC<{
    value: string | undefined;
    onChange: (v: string) => void;
}> = ({ value, onChange }) => {
    const safe =
        typeof value === 'string' &&
        value.startsWith('#') &&
        (value.length === 7 || value.length === 4)
            ? value
            : '#ffffff';
    return (
        <input
            className="w-full h-8"
            type="color"
            value={safe}
            onChange={(e) => onChange(e.target.value)}
        />
    );
};

const DisabledHint: React.FC<{ reason: 'template' | 'tag' }> = ({ reason }) => (
    <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-neutral-500">
    {reason === 'tag' ? '⛔ TagPolicy' : '▣ Template'}
  </span>
);

// 칩 형태의 작은 버튼
const ChipBtn: React.FC<{
    active?: boolean;
    disabled?: boolean;
    title: string;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ active, disabled, title, onClick, children }) => (
    <button
        className={`px-2 py-1 rounded border text-[12px] ${
            active ? 'bg-neutral-800 text-white' : 'bg-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={title}
        onClick={onClick}
        disabled={disabled}
        type="button"
    >
        {children}
    </button>
);

// 아이콘 버튼 (flex)
type LucideIconCmp = React.ComponentType<{
    size?: number;
    className?: string;
    'aria-hidden'?: boolean;
}>;
const IconBtn: React.FC<{
    active?: boolean;
    title: string;
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
}> = ({ active, title, onClick, children, disabled }) => (
    <button
        className={`p-1.5 rounded border ${active ? 'bg-neutral-800 text-white' : 'bg-white'} ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title={title}
        onClick={onClick}
        disabled={disabled}
        type="button"
    >
        {children}
    </button>
);

/* ───────────────── 도메인 유틸 ───────────────── */
type DisallowReason = 'template' | 'tag' | null;
function reasonForKey(
    key: string,
    tagPolicy: TagPolicy | undefined,
    tf: InspectorFilter | undefined,
    expert: boolean
): DisallowReason {
    if (tagPolicy?.styles?.allow && !tagPolicy.styles.allow.includes(key)) return 'tag';
    if (tagPolicy?.styles?.deny && tagPolicy.styles.deny.includes(key)) return 'tag';
    if (!expert && tf?.styles) {
        if (tf.styles.allow && !tf.styles.allow.includes(key)) return 'template';
        if (tf.styles.deny && tf.styles.deny.includes(key)) return 'template';
    }
    return null;
}

function useAllowed(
    keys: string[],
    tf: InspectorFilter | undefined,
    tag: string,
    m: TagPolicyMap | undefined,
    expert: boolean
): Set<string> {
    const deps = React.useMemo(() => keys.join(','), [keys]);
    return React.useMemo(
        () => new Set(filterStyleKeysByTemplateAndTag([...keys], tf, tag, m, expert)),
        [deps, tf, tag, m, expert]
    );
}

/* ───────────────── 본문 ───────────────── */

export function StylesSection() {
    const state = useEditor();

    const nodeId: NodeId = state.ui.selectedId ?? state.project.rootId;
    const node = state.project.nodes[nodeId];
    const props = (node.props as NodePropsWithMeta) ?? {};
    const tag = (props.__tag as string | undefined) ?? 'div';

    const expert = Boolean(state.ui.expertMode);
    const tf = state.project.inspectorFilters?.[node.componentId];
    const tagPolicy = getTagPolicy(tag, state.project.tagPolicies);

    const el = (node.styles?.element ?? {}) as CSSDict;
    const patch = (kv: CSSDict) => state.updateNodeStyles(nodeId, { element: kv });

    // 그룹 키
    const KEYS: Record<
        | 'layout'
        | 'typo'
        | 'position'
        | 'spacing'
        | 'border'
        | 'background'
        | 'effects'
        | 'flex'
        | 'grid',
        string[]
    > = {
        layout: ['display', 'overflow', 'width', 'height'],
        typo: ['color', 'fontSize', 'fontWeight', 'textAlign'],
        position: ['position', 'top', 'left', 'right', 'bottom'],
        spacing: ['margin', 'padding'],
        border: ['border', 'borderRadius'],
        background: [
            'backgroundColor',
            'backgroundImage',
            'backgroundSize',
            'backgroundRepeat',
            'backgroundPosition',
        ],
        effects: ['boxShadow', 'filter', 'opacity'],
        flex: ['flexDirection', 'justifyContent', 'alignItems', 'gap'],
        grid: [
            'gridTemplateColumns',
            'gridTemplateRows',
            'gridAutoFlow',
            'gap',
            'rowGap',
            'columnGap',
            'justifyItems',
            'alignItems',
            'justifyContent',
            'alignContent',
        ],
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
        grid: useAllowed(KEYS.grid, tf, tag, state.project.tagPolicies, expert),
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

    /* ─────────── Background 모드 + 프리셋 ─────────── */

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
            kv.backgroundImage = undefined;
            if (typeof el.backgroundColor !== 'string' || el.backgroundColor === 'transparent') {
                kv.backgroundColor = '#ffffff';
            }
        } else if (mode === 'image') {
            kv.backgroundColor = undefined;
            if (typeof el.backgroundImage !== 'string') kv.backgroundImage = 'url("")';
        } else if (mode === 'transparent') {
            kv.backgroundImage = undefined;
            kv.backgroundColor = 'transparent';
        }
        patch(kv);
    };

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
        e.currentTarget.value = '';
    };

    const [bgUrlDraft, setBgUrlDraft] = React.useState('');
    const applyBgUrl = () => {
        const url = bgUrlDraft.trim();
        if (!url) return;
        patch({ backgroundImage: `url("${url}")` });
        setBgUrlDraft('');
    };

    // Background Gradient 프리셋
    const gradients: { name: string; css: string }[] = [
        { name: 'Sunset', css: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)' },
        { name: 'Ocean', css: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)' },
        { name: 'Midnight', css: 'linear-gradient(135deg, #232526 0%, #414345 100%)' },
        { name: 'Candy', css: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
    ];
    const applyGradient = (g: string) => {
        patch({ backgroundColor: undefined, backgroundImage: g });
    };

    // Flex 프리셋(간단)
    const applyFlexPreset = (name: 'row' | 'row-center' | 'column' | 'centered') => {
        if (!container) return;
        if (display !== 'flex') patch({ display: 'flex' });
        const base: CSSDict = {};
        if (name === 'row')
            Object.assign(base, {
                flexDirection: 'row',
                justifyContent: 'flex-start',
                alignItems: 'stretch',
                gap: '8px',
            });
        if (name === 'row-center')
            Object.assign(base, {
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
            });
        if (name === 'column')
            Object.assign(base, {
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'stretch',
                gap: '8px',
            });
        if (name === 'centered')
            Object.assign(base, {
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
            });
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

    // ──────────────────────────────────────────────
// Effects 고급 조작용 상태/유틸 (전문가 모드에서 노출)
// ──────────────────────────────────────────────

// box-shadow: "0px 2px 8px 0px rgba(0,0,0,0.15)"
    type Shadow = { x: number; y: number; blur: number; spread: number; color: string };

    function parseShadow(v: unknown): Shadow | null {
        if (typeof v !== 'string') return null;
        const s = v.trim();
        const m = s.match(/^(-?\d+)(?:px)?\s+(-?\d+)(?:px)?\s+(\d+)(?:px)?\s+(-?\d+)(?:px)?\s+(.+)$/);
        if (!m) return null;
        return { x: Number(m[1]), y: Number(m[2]), blur: Number(m[3]), spread: Number(m[4]), color: m[5] };
    }

    function fmtShadow(sh: Shadow): string {
        return `${sh.x}px ${sh.y}px ${sh.blur}px ${sh.spread}px ${sh.color}`;
    }

// filter: blur(px) brightness(%) contrast(%) saturate(%)
    type FilterVals = { blur: number; brightness: number; contrast: number; saturate: number };

    function parseFilter(v: unknown): FilterVals {
        const base: FilterVals = { blur: 0, brightness: 100, contrast: 100, saturate: 100 };
        if (typeof v !== 'string') return base;
        const parts = v.split(/\)\s*/g).map((p) => p.trim()).filter(Boolean);
        for (const p of parts) {
            const m = p.match(/^([a-zA-Z]+)\((.+)$/);
            if (!m) continue;
            const k = m[1]; const rest = m[2];
            if (k === 'blur') {
                const n = Number(rest.replace(/px\)?$/, ''));
                if (!Number.isNaN(n)) base.blur = n;
            } else if (k === 'brightness') {
                const n = Number(rest.replace(/%\)?$/, ''));
                if (!Number.isNaN(n)) base.brightness = n;
            } else if (k === 'contrast') {
                const n = Number(rest.replace(/%\)?$/, ''));
                if (!Number.isNaN(n)) base.contrast = n;
            } else if (k === 'saturate') {
                const n = Number(rest.replace(/%\)?$/, ''));
                if (!Number.isNaN(n)) base.saturate = n;
            }
        }
        return base;
    }

    function fmtFilter(f: FilterVals): string {
        const seg: string[] = [];
        if (f.blur) seg.push(`blur(${f.blur}px)`);
        if (f.brightness !== 100) seg.push(`brightness(${f.brightness}%)`);
        if (f.contrast !== 100) seg.push(`contrast(${f.contrast}%)`);
        if (f.saturate !== 100) seg.push(`saturate(${f.saturate}%)`);
        return seg.join(' ');
    }

// 초기값 계산
    const initialShadow: Shadow =
        parseShadow(el.boxShadow) ?? { x: 0, y: 2, blur: 8, spread: 0, color: 'rgba(0,0,0,0.15)' };
    const initialFilter: FilterVals = parseFilter(el.filter);

// 상태
    const [shadow, setShadow] = React.useState<Shadow>(initialShadow);
    const [fvals, setFvals] = React.useState<FilterVals>(initialFilter);

// 노드 변경 시 초기화
    React.useEffect(() => {
        setShadow(parseShadow(el.boxShadow) ?? { x: 0, y: 2, blur: 8, spread: 0, color: 'rgba(0,0,0,0.15)' });
        setFvals(parseFilter(el.filter));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeId]);

// 커밋 함수
    const commitShadow = (next: Partial<Shadow>) => {
        const merged = { ...shadow, ...next };
        setShadow(merged);
        patch({ boxShadow: fmtShadow(merged) });
    };

    const commitFilter = (next: Partial<FilterVals>) => {
        const merged = { ...fvals, ...next };
        setFvals(merged);
        const s = fmtFilter(merged);
        patch({ filter: s || undefined });
    };

    return (
        <div className="px-3 pb-6">
            {!expert && tf?.styles && (
                <div className="mb-2 text-[11px] text-amber-600">
                    템플릿 필터가 일부 스타일을 숨겼습니다. (Expert 모드에서 무시)
                </div>
            )}

            {/* Presets (Flex) */}
            <div className="mb-3 flex items-center gap-2 flex-wrap">
                <span className="text-[12px] text-neutral-600">Presets:</span>
                <ChipBtn
                    title="Row"
                    onClick={() => applyFlexPreset('row')}
                    disabled={!container || Boolean(dis('flexDirection'))}
                >
                    Row
                </ChipBtn>
                <ChipBtn
                    title="Row • Center"
                    onClick={() => applyFlexPreset('row-center')}
                    disabled={!container || Boolean(dis('justifyContent'))}
                >
                    Row • Center
                </ChipBtn>
                <ChipBtn
                    title="Column"
                    onClick={() => applyFlexPreset('column')}
                    disabled={!container || Boolean(dis('flexDirection'))}
                >
                    Column
                </ChipBtn>
                <ChipBtn
                    title="Centered"
                    onClick={() => applyFlexPreset('centered')}
                    disabled={!container || Boolean(dis('justifyContent'))}
                >
                    Centered
                </ChipBtn>

                {!container && (
                    <span className="ml-2 text-[12px] text-neutral-500">
            이 태그는 컨테이너가 아니므로 Flex 프리셋을 사용할 수 없습니다.
          </span>
                )}
            </div>

            {/* 1) Layout */}
            <Section
                title="Layout"
                open={open.layout}
                onToggle={() => setOpen({ ...open, layout: !open.layout })}
            >
                {/* display */}
                <div>
                    <Label>
                        display
                        {!allow.layout.has('display') && <DisabledHint reason={dis('display')!} />}
                    </Label>
                    {allow.layout.has('display') ? (
                        <div className="grid grid-cols-4 gap-1">
                            {['block', 'inline', 'flex', 'grid'].map((v) => (
                                <ChipBtn key={v} title={v} onClick={() => patch({ display: v })}>
                                    {v[0].toUpperCase() + v.slice(1)}
                                </ChipBtn>
                            ))}
                        </div>
                    ) : (
                        <div className="text-[12px] text-neutral-400">제한됨</div>
                    )}
                </div>

                {/* overflow */}
                <div>
                    <Label>
                        overflow
                        {!allow.layout.has('overflow') && <DisabledHint reason={dis('overflow')!} />}
                    </Label>
                    {allow.layout.has('overflow') ? (
                        <MiniSelect
                            value={el.overflow as string | undefined}
                            options={['visible', 'hidden', 'scroll', 'auto']}
                            onChange={(v) => patch({ overflow: v })}
                        />
                    ) : (
                        <div className="text-[12px] text-neutral-400">제한됨</div>
                    )}
                </div>

                {/* width / height (inline 숨김) */}
                {!isInline ? (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label>
                                width
                                {!allow.layout.has('width') && <DisabledHint reason={dis('width')!} />}
                            </Label>
                            {allow.layout.has('width') ? (
                                <MiniInput value={el.width as string | number | undefined} onChange={(v) => patch({ width: v })} />
                            ) : (
                                <div className="text-[12px] text-neutral-400">제한됨</div>
                            )}
                        </div>
                        <div>
                            <Label>
                                height
                                {!allow.layout.has('height') && <DisabledHint reason={dis('height')!} />}
                            </Label>
                            {allow.layout.has('height') ? (
                                <MiniInput value={el.height as string | number | undefined} onChange={(v) => patch({ height: v })} />
                            ) : (
                                <div className="text-[12px] text-neutral-400">제한됨</div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-[12px] text-neutral-400">display:inline에서는 width/height 설정 불가</div>
                )}

                {/* Flex 상세 — 주/교차 축 아이콘 자동 전환 */}
                {container && (el.display as string) === 'flex' && (
                    <div className="mt-2 space-y-2">
                        {(() => {
                            const dir = (el.flexDirection as string) ?? 'row';
                            const isColumn = dir === 'column' || dir === 'column-reverse';

                            const justifyIcons: { v: string; title: string; I: LucideIconCmp }[] = isColumn
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

                            const alignIcons: { v: string; title: string; I: LucideIconCmp }[] = isColumn
                                ? [
                                    { v: 'flex-start', title: 'flex-start', I: AlignStartHorizontal },
                                    { v: 'center', title: 'center', I: AlignCenterHorizontal },
                                    { v: 'flex-end', title: 'flex-end', I: AlignEndHorizontal },
                                    { v: 'stretch', title: 'stretch', I: StretchHorizontal },
                                ]
                                : [
                                    { v: 'flex-start', title: 'flex-start', I: AlignStartVertical },
                                    { v: 'center', title: 'center', I: AlignCenterVertical },
                                    { v: 'flex-end', title: 'flex-end', I: AlignEndVertical },
                                    { v: 'stretch', title: 'stretch', I: StretchVertical },
                                ];

                            return (
                                <>
                                    {/* direction */}
                                    <div>
                                        <Label>
                                            direction
                                            {!allow.flex.has('flexDirection') && <DisabledHint reason={dis('flexDirection')!} />}
                                        </Label>
                                        <div className="grid grid-cols-4 gap-1">
                                            {[
                                                { v: 'row', title: 'row', I: GalleryHorizontal },
                                                { v: 'row-reverse', title: 'row-reverse', I: ArrowLeftRight },
                                                { v: 'column', title: 'column', I: GalleryVertical },
                                                { v: 'column-reverse', title: 'column-reverse', I: ArrowUpDown },
                                            ].map(({ v, title, I }) => (
                                                <IconBtn
                                                    key={v}
                                                    title={title}
                                                    onClick={() => patch({ flexDirection: v })}
                                                    disabled={!allow.flex.has('flexDirection')}
                                                >
                                                    <I size={16} />
                                                </IconBtn>
                                            ))}
                                        </div>
                                    </div>

                                    {/* justify */}
                                    <div>
                                        <Label>
                                            justify
                                            {!allow.flex.has('justifyContent') && <DisabledHint reason={dis('justifyContent')!} />}
                                        </Label>
                                        <div className="grid grid-cols-6 gap-1">
                                            {justifyIcons.map(({ v, title, I }) => (
                                                <IconBtn
                                                    key={v}
                                                    title={title}
                                                    onClick={() => patch({ justifyContent: v })}
                                                    disabled={!allow.flex.has('justifyContent')}
                                                >
                                                    <I size={16} />
                                                </IconBtn>
                                            ))}
                                        </div>
                                    </div>

                                    {/* align */}
                                    <div>
                                        <Label>
                                            align
                                            {!allow.flex.has('alignItems') && <DisabledHint reason={dis('alignItems')!} />}
                                        </Label>
                                        <div className="grid grid-cols-4 gap-1">
                                            {alignIcons.map(({ v, title, I }) => (
                                                <IconBtn
                                                    key={v}
                                                    title={title}
                                                    onClick={() => patch({ alignItems: v })}
                                                    disabled={!allow.flex.has('alignItems')}
                                                >
                                                    <I size={16} />
                                                </IconBtn>
                                            ))}
                                        </div>
                                    </div>

                                    {/* gap */}
                                    <div>
                                        <Label>
                                            gap {!allow.flex.has('gap') && <DisabledHint reason={dis('gap')!} />}
                                        </Label>
                                        {allow.flex.has('gap') ? (
                                            <MiniInput value={el.gap as string | number | undefined} onChange={(v) => patch({ gap: v })} />
                                        ) : (
                                            <div className="text-[12px] text-neutral-400">제한됨</div>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* Grid 상세 — 프리셋 + 상세 v1 (Layout 섹션 내부) */}
                {container && (el.display as string) === 'grid' && (
                    <div className="mt-2 space-y-2">
                        {(() => {
                            const parseRepeat = (v: unknown): number | null => {
                                if (typeof v !== 'string') return null;
                                const m = v.trim().match(/^repeat\((\d+),\s*1fr\)$/);
                                return m ? Number(m[1]) : null;
                            };
                            const cols = parseRepeat(el.gridTemplateColumns);
                            const rows = parseRepeat(el.gridTemplateRows);

                            const setCols = (n: number | 'auto') => {
                                if (!allow.grid.has('gridTemplateColumns')) return;
                                if (n === 'auto') patch({ gridTemplateColumns: undefined } as CSSDict);
                                else patch({ gridTemplateColumns: `repeat(${n}, 1fr)` } as CSSDict);
                            };
                            const setRows = (n: number | 'auto') => {
                                if (!allow.grid.has('gridTemplateRows')) return;
                                if (n === 'auto') patch({ gridTemplateRows: undefined } as CSSDict);
                                else patch({ gridTemplateRows: `repeat(${n}, 1fr)` } as CSSDict);
                            };

                            return (
                                <>
                                    {/* Columns */}
                                    <div>
                                        <Label>
                                            columns {!allow.grid.has('gridTemplateColumns') && <DisabledHint reason={dis('gridTemplateColumns')!} />}
                                        </Label>
                                        {allow.grid.has('gridTemplateColumns') ? (
                                            <div className="flex items-center gap-1 flex-wrap">
                                                <ChipBtn title="Auto" onClick={() => setCols('auto')} active={cols === null}>
                                                    Auto
                                                </ChipBtn>
                                                {[1, 2, 3, 4, 5, 6].map((n) => (
                                                    <ChipBtn key={n} title={`${n}`} onClick={() => setCols(n)} active={cols === n}>
                                                        {n}
                                                    </ChipBtn>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-[12px] text-neutral-400">제한됨</div>
                                        )}
                                    </div>

                                    {/* Rows */}
                                    <div>
                                        <Label>
                                            rows {!allow.grid.has('gridTemplateRows') && <DisabledHint reason={dis('gridTemplateRows')!} />}
                                        </Label>
                                        {allow.grid.has('gridTemplateRows') ? (
                                            <div className="flex items-center gap-1 flex-wrap">
                                                <ChipBtn title="Auto" onClick={() => setRows('auto')} active={rows === null}>
                                                    Auto
                                                </ChipBtn>
                                                {[1, 2, 3, 4].map((n) => (
                                                    <ChipBtn key={n} title={`${n}`} onClick={() => setRows(n)} active={rows === n}>
                                                        {n}
                                                    </ChipBtn>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-[12px] text-neutral-400">제한됨</div>
                                        )}
                                    </div>

                                    {/* Gap / RowGap / ColumnGap */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <Label>gap {!allow.grid.has('gap') && <DisabledHint reason={dis('gap')!} />}</Label>
                                            {allow.grid.has('gap') ? (
                                                <MiniInput value={el.gap as string | number | undefined} onChange={(v) => patch({ gap: v })} />
                                            ) : (
                                                <div className="text-[12px] text-neutral-400">제한됨</div>
                                            )}
                                        </div>
                                        <div>
                                            <Label>
                                                rowGap {!allow.grid.has('rowGap') && <DisabledHint reason={dis('rowGap')!} />}
                                            </Label>
                                            {allow.grid.has('rowGap') ? (
                                                <MiniInput
                                                    value={el.rowGap as string | number | undefined}
                                                    onChange={(v) => patch({ rowGap: v })}
                                                />
                                            ) : (
                                                <div className="text-[12px] text-neutral-400">제한됨</div>
                                            )}
                                        </div>
                                        <div>
                                            <Label>
                                                columnGap {!allow.grid.has('columnGap') && <DisabledHint reason={dis('columnGap')!} />}
                                            </Label>
                                            {allow.grid.has('columnGap') ? (
                                                <MiniInput
                                                    value={el.columnGap as string | number | undefined}
                                                    onChange={(v) => patch({ columnGap: v })}
                                                />
                                            ) : (
                                                <div className="text-[12px] text-neutral-400">제한됨</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Auto-flow */}
                                    <div>
                                        <Label>
                                            auto-flow {!allow.grid.has('gridAutoFlow') && <DisabledHint reason={dis('gridAutoFlow')!} />}
                                        </Label>
                                        {allow.grid.has('gridAutoFlow') ? (
                                            <MiniSelect
                                                value={el.gridAutoFlow as string | undefined}
                                                options={['row', 'column', 'dense', 'row dense', 'column dense']}
                                                onChange={(v) => patch({ gridAutoFlow: v })}
                                            />
                                        ) : (
                                            <div className="text-[12px] text-neutral-400">제한됨</div>
                                        )}
                                    </div>

                                    {/* Alignments */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label>
                                                justifyItems {!allow.grid.has('justifyItems') && <DisabledHint reason={dis('justifyItems')!} />}
                                            </Label>
                                            {allow.grid.has('justifyItems') ? (
                                                <MiniSelect
                                                    value={el.justifyItems as string | undefined}
                                                    options={['start', 'center', 'end', 'stretch']}
                                                    onChange={(v) => patch({ justifyItems: v })}
                                                />
                                            ) : (
                                                <div className="text-[12px] text-neutral-400">제한됨</div>
                                            )}
                                        </div>
                                        <div>
                                            <Label>
                                                alignItems {!allow.grid.has('alignItems') && <DisabledHint reason={dis('alignItems')!} />}
                                            </Label>
                                            {allow.grid.has('alignItems') ? (
                                                <MiniSelect
                                                    value={el.alignItems as string | undefined}
                                                    options={['start', 'center', 'end', 'stretch']}
                                                    onChange={(v) => patch({ alignItems: v })}
                                                />
                                            ) : (
                                                <div className="text-[12px] text-neutral-400">제한됨</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label>
                                                justifyContent {!allow.grid.has('justifyContent') && (
                                                <DisabledHint reason={dis('justifyContent')!} />
                                            )}
                                            </Label>
                                            {allow.grid.has('justifyContent') ? (
                                                <MiniSelect
                                                    value={el.justifyContent as string | undefined}
                                                    options={['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly']}
                                                    onChange={(v) => patch({ justifyContent: v })}
                                                />
                                            ) : (
                                                <div className="text-[12px] text-neutral-400">제한됨</div>
                                            )}
                                        </div>
                                        <div>
                                            <Label>
                                                alignContent {!allow.grid.has('alignContent') && <DisabledHint reason={dis('alignContent')!} />}
                                            </Label>
                                            {allow.grid.has('alignContent') ? (
                                                <MiniSelect
                                                    value={el.alignContent as string | undefined}
                                                    options={['start', 'center', 'end', 'stretch', 'space-between', 'space-around']}
                                                    onChange={(v) => patch({ alignContent: v })}
                                                />
                                            ) : (
                                                <div className="text-[12px] text-neutral-400">제한됨</div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}
            </Section>

            {/* 2) Typography */}
            <Section
                title="Typography"
                open={open.typo}
                onToggle={() => setOpen({ ...open, typo: !open.typo })}
            >
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label>
                            color {!allow.typo.has('color') && <DisabledHint reason={dis('color')!} />}
                        </Label>
                        {allow.typo.has('color') ? (
                            <div className="flex items-center gap-2">
                                <ColorField value={el.color as string | undefined} onChange={(v) => patch({ color: v })} />
                                <button
                                    className="px-2 py-1 border rounded text-[12px]"
                                    onClick={() => patch({ color: undefined })}
                                    type="button"
                                >
                                    Clear
                                </button>
                            </div>
                        ) : (
                            <div className="text-[12px] text-neutral-400">제한됨</div>
                        )}
                    </div>
                    <div>
                        <Label>
                            fontSize {!allow.typo.has('fontSize') && <DisabledHint reason={dis('fontSize')!} />}
                        </Label>
                        {allow.typo.has('fontSize') ? (
                            <MiniInput value={el.fontSize as string | number | undefined} onChange={(v) => patch({ fontSize: v })} />
                        ) : (
                            <div className="text-[12px] text-neutral-400">제한됨</div>
                        )}
                    </div>
                    <div>
                        <Label>
                            fontWeight {!allow.typo.has('fontWeight') && <DisabledHint reason={dis('fontWeight')!} />}
                        </Label>
                        {allow.typo.has('fontWeight') ? (
                            <div className="grid grid-cols-2 gap-1">
                                {['400', '700'].map((w) => (
                                    <ChipBtn key={w} title={w} onClick={() => patch({ fontWeight: w })}>
                                        {w === '400' ? 'Regular' : 'Bold'}
                                    </ChipBtn>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[12px] text-neutral-400">제한됨</div>
                        )}
                    </div>
                    <div>
                        <Label>
                            textAlign {!allow.typo.has('textAlign') && <DisabledHint reason={dis('textAlign')!} />}
                        </Label>
                        {allow.typo.has('textAlign') ? (
                            <div className="grid grid-cols-3 gap-1">
                                {['left', 'center', 'right'].map((a) => (
                                    <ChipBtn key={a} title={a} onClick={() => patch({ textAlign: a })}>
                                        {a}
                                    </ChipBtn>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[12px] text-neutral-400">제한됨</div>
                        )}
                    </div>
                </div>
            </Section>

            {/* 3) Position */}
            <Section
                title="Position"
                open={open.position}
                onToggle={() => setOpen({ ...open, position: !open.position })}
            >
                <div>
                    <Label>
                        position {!allow.position.has('position') && <DisabledHint reason={dis('position')!} />}
                    </Label>
                </div>
                {allow.position.has('position') ? (
                    <MiniSelect
                        value={el.position as string | undefined}
                        options={['static', 'relative', 'absolute', 'fixed', 'sticky']}
                        onChange={(v) => patch({ position: v })}
                    />
                ) : (
                    <div className="text-[12px] text-neutral-400">제한됨</div>
                )}

                {!isStatic ? (
                    <div className="grid grid-cols-4 gap-2">
                        {(['top', 'left', 'right', 'bottom'] as string[]).map((k) => (
                            <div key={k}>
                                <Label>{k}</Label>
                                <MiniInput
                                    value={el[k] as string | number | undefined}
                                    onChange={(v) => patch({ [k]: v } as CSSDict)}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-[12px] text-neutral-400">position:static에서는 offset을 설정할 수 없습니다.</div>
                )}
            </Section>

            {/* 4) Margin & Padding */}
            <Section
                title="Margin & Padding"
                open={open.spacing}
                onToggle={() => setOpen({ ...open, spacing: !open.spacing })}
            >
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label>
                            margin {!allow.spacing.has('margin') && <DisabledHint reason={dis('margin')!} />}
                        </Label>
                        {allow.spacing.has('margin') ? (
                            <MiniInput value={el.margin as string | number | undefined} onChange={(v) => patch({ margin: v })} />
                        ) : (
                            <div className="text-[12px] text-neutral-400">제한됨</div>
                        )}
                    </div>
                    <div>
                        <Label>
                            padding {!allow.spacing.has('padding') && <DisabledHint reason={dis('padding')!} />}
                        </Label>
                        {allow.spacing.has('padding') ? (
                            <MiniInput value={el.padding as string | number | undefined} onChange={(v) => patch({ padding: v })} />
                        ) : (
                            <div className="text-[12px] text-neutral-400">제한됨</div>
                        )}
                    </div>
                </div>
            </Section>

            {/* 5) Border */}
            <Section
                title="Border"
                open={open.border}
                onToggle={() => setOpen({ ...open, border: !open.border })}
            >
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label>
                            border {!allow.border.has('border') && <DisabledHint reason={dis('border')!} />}
                        </Label>
                        {allow.border.has('border') ? (
                            <MiniInput value={el.border as string | number | undefined} onChange={(v) => patch({ border: v })} />
                        ) : (
                            <div className="text-[12px] text-neutral-400">제한됨</div>
                        )}
                    </div>
                    <div>
                        <Label>
                            borderRadius {!allow.border.has('borderRadius') && <DisabledHint reason={dis('borderRadius')!} />}
                        </Label>
                        {allow.border.has('borderRadius') ? (
                            <MiniInput
                                value={el.borderRadius as string | number | undefined}
                                onChange={(v) => patch({ borderRadius: v })}
                            />
                        ) : (
                            <div className="text-[12px] text-neutral-400">제한됨</div>
                        )}
                    </div>
                </div>
            </Section>

            {/* 6) Background — 모드 + Gradient 프리셋 + Image URL/Upload */}
            <Section
                title="Background"
                open={open.background}
                onToggle={() => setOpen({ ...open, background: !open.background })}
            >
                {/* 모드 */}
                <div>
                    <Label>mode</Label>
                    <div className="flex items-center gap-1 flex-wrap">
                        {(['none', 'color', 'image', 'transparent'] as string[]).map((m) => (
                            <ChipBtn key={m} title={m} onClick={() => setBgMode(m as BgMode)}>
                                {m}
                            </ChipBtn>
                        ))}
                    </div>
                </div>

                {/* Color */}
                {currentBgMode === 'color' && (
                    <div>
                        <Label>
                            backgroundColor
                            {!allow.background.has('backgroundColor') && <DisabledHint reason={dis('backgroundColor')!} />}
                        </Label>
                        {allow.background.has('backgroundColor') ? (
                            <div className="flex items-center gap-2">
                                <ColorField
                                    value={el.backgroundColor as string | undefined}
                                    onChange={(v) => patch({ backgroundColor: v })}
                                />
                                <button
                                    className="px-2 py-1 border rounded text-[12px]"
                                    onClick={() => patch({ backgroundColor: undefined })}
                                    type="button"
                                >
                                    Clear
                                </button>
                            </div>
                        ) : (
                            <div className="text-[12px] text-neutral-400">제한됨</div>
                        )}
                    </div>
                )}

                {/* Image / Gradient */}
                {currentBgMode === 'image' && (
                    <div className="space-y-2">
                        {/* Gradient Presets */}
                        <div>
                            <Label>gradient presets</Label>
                            <div className="flex items-center gap-1 flex-wrap">
                                {gradients.map((g) => (
                                    <ChipBtn
                                        key={g.name}
                                        title={g.name}
                                        onClick={() => applyGradient(g.css)}
                                        disabled={!allow.background.has('backgroundImage')}
                                    >
                                        {g.name}
                                    </ChipBtn>
                                ))}
                                <button
                                    className="px-2 py-1 border rounded text-[12px]"
                                    onClick={() => patch({ backgroundImage: undefined })}
                                    disabled={!allow.background.has('backgroundImage')}
                                    type="button"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        {/* URL */}
                        <div>
                            <Label>URL</Label>
                            {allow.background.has('backgroundImage') ? (
                                <div className="flex items-center gap-2">
                                    <MiniInput value={bgUrlDraft} onChange={setBgUrlDraft} placeholder='https://… or data:image/…' />
                                    <button className="px-2 py-1 border rounded text-[12px]" onClick={applyBgUrl} type="button">
                                        Apply
                                    </button>
                                    <button
                                        className="px-2 py-1 border rounded text-[12px]"
                                        onClick={() => patch({ backgroundImage: undefined })}
                                        type="button"
                                    >
                                        Clear
                                    </button>
                                </div>
                            ) : (
                                <div className="text-[12px] text-neutral-400">제한됨</div>
                            )}
                        </div>

                        {/* Upload */}
                        <div>
                            <Label>Upload</Label>
                            {allow.background.has('backgroundImage') ? (
                                <input className="block w-full text-[12px]" type="file" accept="image/*" onChange={onBgFile} />
                            ) : (
                                <div className="text-[12px] text-neutral-400">제한됨</div>
                            )}
                        </div>

                        {/* Size/Repeat/Position */}
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <Label>
                                    backgroundSize {!allow.background.has('backgroundSize') && (
                                    <DisabledHint reason={dis('backgroundSize')!} />
                                )}
                                </Label>
                                {allow.background.has('backgroundSize') ? (
                                    <MiniSelect
                                        value={el.backgroundSize as string | undefined}
                                        options={['cover', 'contain', 'auto']}
                                        onChange={(v) => patch({ backgroundSize: v })}
                                    />
                                ) : (
                                    <div className="text-[12px] text-neutral-400">제한됨</div>
                                )}
                            </div>

                            <div>
                                <Label>
                                    backgroundRepeat {!allow.background.has('backgroundRepeat') && (
                                    <DisabledHint reason={dis('backgroundRepeat')!} />
                                )}
                                </Label>
                                {allow.background.has('backgroundRepeat') ? (
                                    <MiniSelect
                                        value={el.backgroundRepeat as string | undefined}
                                        options={['no-repeat', 'repeat', 'repeat-x', 'repeat-y']}
                                        onChange={(v) => patch({ backgroundRepeat: v })}
                                    />
                                ) : (
                                    <div className="text-[12px] text-neutral-400">제한됨</div>
                                )}
                            </div>

                            <div>
                                <Label>
                                    backgroundPosition {!allow.background.has('backgroundPosition') && (
                                    <DisabledHint reason={dis('backgroundPosition')!} />
                                )}
                                </Label>
                                {allow.background.has('backgroundPosition') ? (
                                    <MiniSelect
                                        value={el.backgroundPosition as string | undefined}
                                        options={['left top', 'center center', 'right bottom']}
                                        onChange={(v) => patch({ backgroundPosition: v })}
                                    />
                                ) : (
                                    <div className="text-[12px] text-neutral-400">제한됨</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Section>

            {/* 7) Effects — boxShadow / filter 프리셋 + (전문가) 세부 조절 + opacity */}
            <Section
                title="Effects"
                open={open.effects}
                onToggle={() => setOpen({ ...open, effects: !open.effects })}
            >
                {/* boxShadow */}
                <div>
                    <Label>boxShadow {!allow.effects.has('boxShadow') && <DisabledHint reason={dis('boxShadow')!} />}</Label>
                    {allow.effects.has('boxShadow') ? (
                        <>
                            {/* Presets */}
                            <div className="flex items-center gap-1 flex-wrap mb-1">
                                {[
                                    { name: 'None', v: '' },
                                    { name: 'XS', v: '0 1px 1px rgba(0,0,0,.06)' },
                                    { name: 'SM', v: '0 1px 2px rgba(0,0,0,.12)' },
                                    { name: 'MD', v: '0 2px 8px rgba(0,0,0,.15)' },
                                    { name: 'LG', v: '0 6px 16px rgba(0,0,0,.18)' },
                                    { name: 'XL', v: '0 12px 32px rgba(0,0,0,.22)' },
                                ].map((p) => (
                                    <ChipBtn key={p.name} title={p.name} onClick={() => patch({ boxShadow: p.v || undefined })}>
                                        {p.name}
                                    </ChipBtn>
                                ))}
                            </div>

                            {/* Raw input (항상 제공) */}
                            <MiniInput value={el.boxShadow as string | undefined} onChange={(v) => patch({ boxShadow: v })} />

                            {/* 고급(전문가 모드) — 요소별 슬라이더/입력 */}
                            {expert && (
                                <div className="grid grid-cols-12 gap-2 mt-2 items-center">
                                    <label className="col-span-2 text-[12px] text-neutral-600">x</label>
                                    <input
                                        className="col-span-7"
                                        type="range"
                                        min={-32}
                                        max={32}
                                        value={shadow.x}
                                        onChange={(e) => commitShadow({ x: Number(e.target.value) })}
                                    />
                                    <MiniInput
                                        value={shadow.x}
                                        onChange={(v) => commitShadow({ x: Number(v) || 0 })}
                                    />

                                    <label className="col-span-2 text-[12px] text-neutral-600">y</label>
                                    <input
                                        className="col-span-7"
                                        type="range"
                                        min={-32}
                                        max={32}
                                        value={shadow.y}
                                        onChange={(e) => commitShadow({ y: Number(e.target.value) })}
                                    />
                                    <MiniInput value={shadow.y} onChange={(v) => commitShadow({ y: Number(v) || 0 })} />

                                    <label className="col-span-2 text-[12px] text-neutral-600">blur</label>
                                    <input
                                        className="col-span-7"
                                        type="range"
                                        min={0}
                                        max={64}
                                        value={shadow.blur}
                                        onChange={(e) => commitShadow({ blur: Number(e.target.value) })}
                                    />
                                    <MiniInput value={shadow.blur} onChange={(v) => commitShadow({ blur: Math.max(0, Number(v) || 0) })} />

                                    <label className="col-span-2 text-[12px] text-neutral-600">spread</label>
                                    <input
                                        className="col-span-7"
                                        type="range"
                                        min={-32}
                                        max={32}
                                        value={shadow.spread}
                                        onChange={(e) => commitShadow({ spread: Number(e.target.value) })}
                                    />
                                    <MiniInput value={shadow.spread} onChange={(v) => commitShadow({ spread: Number(v) || 0 })} />

                                    <label className="col-span-2 text-[12px] text-neutral-600">color</label>
                                    <div className="col-span-10 flex items-center gap-2">
                                        <input
                                            type="color"
                                            className="w-8 h-8 border rounded"
                                            value={
                                                typeof shadow.color === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(shadow.color)
                                                    ? (shadow.color as string)
                                                    : '#000000'
                                            }
                                            onChange={(e) => commitShadow({ color: e.target.value })}
                                        />
                                        <MiniInput value={shadow.color} onChange={(v) => commitShadow({ color: v })} />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-[12px] text-neutral-400">제한됨</div>
                    )}
                </div>

                {/* filter */}
                <div>
                    <Label>filter {!allow.effects.has('filter') && <DisabledHint reason={dis('filter')!} />}</Label>
                    {allow.effects.has('filter') ? (
                        <>
                            {/* Presets */}
                            <div className="flex items-center gap-1 flex-wrap mb-1">
                                {[
                                    { name: 'None', v: '' },
                                    { name: 'Blur', v: 'blur(4px)' },
                                    { name: 'Bright+', v: 'brightness(110%)' },
                                    { name: 'Dark-', v: 'brightness(90%)' },
                                    { name: 'Gray', v: 'grayscale(100%)' },
                                    { name: 'Sepia', v: 'sepia(100%)' },
                                ].map((p) => (
                                    <ChipBtn key={p.name} title={p.name} onClick={() => patch({ filter: p.v || undefined })}>
                                        {p.name}
                                    </ChipBtn>
                                ))}
                            </div>

                            {/* Raw input (항상 제공) */}
                            <MiniInput value={el.filter as string | undefined} onChange={(v) => patch({ filter: v })} />

                            {/* 고급(전문가 모드) — 요소별 슬라이더/숫자 */}
                            {expert && (
                                <div className="grid grid-cols-12 gap-2 mt-2 items-center">
                                    <label className="col-span-3 text-[12px] text-neutral-600">blur(px)</label>
                                    <input
                                        className="col-span-6"
                                        type="range"
                                        min={0}
                                        max={20}
                                        value={fvals.blur}
                                        onChange={(e) => commitFilter({ blur: Number(e.target.value) })}
                                    />
                                    <MiniInput value={fvals.blur} onChange={(v) => commitFilter({ blur: Math.max(0, Number(v) || 0) })} />

                                    <label className="col-span-3 text-[12px] text-neutral-600">brightness(%)</label>
                                    <input
                                        className="col-span-6"
                                        type="range"
                                        min={0}
                                        max={200}
                                        value={fvals.brightness}
                                        onChange={(e) => commitFilter({ brightness: Number(e.target.value) })}
                                    />
                                    <MiniInput
                                        value={fvals.brightness}
                                        onChange={(v) => commitFilter({ brightness: Math.max(0, Number(v) || 0) })}
                                    />

                                    <label className="col-span-3 text-[12px] text-neutral-600">contrast(%)</label>
                                    <input
                                        className="col-span-6"
                                        type="range"
                                        min={0}
                                        max={200}
                                        value={fvals.contrast}
                                        onChange={(e) => commitFilter({ contrast: Number(e.target.value) })}
                                    />
                                    <MiniInput
                                        value={fvals.contrast}
                                        onChange={(v) => commitFilter({ contrast: Math.max(0, Number(v) || 0) })}
                                    />

                                    <label className="col-span-3 text-[12px] text-neutral-600">saturate(%)</label>
                                    <input
                                        className="col-span-6"
                                        type="range"
                                        min={0}
                                        max={200}
                                        value={fvals.saturate}
                                        onChange={(e) => commitFilter({ saturate: Number(e.target.value) })}
                                    />
                                    <MiniInput
                                        value={fvals.saturate}
                                        onChange={(v) => commitFilter({ saturate: Math.max(0, Number(v) || 0) })}
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-[12px] text-neutral-400">제한됨</div>
                    )}
                </div>

                {/* opacity — 슬라이더 + 숫자 동시 표기 */}
                <div>
                    <Label>opacity {!allow.effects.has('opacity') && <DisabledHint reason={dis('opacity')!} />}</Label>
                    {allow.effects.has('opacity') ? (
                        <div className="grid grid-cols-12 gap-2 items-center">
                            <input
                                className="col-span-9"
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={typeof el.opacity === 'number' ? el.opacity : 1}
                                onChange={(e) => {
                                    const n = Number(e.target.value);
                                    const v = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
                                    patch({ opacity: v });
                                }}
                            />
                            <MiniInput
                                value={typeof el.opacity === 'number' ? el.opacity : 1}
                                onChange={(v) => {
                                    const n = Number(v);
                                    const clamped = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
                                    patch({ opacity: clamped });
                                }}
                            />
                        </div>
                    ) : (
                        <div className="text-[12px] text-neutral-400">제한됨</div>
                    )}
                </div>
            </Section>

            {/* 9) Custom */}
            <Section
                title="Custom"
                open={open.custom}
                onToggle={() => setOpen({ ...open, custom: !open.custom })}
            >
                <div className="text-[12px] text-neutral-500 mb-1">
                    허용된 CSS 키만 추가/편집됩니다. (템플릿/TagPolicy 반영)
                </div>

                {/* 기존 값 나열(알려진 키 제외) */}
                <div className="space-y-1">
                    {Object.entries(el)
                        .filter(([k]) => !Object.values(KEYS).flat().includes(k))
                        .map(([k, v]) => (
                            <div key={k} className="flex items-center gap-2">
                                <div className="w-40 text-[12px]">{k}</div>
                                <MiniInput
                                    value={v as string | number | undefined}
                                    onChange={(nv) => patch({ [k]: nv } as CSSDict)}
                                />
                                <button
                                    className="px-2 py-1 border rounded text-[12px]"
                                    onClick={() => patch({ [k]: undefined } as CSSDict)}
                                    type="button"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                </div>

                {/* 추가 입력 */}
                <div className="mt-2 flex items-center gap-2">
                    <input
                        className="flex-1 px-2 py-1 border rounded text-[12px]"
                        placeholder="css-key"
                        value={customKey}
                        onChange={(e) => setCustomKey(e.target.value)}
                    />
                    <input
                        className="flex-[2] px-2 py-1 border rounded text-[12px]"
                        placeholder="value"
                        value={customVal}
                        onChange={(e) => setCustomVal(e.target.value)}
                    />
                    <button className="px-2 py-1 border rounded text-[12px]" onClick={onAddCustom} type="button">
                        Add
                    </button>
                </div>
            </Section>
        </div>
    );
}