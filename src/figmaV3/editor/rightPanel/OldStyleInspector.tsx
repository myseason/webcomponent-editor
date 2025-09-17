'use client';

import * as React from 'react';

// 공용 UI
import {
    SectionFrame,
    GroupHeader,
    RowShell,
    LeftCell,
    RightCell,
    InlineInfo,
} from './util/ui';

// 단일 컨트롤 렌더 함수
import { renderValueControl } from './util/controls';

// 타입들
import type { PropertySpec } from './util/types';

// 아이콘
import {
    Layout as LayoutIcon,
    Maximize,
    MoveHorizontal,
    Type as TypeIcon,
    Text as TextIcon,
    Palette,
    Sparkles,
    Hand,
    Square,
    Grid2x2,
    Wand2,
} from 'lucide-react';

import { INITIAL_STYLE_DEFAULTS } from './sections/defaultStyles';


type StyleValues = Record<string, string | undefined>;
type SetStyleValue = (k: string, v: string | undefined) => void;
// ─────────────────────────────────────────────────────────────
// 공통 타입/유틸
// ─────────────────────────────────────────────────────────────
const GROUP_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    'Display & Flow': Grid2x2,
    Sizing: Maximize,
    Spacing: MoveHorizontal,
    Font: TypeIcon,
    Text: TextIcon,
    Border: Square,
};

const SECTION_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    Layout: LayoutIcon,
    Typography: TypeIcon,
    Appearance: Palette,
    Effects: Sparkles,
    Interactivity: Hand,
};

// ── 커스텀 CSS 유틸 ─────────────────────────────────────────
// 문자열 "a:b; c:d" → { a:'b', c:'d' }
function parseCssDeclarations(input?: string): Record<string, string> {
    const out: Record<string, string> = {};
    const s = (input || '').trim();
    if (!s) return out;
    s.split(';').forEach(line => {
        const t = line.trim();
        if (!t) return;
        const idx = t.indexOf(':');
        if (idx < 0) return;
        const k = t.slice(0, idx).trim();
        const v = t.slice(idx + 1).trim();
        if (k) out[k] = v;
    });
    return out;
}

// "--a:1; --b:2" → { '--a':'1', '--b':'2' }
function parseCssVars(input?: string): Record<string, string> {
    const obj = parseCssDeclarations(input);
    const out: Record<string,string> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (k.startsWith('--')) out[k] = v;
    }
    return out;
}

// "data-id: hero; aria-hidden: true" → { 'data-id':'hero', 'aria-hidden':'true' }
function parseAttrs(input?: string): Record<string, string> {
    return parseCssDeclarations(input);
}

// Inspector 바깥(상위 편집기/미리보기)에서 values → 실제 style/className/attrs로 변환할 때
function buildOutput(values: Record<string,string>) {
    const mode = values.__ovrMode || 'merge';

    const className = values.__ovrClass || '';
    const rawCss = parseCssDeclarations(values.__ovrRawCss);
    const cssVars = parseCssVars(values.__ovrCssVars);
    const attrs = parseAttrs(values.__ovrAttrs);

    const inspectorStyle = /* 기존 Inspector 로직으로 계산한 style 객체 */ {};

    // CSS 변수는 style에 합치기
    const varsAsStyle = Object.fromEntries(Object.entries(cssVars).map(([k, v]) => [k, v]));

    let styleOut = {};
    if (mode === 'override-all') {
        styleOut = { ...varsAsStyle, ...rawCss }; // 커스텀만
    } else if (mode === 'merge') {
        styleOut = { ...inspectorStyle, ...varsAsStyle, ...rawCss }; // 커스텀이 우선
    } else { // class-only
        styleOut = inspectorStyle;
    }

    // 클래스는 항상 append (상위에서 기존 className이 있다면 병합)
    const classOut = className; // 상위에서 join 처리

    return { style: styleOut, className: classOut, attrs };
}

// ── 파싱/시드 유틸 ───────────────────────────────────────────
const isEmpty = (v: unknown) => v == null || String(v).trim() === '';

function setIfEmpty(values: StyleValues, setValue: SetStyleValue, key: string, next?: string) {
    //if (!isEmpty(values[key]) || isEmpty(next)) return;
    setValue(key, next);
}

// ─────────────────────────────────────────────────────────────
//  Longhand 동기화 훅 + 간단 파서 유틸
// ─────────────────────────────────────────────────────────────
/** 상세가 열려 있는 동안, shorthand가 바뀌면 longhand를 동기화 */
function useSyncLonghand(opts: {
    expanded: Record<string, boolean>;
    detailKey: string;                 // e.g. "Layout.padding"
    shorthandKey: keyof StyleValues;        // e.g. "padding"
    values: StyleValues;
    setValue: SetStyleValue;
    parse: (raw?: string) => Record<string, string>;
    map: Record<string, string>;       // derivedKey -> longhandKey
}) {
    const { expanded, detailKey, shorthandKey, values, setValue, parse, map } = opts;
    const prevDerivedRef = React.useRef<Record<string, string>>({});

    React.useEffect(() => {
        if (!expanded[detailKey]) return; // 상세 닫힘 시 동작 안 함

        const raw = String(values[shorthandKey] ?? '');
        const nextDerived = parse(raw);
        const prevDerived = prevDerivedRef.current;

        Object.entries(map).forEach(([derivedKey, longhandKey]) => {
            const cur = String(values[longhandKey] ?? '');
            const prev = prevDerived[derivedKey] ?? '';
            const next = nextDerived[derivedKey] ?? '';

            // 규칙:
            //  - longhand가 비어있거나, 이전에 shorthand로 채워졌던 값(prev)과 같으면 갱신
            //  - 사용자가 상세에서 직접 바꾼 값(=prev와 다르면)은 유지
            const shouldUpdate = cur === '' || cur === prev;
            if (shouldUpdate && next !== cur) setValue(longhandKey, next);
        });

        prevDerivedRef.current = nextDerived;
    }, [expanded[detailKey], values[shorthandKey]]);
}

/** padding/margin 같은 1~4 값 box shorthand 확장 */
function expandBoxShorthand(raw: string) {
    const t = (raw || '').trim();
    if (!t) return { top: '', right: '', bottom: '', left: '' };
    const parts = t.split(/\s+/).slice(0, 4);
    const [a, b, c, d] = parts;
    if (parts.length === 1) return { top: a, right: a, bottom: a, left: a };
    if (parts.length === 2) return { top: a, right: b, bottom: a, left: b };
    if (parts.length === 3) return { top: a, right: b, bottom: c, left: b };
    return { top: a, right: b, bottom: c, left: d };
}

/** border/outline: "1px solid red" → width/style/color */
function parseBorderLike(raw: string) {
    const t = (raw || '').trim();
    if (!t) return { width: '', style: '', color: '' };
    // 매우 단순한 토큰 분리(공백 기준) — 필요한 케이스 우선
    const parts = t.split(/\s+/);
    let width = '', style = '', color = '';

    for (const p of parts) {
        if (!width && /(^\d+(\.\d+)?(px|em|rem|%)?$)|(^thin$|^medium$|^thick$)/i.test(p)) { width = p; continue; }
        if (!style && /^(none|hidden|solid|dashed|dotted|double|groove|ridge|inset|outset)$/i.test(p)) { style = p; continue; }
        if (!color && (/^#([0-9a-f]{3,8})$/i.test(p) || /^rgb|^hsl/i.test(p) || /^[a-zA-Z]+$/.test(p))) { color = p; continue; }
    }
    return { width, style, color };
}

/** filter/transform: "fn1(x) fn2(y)" → { fn1:"fn1(x)", fn2:"fn2(y)" } */
function parseFunctionList(raw: string) {
    const t = (raw || '').trim();
    const out: Record<string, string> = {};
    if (!t) return out;
    // 느슨한 파서: 함수명(괄호열림 ~ 짝괄호) 반복
    const re = /([a-zA-Z-]+)\s*\(([^)]*)\)/g;
    let m;
    while ((m = re.exec(t))) {
        const name = m[1];
        out[name] = `${name}(${m[2]})`;
    }
    return out;
}

/** transition: "prop dur easing delay" → 각 longhand */
function parseTransition(raw: string) {
    const t = (raw || '').trim();
    if (!t) return { transitionProperty: '', transitionDuration: '', transitionTimingFunction: '', transitionDelay: '' };

    // 콤마로 여러개 올 수 있지만, 현재는 첫 항목만 처리(기본 요건 충족)
    const first = t.split(',')[0].trim();
    const tokens = first.split(/\s+/);

    let property = 'all', duration = '150ms', timing = '', delay = '';
    // duration/delay 후보: ms, s
    const timeToken = (s: string) => /^(?:\d+\.?\d*)(ms|s)$/.test(s);
    const timingToken = (s: string) =>
        /^(ease|linear|ease-in|ease-out|ease-in-out|step-start|step-end|steps\(\d+,\s*(start|end)\)|cubic-bezier\([^)]*\))$/.test(s);

    // 단순 규칙 매칭
    let i = 0;
    if (tokens[i] && !timeToken(tokens[i]) && !timingToken(tokens[i])) { property = tokens[i++]; }
    if (tokens[i] && timeToken(tokens[i])) { duration = tokens[i++]; }
    if (tokens[i] && timingToken(tokens[i])) { timing = tokens[i++]; }
    if (tokens[i] && timeToken(tokens[i])) { delay = tokens[i++]; }

    return {
        transitionProperty: property,
        transitionDuration: duration,
        transitionTimingFunction: timing,
        transitionDelay: delay,
    };
}

/** background: 매우 단순화 — url()만 정확 추출, 나머진 사용자 입력 유지 */
function parseBackground(raw: string) {
    const t = (raw || '').trim();
    const out: Record<string, string> = {
        backgroundImage: '',
        backgroundPosition: '',
        backgroundSize: '',
        backgroundRepeat: '',
        backgroundClip: '',
        backgroundOrigin: '',
        backgroundAttachment: '',
    };
    if (!t) return out;

    const urlMatch = t.match(/url\([^\)]*\)|none/);
    if (urlMatch) out.backgroundImage = urlMatch[0];

    // size: "... / <size>" 패턴
    const slash = t.split('/');
    if (slash.length > 1) {
        const right = slash[1].trim();
        const sizeToken = right.split(/\s+/)[0];
        out.backgroundSize = sizeToken;
    }

    // repeat 키워드
    const repeat = t.match(/\b(no-repeat|repeat|repeat-x|repeat-y)\b/);
    if (repeat) out.backgroundRepeat = repeat[0];

    // position (대충 2토큰)
    const pos = t.match(/\b(\d+%|\d+px|left|center|right|top|bottom)\b(?:\s+(\d+%|\d+px|left|center|right|top|bottom)\b)?/);
    if (pos) out.backgroundPosition = pos[0];

    // clip/origin/attachment 키워드(단일 선택)
    const clip = t.match(/\b(border-box|padding-box|content-box)\b/);
    if (clip) out.backgroundClip = clip[0];

    const origin = t.match(/\b(padding-box|border-box|content-box)\b/);
    if (origin) out.backgroundOrigin = origin[0];

    const attachment = t.match(/\b(scroll|fixed|local)\b/);
    if (attachment) out.backgroundAttachment = attachment[0];

    return out;
}

// ── 섹션 공통 블록 컴포넌트 ────────────────────────────────
const DependentBlock: React.FC<{
    title?: string;
    propsMap: Record<string, PropertySpec>;
    values: StyleValues;
    setValue: SetStyleValue;
    sectionKey: string;
    disabled?: boolean;
}> = ({ title, propsMap, values, setValue, sectionKey, disabled }) => {
    const entries = Object.entries(propsMap);
    if (entries.length === 0) return null;

    return (
        <div className="ml-4 border-l border-neutral-200 pl-3 mt-1">
            {title ? <InlineInfo>{title}</InlineInfo> : null}
            {entries.map(([k, p]) => {
                const v = values[k];
                return (
                    <RowShell key={`dep:${sectionKey}:${k}`}>
                        <LeftCell title={p.label?.ko ?? p.label?.en ?? k} tooltip={p.ui?.tooltip} />
                        <RightCell>
                            {renderValueControl(sectionKey, k, p, String(v ?? ''), (nv) => setValue(k, nv), disabled)}
                        </RightCell>
                    </RowShell>
                );
            })}
        </div>
    );
};

const DetailBlock: React.FC<{
    propsMap?: Record<string, PropertySpec>;
    values: StyleValues;
    setValue: SetStyleValue;
    sectionKey: string;
    disabled?: boolean;
    getDependentsFor?: (propKey: string, curVal?: string) => Array<{ title?: string; properties: Record<string, PropertySpec> }>;
}> = ({ propsMap, values, setValue, sectionKey, disabled, getDependentsFor }) => {
    if (!propsMap) return null;
    const entries = Object.entries(propsMap);
    if (entries.length === 0) return null;

    return (
        <div className="ml-4 border-l border-dashed border-neutral-200 pl-3 mt-2">
            <div className="text-[10px] text-neutral-500 mb-1 flex items-center gap-1">
                <Wand2 size={12} />
                상세
            </div>

            {entries.map(([k, p]) => {
                const v = values[k];
                return (
                    <div key={`detail:${sectionKey}:${k}`}>
                        <RowShell>
                            <LeftCell title={p.label?.ko ?? p.label?.en ?? k} tooltip={p.ui?.tooltip} />
                            <RightCell>
                                {renderValueControl(sectionKey, k, p, String(v ?? ''), (nv) => setValue(k, nv), disabled)}
                            </RightCell>
                        </RowShell>

                        {getDependentsFor &&
                            getDependentsFor(k, String(v ?? ''))?.map((dg, idx) => (
                                <DependentBlock
                                    key={`detail-dep:${sectionKey}:${k}:${idx}`}
                                    title={dg.title}
                                    propsMap={dg.properties}
                                    values={values}
                                    setValue={setValue}
                                    sectionKey={sectionKey}
                                    disabled={disabled}
                                />
                            ))}
                    </div>
                );
            })}
        </div>
    );
};

// ── 간단한 spec maker ───────────────────────────────────────
const makeChips = (
    opts: Array<string | { value: string; label?: string }>,
    extra?: { placeholder?: string; free?: boolean; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }
): PropertySpec => ({
    control: 'chips',
    options: opts.map((o) =>
        typeof o === 'string' ? { value: o } : { value: o.value, label: o.label ? { ko: o.label } : undefined }
    ),
    placeholder: extra?.placeholder,
    ui: {
        size: extra?.size ?? 'xs',
        extraInput: extra?.free
            ? { enabled: true, size: extra?.size ?? 'xs', placeholder: extra?.placeholder }
            : undefined,
    },
});

const makeIcons = (
    opts: Array<{ value: string; iconKey?: string; label?: string }>,
    size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'xs'
): PropertySpec => ({
    control: 'icons',
    options: opts.map((o) => ({
        value: o.value,
        iconKey: o.iconKey ?? o.value,
        label: o.label ? { ko: o.label } : undefined,
    })),
    ui: { size },
});

const makeSelect = (
    opts: Array<string | { value: string; label?: string }>,
    size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'sm'
): PropertySpec => ({
    control: 'select',
    options: opts.map((o) =>
        typeof o === 'string' ? { value: o } : { value: o.value, label: o.label ? { ko: o.label } : undefined }
    ),
    ui: { size },
});

const makeInput = (
    placeholder?: string,
    inputType: 'text' | 'number' | 'url' | 'time' = 'text',
    size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'xs'
): PropertySpec => ({
    control: 'input',
    placeholder,
    ui: { inputType, size },
});

const makeColor = (placeholder?: string, size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'sm'): PropertySpec => ({
    control: 'color',
    placeholder,
    ui: { size },
});

const makeRatio = (
    placeholder?: string,
    presets?: Array<{ value: string; label?: string }>,
    size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'xs'
): PropertySpec => ({
    control: 'ratio',
    presets: presets?.map((p) => ({ value: p.value, label: p.label })),
    placeholder,
    ui: { size },
});

// ─────────────────────────────────────────────────────────────
// 섹션: Layout
// ─────────────────────────────────────────────────────────────
const LayoutSection: React.FC<{
    values: StyleValues;
    setValue: SetStyleValue;
    locks: Record<string, boolean>;
    onToggleLock: (k: string) => void;
    expanded: Record<string, boolean>;
    openDetail: (detailKey: string, seed?: () => void) => void;
}> = ({ values, setValue, locks, onToggleLock, expanded, openDetail }) => {
    const display = values['display'];
    const isContainer = display === 'flex' || display === 'grid';
    const parentDisplay = values['__parentDisplay'];
    const showFlexContainer = display === 'flex' && isContainer;
    const showGridContainer = display === 'grid' && isContainer;
    const showFlexItem = parentDisplay === 'flex';
    const showGridItem = parentDisplay === 'grid';

    const dk = (prop: string) => `Layout.${prop}`;
    useSyncLonghand({
        expanded,
        detailKey: dk('padding'),
        shorthandKey: 'padding',
        values,
        setValue,
        parse: (raw) => {
            const b = expandBoxShorthand(String(raw ?? ''));
            return { top: b.top, right: b.right, bottom: b.bottom, left: b.left };
        },
        map: {
            top: 'paddingTop',
            right: 'paddingRight',
            bottom: 'paddingBottom',
            left: 'paddingLeft',
        },
    });

    // margin <-→ marginTop/Right/Bottom/Left
    useSyncLonghand({
        expanded,
        detailKey: dk('margin'),
        shorthandKey: 'margin',
        values,
        setValue,
        parse: (raw) => {
            const b = expandBoxShorthand(String(raw ?? ''));
            return { top: b.top, right: b.right, bottom: b.bottom, left: b.left };
        },
        map: {
            top: 'marginTop',
            right: 'marginRight',
            bottom: 'marginBottom',
            left: 'marginLeft',
        },
    });

    return (
        <>
            {/* Display & Flow */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Display & Flow"
                    Icon={GROUP_ICONS['Display & Flow']}
                    locked={!!locks['layout.display']}
                    onToggleLock={() => onToggleLock('layout.display')}
                />

                <RowShell>
                    <LeftCell title="배치 방식" />
                    <RightCell>
                        {renderValueControl(
                            'Layout',
                            'display',
                            makeChips([{ value: 'block' }, { value: 'inline' }, { value: 'flex' }, { value: 'grid' }], { size: 'xs' }),
                            String(values['display'] ?? ''),
                            (v) => setValue('display', v),
                            locks['layout.display']
                        )}
                    </RightCell>
                </RowShell>

                {showFlexContainer && (
                    <>
                        <RowShell>
                            <LeftCell title="방향" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'flexDirection',
                                    makeIcons([
                                        { value: 'row', iconKey: 'layout.flexDirection:row' },
                                        { value: 'row-reverse', iconKey: 'layout.flexDirection:row-reverse' },
                                        { value: 'column', iconKey: 'layout.flexDirection:column' },
                                        { value: 'column-reverse', iconKey: 'layout.flexDirection:column-reverse' },
                                    ]),
                                    String(values['flexDirection'] ?? ''),
                                    (v) => setValue('flexDirection', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="주축 정렬" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'justifyContent',
                                    makeIcons([
                                        { value: 'flex-start', iconKey: 'layout.justifyContent:flex-start' },
                                        { value: 'center', iconKey: 'layout.justifyContent:center' },
                                        { value: 'flex-end', iconKey: 'layout.justifyContent:flex-end' },
                                        { value: 'space-between', iconKey: 'layout.justifyContent:space-between' },
                                        { value: 'space-around', iconKey: 'layout.justifyContent:space-around' },
                                        { value: 'space-evenly', iconKey: 'layout.justifyContent:space-evenly' },
                                    ]),
                                    String(values['justifyContent'] ?? ''),
                                    (v) => setValue('justifyContent', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="교차축 정렬" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'alignItems',
                                    makeIcons([
                                        { value: 'flex-start', iconKey: 'layout.alignItems:flex-start' },
                                        { value: 'center', iconKey: 'layout.alignItems:center' },
                                        { value: 'flex-end', iconKey: 'layout.alignItems:flex-end' },
                                        { value: 'stretch', iconKey: 'layout.alignItems:stretch' },
                                    ]),
                                    String(values['alignItems'] ?? ''),
                                    (v) => setValue('alignItems', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="줄바꿈" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'flexWrap',
                                    makeSelect(['nowrap', 'wrap', 'wrap-reverse']),
                                    String(values['flexWrap'] ?? ''),
                                    (v) => setValue('flexWrap', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="간격" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'gap',
                                    makeChips(['auto', '1', '2', '4'], { size: 'xs', free: true, placeholder: 'ex) 10px' }),
                                    String(values['gap'] ?? ''),
                                    (v) => setValue('gap', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>
                    </>
                )}

                {showGridContainer && (
                    <>
                        <RowShell>
                            <LeftCell title="열 개수" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'gridTemplateColumns',
                                    makeChips(['auto', '1', '2', '3'], { size: 'xs', free: true, placeholder: 'auto' }),
                                    String(values['gridTemplateColumns'] ?? ''),
                                    (v) => setValue('gridTemplateColumns', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="행 개수" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'gridTemplateRows',
                                    makeChips(['auto', '1', '2', '3'], { size: 'xs', free: true, placeholder: 'auto' }),
                                    String(values['gridTemplateRows'] ?? ''),
                                    (v) => setValue('gridTemplateRows', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="가로 정렬" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'justifyItems',
                                    makeSelect(['stretch', 'start', 'center', 'end']),
                                    String(values['justifyItems'] ?? ''),
                                    (v) => setValue('justifyItems', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="세로 정렬" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'alignItems',
                                    makeSelect(['stretch', 'start', 'center', 'end']),
                                    String(values['alignItems'] ?? ''),
                                    (v) => setValue('alignItems', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>
                    </>
                )}

                {showFlexItem && (
                    <>
                        <RowShell>
                            <LeftCell title="개별 정렬" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'alignSelf',
                                    makeSelect(['auto', 'flex-start', 'center', 'flex-end', 'stretch']),
                                    String(values['alignSelf'] ?? ''),
                                    (v) => setValue('alignSelf', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="순서" />
                            <RightCell>
                                {renderValueControl('Layout', 'order', makeInput('0', 'number'), String(values['order'] ?? ''), (v) => setValue('order', v), locks['layout.display'])}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="성장/축소/기준" />
                            <RightCell>
                                {renderValueControl('Layout', 'flex', makeInput('1 1 auto'), String(values['flex'] ?? ''), (v) => setValue('flex', v), locks['layout.display'])}
                            </RightCell>
                        </RowShell>
                    </>
                )}

                {showGridItem && (
                    <>
                        <RowShell>
                            <LeftCell title="열 범위" />
                            <RightCell>
                                {renderValueControl('Layout', 'gridColumn', makeInput('1 / 3'), String(values['gridColumn'] ?? ''), (v) => setValue('gridColumn', v), locks['layout.display'])}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="행 범위" />
                            <RightCell>
                                {renderValueControl('Layout', 'gridRow', makeInput('1 / 2'), String(values['gridRow'] ?? ''), (v) => setValue('gridRow', v), locks['layout.display'])}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="가로 정렬(개별)" />
                            <RightCell>
                                {renderValueControl('Layout', 'justifySelf', makeSelect(['start', 'center', 'end', 'stretch']), String(values['justifySelf'] ?? ''), (v) => setValue('justifySelf', v), locks['layout.display'])}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="세로 정렬(개별)" />
                            <RightCell>
                                {renderValueControl('Layout', 'alignSelf', makeSelect(['start', 'center', 'end', 'stretch']), String(values['alignSelf'] ?? ''), (v) => setValue('alignSelf', v), locks['layout.display'])}
                            </RightCell>
                        </RowShell>
                    </>
                )}

                <RowShell>
                    <LeftCell title="오버플로우" />
                    <RightCell>
                        {renderValueControl('Layout', 'overflow', makeSelect(['visible', 'hidden', 'scroll', 'auto']), String(values['overflow'] ?? ''), (v) => setValue('overflow', v), locks['layout.display'])}
                    </RightCell>
                </RowShell>
            </div>

            {/* Sizing */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Sizing"
                    Icon={GROUP_ICONS['Sizing']}
                    locked={!!locks['layout.sizing']}
                    onToggleLock={() => onToggleLock('layout.sizing')}
                />

                {/* width (min/max는 파생이 아니므로 시드 불필요) */}
                <RowShell>
                    <LeftCell title="너비" />
                    <RightCell
                        onToggleDetail={() => openDetail(dk('width'))}
                        detailActive={!!expanded[dk('width')]}
                    >
                        {renderValueControl(
                            'Layout',
                            'width',
                            makeChips([{ value: 'auto' }], { size: 'xs', free: true, placeholder: 'ex) 320px / 50%' }),
                            String(values['width'] ?? ''),
                            (v) => setValue('width', v),
                            locks['layout.sizing']
                        )}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('width')] && (
                    <DetailBlock
                        propsMap={{ minWidth: makeInput('ex) 100'), maxWidth: makeInput('ex) 100') }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Layout"
                        disabled={locks['layout.sizing']}
                    />
                )}

                {/* height */}
                <RowShell>
                    <LeftCell title="높이" />
                    <RightCell
                        onToggleDetail={() => openDetail(dk('height'))}
                        detailActive={!!expanded[dk('height')]}
                    >
                        {renderValueControl(
                            'Layout',
                            'height',
                            makeChips([{ value: 'auto' }], { size: 'xs', free: true, placeholder: 'ex) 200px / 50%' }),
                            String(values['height'] ?? ''),
                            (v) => setValue('height', v),
                            locks['layout.sizing']
                        )}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('height')] && (
                    <DetailBlock
                        propsMap={{ minHeight: makeInput('ex) 100'), maxHeight: makeInput('ex) 100') }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Layout"
                        disabled={locks['layout.sizing']}
                    />
                )}

                <RowShell>
                    <LeftCell title="종횡비" />
                    <RightCell>
                        {renderValueControl(
                            'Layout',
                            'aspectRatio',
                            makeRatio('ex) 4/3', [
                                { value: '1/1', label: '1:1' },
                                { value: '16/9', label: '16:9' },
                            ]),
                            String(values['aspectRatio'] ?? ''),
                            (v) => setValue('aspectRatio', v),
                            locks['layout.sizing']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="크기 계산" />
                    <RightCell>
                        {renderValueControl('Layout', 'boxSizing', makeSelect(['content-box', 'border-box']), String(values['boxSizing'] ?? ''), (v) => setValue('boxSizing', v), locks['layout.sizing'])}
                    </RightCell>
                </RowShell>
            </div>

            {/* Spacing */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Spacing"
                    Icon={GROUP_ICONS['Spacing']}
                    locked={!!locks['layout.spacing']}
                    onToggleLock={() => onToggleLock('layout.spacing')}
                />

                {/* padding */}
                <RowShell>
                    <LeftCell title="패딩" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('padding'), () => {
                                const base = expandBoxShorthand(String(values.padding ?? ''));
                                setIfEmpty(values, setValue, 'paddingTop', base.top);
                                setIfEmpty(values, setValue, 'paddingRight', base.right);
                                setIfEmpty(values, setValue, 'paddingBottom', base.bottom);
                                setIfEmpty(values, setValue, 'paddingLeft', base.left);
                            })
                        }
                        detailActive={!!expanded[dk('padding')]}
                    >
                        {renderValueControl(
                            'Layout',
                            'padding',
                            {
                                ...makeChips(['0', '2', '4', '8', '16'], { size: 'xs', free: true, placeholder: 'ex) 12px' }),
                            },
                            String(values['padding'] ?? ''),
                            (v) => setValue('padding', v),
                            locks['layout.spacing']
                        )}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('padding')] && (
                    <DetailBlock
                        propsMap={{
                            paddingTop: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                            paddingRight: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                            paddingBottom: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                            paddingLeft: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Layout"
                        disabled={locks['layout.spacing']}
                    />
                )}

                {/* margin */}
                <RowShell>
                    <LeftCell title="마진" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('margin'), () => {
                                const base = expandBoxShorthand(String(values.margin ?? ''));
                                setIfEmpty(values, setValue, 'marginTop', base.top);
                                setIfEmpty(values, setValue, 'marginRight', base.right);
                                setIfEmpty(values, setValue, 'marginBottom', base.bottom);
                                setIfEmpty(values, setValue, 'marginLeft', base.left);
                            })
                        }
                        detailActive={!!expanded[dk('margin')]}
                    >
                        {renderValueControl(
                            'Layout',
                            'margin',
                            {
                                ...makeChips(['0', '2', '4', '8', '16'], { size: 'xs', free: true, placeholder: 'ex) 12px' }),
                            },
                            String(values['margin'] ?? ''),
                            (v) => setValue('margin', v),
                            locks['layout.spacing']
                        )}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('margin')] && (
                    <DetailBlock
                        propsMap={{
                            marginTop: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                            marginRight: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                            marginBottom: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                            marginLeft: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Layout"
                        disabled={locks['layout.spacing']}
                    />
                )}

                <RowShell>
                    <LeftCell title="간격" />
                    <RightCell>
                        {renderValueControl(
                            'Layout',
                            'gap',
                            makeChips(['0', '2', '4', '8', '16'], { size: 'xs', free: true, placeholder: 'ex) 12' }),
                            String(values['gap'] ?? ''),
                            (v) => setValue('gap', v),
                            locks['layout.spacing']
                        )}
                    </RightCell>
                </RowShell>
            </div>
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// 섹션: Typography
// ─────────────────────────────────────────────────────────────
const TypographySection: React.FC<{
    values: StyleValues;
    setValue: SetStyleValue;
    locks: Record<string, boolean>;
    onToggleLock: (k: string) => void;
}> = ({ values, setValue, locks, onToggleLock }) => {
    return (
        <>
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Font"
                    Icon={GROUP_ICONS['Font']}
                    locked={!!locks['typo.font']}
                    onToggleLock={() => onToggleLock('typo.font')}
                />
                <RowShell>
                    <LeftCell title="글꼴" />
                    <RightCell>
                        {renderValueControl('Typography', 'fontFamily', makeSelect(['Inter', 'Pretendard', 'Noto Sans']), String(values['fontFamily'] ?? ''), (v) => setValue('fontFamily', v), locks['typo.font'])}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="크기" />
                    <RightCell>
                        {renderValueControl('Typography', 'fontSize', makeChips(['10', '12', '14', '16'], { size: 'xs', free: true, placeholder: 'ex) 18' }), String(values['fontSize'] ?? ''), (v) => setValue('fontSize', v), locks['typo.font'])}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="스타일" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'fontStyle',
                            makeIcons([
                                { value: 'normal', iconKey: 'typography.fontStyle:normal' },
                                { value: 'italic', iconKey: 'typography.fontStyle:italic' },
                            ]),
                            String(values['fontStyle'] ?? ''), (v) => setValue('fontStyle', v),
                            locks['typo.font'])}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="굵기" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'fontWeight',
                            makeSelect(['100', '200', '300', '400', '500', '600', '700', '800', '900', 'normal', 'bold', 'bolder', 'lighter']),
                            String(values['fontWeight'] ?? ''),
                            (v) => setValue('fontWeight', v),
                            locks['typo.font']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="글자색" />
                    <RightCell>
                        {renderValueControl('Typography', 'color', makeColor(), String(values['color'] ?? ''), (v) => setValue('color', v), locks['typo.font'])}
                    </RightCell>
                </RowShell>
            </div>

            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Text"
                    Icon={GROUP_ICONS['Text']}
                    locked={!!locks['typo.text']}
                    onToggleLock={() => onToggleLock('typo.text')}
                />

                <RowShell>
                    <LeftCell title="정렬" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'textAlign',
                            makeIcons(
                                [
                                    { value: 'left', iconKey: 'typography.textAlign:left' },
                                    { value: 'center', iconKey: 'typography.textAlign:center' },
                                    { value: 'right', iconKey: 'typography.textAlign:right' },
                                    { value: 'justify', iconKey: 'typography.textAlign:justify' },
                                ],
                                'sm'
                            ),
                            String(values['textAlign'] ?? ''),
                            (v) => setValue('textAlign', v),
                            locks['typo.text']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="대소문자" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'textTransform',
                            makeIcons([
                                { value: 'none'},
                                { value: 'inherit'},
                                { value: 'capitalize', iconKey: 'typography.textTransform:capitalize' },
                                { value: 'uppercase', iconKey: 'typography.textTransform:uppercase' },
                                { value: 'lowercase', iconKey: 'typography.textTransform:lowercase' },
                            ]),
                            String(values['textTransform'] ?? ''), (v) => setValue('textTransform', v),
                            locks['typo.text'])}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="장식" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'textDecoration',
                            makeIcons([
                                { value: 'none', iconKey: 'typography.textDecoration:none' },
                                { value: 'underline', iconKey: 'typography.textDecoration:underline' },
                                { value: 'line-through', iconKey: 'typography.textDecoration:line-through' },
                            ]),
                            String(values['textDecoration'] ?? ''), (v) => setValue('textDecoration', v),
                            locks['typo.text'])}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="줄 높이" />
                    <RightCell>
                        {renderValueControl('Typography', 'lineHeight', makeChips(['1', '1.2', '1.5', '2'], { size: 'xs', free: true, placeholder: '1.4 / 20px' }), String(values['lineHeight'] ?? ''), (v) => setValue('lineHeight', v), locks['typo.text'])}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="자간" />
                    <RightCell>
                        {renderValueControl('Typography', 'letterSpacing', makeChips(['0', '0.5', '1', '2'], { size: 'xs', free: true, placeholder: 'ex) 0.2px' }), String(values['letterSpacing'] ?? ''), (v) => setValue('letterSpacing', v), locks['typo.text'])}
                    </RightCell>
                </RowShell>
            </div>

            <div className="border-b border-neutral-200">
                <GroupHeader label="Content Flow" locked={!!locks['typo.flow']} onToggleLock={() => onToggleLock('typo.flow')} />

                <RowShell>
                    <LeftCell title="공백 처리" />
                    <RightCell>
                        {renderValueControl('Typography', 'whiteSpace', makeSelect(['normal', 'nowrap', 'pre', 'pre-wrap']), String(values['whiteSpace'] ?? ''), (v) => setValue('whiteSpace', v), locks['typo.flow'])}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="줄바꿈" />
                    <RightCell>
                        {renderValueControl('Typography', 'wordBreak', makeSelect(['normal', 'break-all', 'keep-all']), String(values['wordBreak'] ?? ''), (v) => setValue('wordBreak', v), locks['typo.flow'])}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="넘침 표시" />
                    <RightCell>
                        {renderValueControl('Typography', 'textOverflow', makeSelect(['clip', 'ellipsis']), String(values['textOverflow'] ?? ''), (v) => setValue('textOverflow', v), locks['typo.flow'])}
                    </RightCell>
                </RowShell>
            </div>
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// 섹션: Appearance
// ─────────────────────────────────────────────────────────────
const AppearanceSection: React.FC<{
    values: StyleValues;
    setValue: SetStyleValue;
    locks: Record<string, boolean>;
    onToggleLock: (k: string) => void;
    expanded: Record<string, boolean>;
    openDetail: (detailKey: string, seed?: () => void) => void;
}> = ({ values, setValue, locks, onToggleLock, expanded, openDetail }) => {

    const dk = (prop: string) => `Appearance.${prop}`;
    // background (shorthand → detail longhand들)
    useSyncLonghand({
        expanded,
        detailKey: dk('background'),
        shorthandKey: 'background',
        values,
        setValue,
        parse: (raw) => parseBackground(String(raw ?? '')),
        map: {
            backgroundImage: 'backgroundImage',
            backgroundPosition: 'backgroundPosition',
            backgroundSize: 'backgroundSize',
            backgroundRepeat: 'backgroundRepeat',
            backgroundClip: 'backgroundClip',
            backgroundOrigin: 'backgroundOrigin',
            backgroundAttachment: 'backgroundAttachment',
        },
    });

    // border (width/style/color)
    useSyncLonghand({
        expanded,
        detailKey: dk('border'),
        shorthandKey: 'border',
        values,
        setValue,
        parse: (raw) => {
            const b = parseBorderLike(String(raw ?? ''));
            return { width: b.width, style: b.style, color: b.color };
        },
        map: { width: 'borderWidth', style: 'borderStyle', color: 'borderColor' },
    });

    // borderRadius (단일값 → 4코너 복제)
    useSyncLonghand({
        expanded,
        detailKey: dk('borderRadius'),
        shorthandKey: 'borderRadius',
        values,
        setValue,
        parse: (raw) => {
            const v = String(raw ?? '').trim();
            return { tl: v, tr: v, br: v, bl: v };
        },
        map: {
            tl: 'borderTopLeftRadius',
            tr: 'borderTopRightRadius',
            br: 'borderBottomRightRadius',
            bl: 'borderBottomLeftRadius',
        },
    });

    // outline (width/style/color)
    useSyncLonghand({
        expanded,
        detailKey: dk('outline'),
        shorthandKey: 'outline',
        values,
        setValue,
        parse: (raw) => {
            const b = parseBorderLike(String(raw ?? ''));
            return { width: b.width, style: b.style, color: b.color };
        },
        map: { width: 'outlineWidth', style: 'outlineStyle', color: 'outlineColor' },
    });

    return (
        <>
            {/* Fill */}
            <div className="border-b border-neutral-200">
                <GroupHeader label="Fill" locked={!!locks['appearance.fill']} onToggleLock={() => onToggleLock('appearance.fill')} />

                <RowShell>
                    <LeftCell title="배경색" />
                    <RightCell>
                        {renderValueControl('Appearance', 'backgroundColor', makeColor(), String(values['backgroundColor'] ?? ''), (v) => setValue('backgroundColor', v), locks['appearance.fill'])}
                    </RightCell>
                </RowShell>

                {/* background */}
                <RowShell>
                    <LeftCell title="배경 상세" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('background'), () => {
                                const b = parseBackground(String(values.background ?? ''));
                                setIfEmpty(values, setValue, 'backgroundImage', b.backgroundImage);
                                setIfEmpty(values, setValue, 'backgroundPosition', b.backgroundPosition);
                                setIfEmpty(values, setValue, 'backgroundSize', b.backgroundSize);
                                setIfEmpty(values, setValue, 'backgroundRepeat', b.backgroundRepeat);
                                setIfEmpty(values, setValue, 'backgroundClip', b.backgroundClip);
                                setIfEmpty(values, setValue, 'backgroundOrigin', b.backgroundOrigin);
                                setIfEmpty(values, setValue, 'backgroundAttachment', b.backgroundAttachment);
                            })
                        }
                        detailActive={!!expanded[dk('background')]}
                    >
                        {renderValueControl(
                            'Appearance',
                            'background',
                            {
                                ...makeInput('<color> | <image> <position> / <size> repeat | ...', 'text', 'sm'),
                                shorthand: {
                                    enabled: true,
                                    layered: true,
                                    layerLimit: 1,
                                    syntax: '<color> | <image> <position> / <size> repeat | ...',
                                    longhandKeys: [
                                        'backgroundImage',
                                        'backgroundPosition',
                                        'backgroundSize',
                                        'backgroundRepeat',
                                        'backgroundClip',
                                        'backgroundOrigin',
                                        'backgroundAttachment',
                                    ],
                                },
                                ui: { size: 'sm', uploadButton: { enabled: true, accept: 'image/*', toValue: 'url()' } },
                            },
                            String(values['background'] ?? ''),
                            (v) => setValue('background', v),
                            locks['appearance.fill']
                        )}
                    </RightCell>
                </RowShell>

                {!!expanded[dk('background')] && (
                    <DetailBlock
                        propsMap={{
                            backgroundImage: {
                                ...makeInput('url(...) / none', 'text', 'sm'),
                                ui: { size: 'sm', uploadButton: { enabled: true, accept: 'image/*', toValue: 'url()' } },
                                label: { ko: '이미지' },
                            },
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Appearance"
                        disabled={locks['appearance.fill']}
                        getDependentsFor={(propKey, curVal) => {
                            if (propKey === 'backgroundImage' && curVal && curVal.trim() !== '') {
                                return [
                                    {
                                        title: '이미지 설정',
                                        properties: {
                                            backgroundSize: makeSelect(['auto', 'cover', 'contain']),
                                            backgroundRepeat: makeSelect(['repeat', 'no-repeat', 'repeat-x', 'repeat-y']),
                                            backgroundPosition: makeInput('ex) 50% 50%', 'text', 'sm'),
                                            backgroundClip: makeSelect(['border-box', 'padding-box', 'content-box']),
                                            backgroundOrigin: makeSelect(['padding-box', 'border-box', 'content-box']),
                                            backgroundAttachment: makeSelect(['scroll', 'fixed', 'local']),
                                        },
                                    },
                                ];
                            }
                            return [];
                        }}
                    />
                )}
            </div>

            {/* Border */}
            <div className="border-b border-neutral-200">
                <GroupHeader label="Border" Icon={GROUP_ICONS['Border']} locked={!!locks['appearance.border']} onToggleLock={() => onToggleLock('appearance.border')} />

                {/* border */}
                <RowShell>
                    <LeftCell title="테두리" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('border'), () => {
                                const b = parseBorderLike(String(values.border ?? ''));
                                setIfEmpty(values, setValue, 'borderWidth', b.width);
                                setIfEmpty(values, setValue, 'borderStyle', b.style);
                                setIfEmpty(values, setValue, 'borderColor', b.color);
                            })
                        }
                        detailActive={!!expanded[dk('border')]}
                    >
                        {renderValueControl(
                            'Appearance',
                            'border',
                            {
                                ...makeInput('1px solid currentColor'),
                                shorthand: {
                                    enabled: true,
                                    syntax: '<width> || <style> || <color>',
                                    examples: ['1px solid #000'],
                                    longhandKeys: ['borderWidth', 'borderStyle', 'borderColor'],
                                },
                                ui: { size: 'xs', extraInput: { enabled: true, size: 'xs', placeholder: '1px solid black' } },
                            },
                            String(values['border'] ?? ''),
                            (v) => setValue('border', v),
                            locks['appearance.border']
                        )}
                    </RightCell>
                </RowShell>

                {!!expanded[dk('border')] && (
                    <DetailBlock
                        propsMap={{
                            borderWidth: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true, placeholder: '0' }),
                            borderStyle: makeSelect(['none', 'solid', 'dashed', 'dotted']),
                            borderColor: makeColor(),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Appearance"
                        disabled={locks['appearance.border']}
                    />
                )}

                {/* borderRadius */}
                <RowShell>
                    <LeftCell title="모서리" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('borderRadius'), () => {
                                const base = String(values.borderRadius ?? '');
                                if (!base) return;
                                setIfEmpty(values, setValue, 'borderTopLeftRadius', base);
                                setIfEmpty(values, setValue, 'borderTopRightRadius', base);
                                setIfEmpty(values, setValue, 'borderBottomRightRadius', base);
                                setIfEmpty(values, setValue, 'borderBottomLeftRadius', base);
                            })
                        }
                        detailActive={!!expanded[dk('borderRadius')]}
                    >
                        {renderValueControl('Appearance', 'borderRadius', makeChips(['0', '2', '4', '8'], { size: 'xs', free: true }), String(values['borderRadius'] ?? ''), (v) => setValue('borderRadius', v), locks['appearance.border'])}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('borderRadius')] && (
                    <DetailBlock
                        propsMap={{
                            borderTopLeftRadius: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true, placeholder: '0' }),
                            borderTopRightRadius: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true, placeholder: '0' }),
                            borderBottomRightRadius: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true, placeholder: '0' }),
                            borderBottomLeftRadius: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true, placeholder: '0' }),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Appearance"
                        disabled={locks['appearance.border']}
                    />
                )}

                {/* outline */}
                <RowShell>
                    <LeftCell title="외곽선" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('outline'), () => {
                                const b = parseBorderLike(String(values.outline ?? ''));
                                setIfEmpty(values, setValue, 'outlineWidth', b.width);
                                setIfEmpty(values, setValue, 'outlineStyle', b.style);
                                setIfEmpty(values, setValue, 'outlineColor', b.color);
                            })
                        }
                        detailActive={!!expanded[dk('outline')]}
                    >
                        {renderValueControl(
                            'Appearance',
                            'outline',
                            {
                                ...makeChips([], { size: 'xs', free: true, placeholder: '1px solid black' }),
                                placeholder: '1px solid currentColor',
                                shorthand: {
                                    enabled: true,
                                    syntax: '<outline-width> || <outline-style> || <outline-color>',
                                    examples: ['1px solid #000'],
                                    longhandKeys: ['outlineWidth', 'outlineStyle', 'outlineColor'],
                                },
                            },
                            String(values['outline'] ?? ''),
                            (v) => setValue('outline', v),
                            locks['appearance.border']
                        )}
                    </RightCell>
                </RowShell>

                {!!expanded[dk('outline')] && (
                    <DetailBlock
                        propsMap={{
                            outlineWidth: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true }),
                            outlineStyle: makeSelect(['none', 'solid', 'dashed', 'dotted']),
                            outlineColor: makeColor(),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Appearance"
                        disabled={locks['appearance.border']}
                    />
                )}
            </div>
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// 섹션: Effects
// ─────────────────────────────────────────────────────────────
const EffectsSection: React.FC<{
    values: StyleValues;
    setValue: SetStyleValue;
    locks: Record<string, boolean>;
    onToggleLock: (k: string) => void;
    expanded: Record<string, boolean>;
    openDetail: (detailKey: string, seed?: () => void) => void;
}> = ({ values, setValue, locks, onToggleLock, expanded, openDetail }) => {

    const dk = (prop: string) => `Effects.${prop}`;

    // filter: blur/brightness/…/drop-shadow
    useSyncLonghand({
        expanded,
        detailKey: dk('filter'),
        shorthandKey: 'filter',
        values,
        setValue,
        parse: (raw) => {
            const obj = parseFunctionList(String(raw ?? ''));
            return {
                'blur': obj['blur'] ?? '',
                'brightness': obj['brightness'] ?? '',
                'contrast': obj['contrast'] ?? '',
                'grayscale': obj['grayscale'] ?? '',
                'hue-rotate': obj['hue-rotate'] ?? '',
                'invert': obj['invert'] ?? '',
                'saturate': obj['saturate'] ?? '',
                'sepia': obj['sepia'] ?? '',
                'drop-shadow': obj['drop-shadow'] ?? '',
            };
        },
        map: {
            'blur': 'blur',
            'brightness': 'brightness',
            'contrast': 'contrast',
            'grayscale': 'grayscale',
            'hue-rotate': 'hue-rotate',
            'invert': 'invert',
            'saturate': 'saturate',
            'sepia': 'sepia',
            'drop-shadow': 'drop-shadow',
        },
    });

    // transform: translate/scale/rotate/skew (대표 키 중심)
    useSyncLonghand({
        expanded,
        detailKey: dk('transform'),
        shorthandKey: 'transform',
        values,
        setValue,
        parse: (raw) => {
            const obj = parseFunctionList(String(raw ?? ''));
            return {
                translate: obj['translate'] ?? '',
                scale: obj['scale'] ?? obj['scaleX'] ?? obj['scaleY'] ?? '',
                rotate: obj['rotate'] ?? '',
                skew: obj['skew'] ?? obj['skewX'] ?? obj['skewY'] ?? '',
            };
        },
        map: {
            translate: 'translate',
            scale: 'scale',
            rotate: 'rotate',
            skew: 'skew',
        },
    });

    // transition: property/duration/timing/delay
    useSyncLonghand({
        expanded,
        detailKey: dk('transition'),
        shorthandKey: 'transition',
        values,
        setValue,
        parse: (raw) => parseTransition(String(raw ?? '')),
        map: {
            transitionProperty: 'transitionProperty',
            transitionDuration: 'transitionDuration',
            transitionTimingFunction: 'transitionTimingFunction',
            transitionDelay: 'transitionDelay',
        },
    });

    return (
        <>
            {/* Visual */}
            <div className="border-b border-neutral-200">
                <GroupHeader label="Visual" locked={!!locks['effects.visual']} onToggleLock={() => onToggleLock('effects.visual')} />

                <RowShell>
                    <LeftCell title="투명도" />
                    <RightCell>
                        {renderValueControl('Effects', 'opacity', makeChips(['1', '0.5', '0'], { size: 'xs', free: true, placeholder: '0~1' }), String(values['opacity'] ?? ''), (v) => setValue('opacity', v), locks['effects.visual'])}
                    </RightCell>
                </RowShell>

                {/* filter */}
                <RowShell>
                    <LeftCell title="그래픽 효과" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('filter'), () => {
                                const f = parseFunctionList(String(values.filter ?? ''));
                                const keys = ['blur','brightness','contrast','grayscale','hue-rotate','invert','saturate','sepia','drop-shadow'] as const;
                                keys.forEach((k) => setIfEmpty(values, setValue, k, f[k]));
                            })
                        }
                        detailActive={!!expanded[dk('filter')]}
                    >
                        {renderValueControl(
                            'Effects',
                            'filter',
                            {
                                ...makeInput('blur(4px) brightness(0.9)', 'text', 'xl'),
                                shorthand: {
                                    enabled: true,
                                    layered: true,
                                    layerLimit: 1,
                                    syntax: '<filter-function-list>',
                                    longhandKeys: ['blur', 'brightness', 'contrast', 'grayscale', 'hue-rotate', 'invert', 'saturate', 'sepia', 'drop-shadow'],
                                },
                            },
                            String(values['filter'] ?? ''),
                            (v) => setValue('filter', v),
                            locks['effects.visual']
                        )}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('filter')] && (
                    <DetailBlock
                        propsMap={{
                            blur: makeInput('blur(6px)'),
                            brightness: makeInput('brightness(1.1)'),
                            contrast: makeInput('contrast(1.2)'),
                            grayscale: makeInput('grayscale(1)'),
                            'hue-rotate': makeInput('hue-rotate(30deg)'),
                            invert: makeInput('invert(1)'),
                            saturate: makeInput('saturate(1.2)'),
                            sepia: makeInput('sepia(1)'),
                            'drop-shadow': makeInput('drop-shadow(0 2px 6px #0003)'),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Effects"
                        disabled={locks['effects.visual']}
                    />
                )}

                <RowShell>
                    <LeftCell title="블렌드" />
                    <RightCell>
                        {renderValueControl(
                            'Effects',
                            'mixBlendMode',
                            makeSelect([
                                'normal',
                                'multiply',
                                'screen',
                                'overlay',
                                'darken',
                                'lighten',
                                'color-dodge',
                                'color-burn',
                                'hard-light',
                                'soft-light',
                                'difference',
                                'exclusion',
                                'hue',
                                'saturation',
                                'color',
                                'luminosity',
                            ]),
                            String(values['mixBlendMode'] ?? ''),
                            (v) => setValue('mixBlendMode', v),
                            locks['effects.visual']
                        )}
                    </RightCell>
                </RowShell>
            </div>

            {/* Transform */}
            <div className="border-b border-neutral-200">
                <GroupHeader label="Transform" locked={!!locks['effects.transform']} onToggleLock={() => onToggleLock('effects.transform')} />

                <RowShell>
                    <LeftCell title="변형" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('transform'), () => {
                                const f = parseFunctionList(String(values.transform ?? ''));
                                setIfEmpty(values, setValue, 'translate', f['translate']);
                                setIfEmpty(values, setValue, 'scale', f['scale'] ?? f['scaleX'] ?? f['scaleY']);
                                setIfEmpty(values, setValue, 'rotate', f['rotate']);
                                setIfEmpty(values, setValue, 'skew', f['skew'] ?? f['skewX'] ?? f['skewY']);
                            })
                        }
                        detailActive={!!expanded[dk('transform')]}
                    >
                        {renderValueControl(
                            'Effects',
                            'transform',
                            {
                                ...makeInput('scale(1.05) rotate(5deg) translate(0, 4px)', 'text', 'xl'),
                                shorthand: {
                                    enabled: true,
                                    layered: true,
                                    layerLimit: 1,
                                    syntax: '<transform-function>+',
                                    longhandKeys: ['translate', 'scale', 'scaleX', 'scaleY', 'rotate', 'skew', 'skewX', 'skewY'],
                                },
                            },
                            String(values['transform'] ?? ''),
                            (v) => setValue('transform', v),
                            locks['effects.transform']
                        )}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('transform')] && (
                    <DetailBlock
                        propsMap={{
                            translate: makeInput('translate(10px, 0)'),
                            scale: makeInput('scale(1.1)'),
                            rotate: makeInput('rotate(10deg)'),
                            skew: makeInput('skew(5deg, 0)'),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Effects"
                        disabled={locks['effects.transform']}
                    />
                )}

                <RowShell>
                    <LeftCell title="기준점" />
                    <RightCell>
                        {renderValueControl('Effects', 'transformOrigin', makeInput('50% 50% / center'), String(values['transformOrigin'] ?? ''), (v) => setValue('transformOrigin', v), locks['effects.transform'])}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="원근" />
                    <RightCell>
                        {renderValueControl('Effects', 'perspective', makeInput('600px'), String(values['perspective'] ?? ''), (v) => setValue('perspective', v), locks['effects.transform'])}
                    </RightCell>
                </RowShell>
            </div>

            {/* Transition */}
            <div className="border-b border-neutral-200">
                <GroupHeader label="Transition" locked={!!locks['effects.transition']} onToggleLock={() => onToggleLock('effects.transition')} />

                <RowShell>
                    <LeftCell title="전환 효과" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('transition'), () => {
                                const t = parseTransition(String(values.transition ?? ''));
                                setIfEmpty(values, setValue, 'transitionProperty', t.transitionProperty);
                                setIfEmpty(values, setValue, 'transitionDuration', t.transitionDuration);
                                setIfEmpty(values, setValue, 'transitionTimingFunction', t.transitionTimingFunction);
                                setIfEmpty(values, setValue, 'transitionDelay', t.transitionDelay);
                            })
                        }
                        detailActive={!!expanded[dk('transition')]}
                    >
                        {renderValueControl(
                            'Effects',
                            'transition',
                            {
                                ...makeInput('all 150ms ease-out'),
                                shorthand: {
                                    enabled: true,
                                    layered: true,
                                    layerLimit: 1,
                                    syntax: '<property> <duration> <timing-function>? <delay>?',
                                    longhandKeys: ['transitionProperty', 'transitionDuration', 'transitionTimingFunction', 'transitionDelay'],
                                },
                                ui: { size: 'xs', extraInput: { enabled: true, size: 'xs', placeholder: 'opacity 200ms ease-in' } },
                            },
                            String(values['transition'] ?? ''),
                            (v) => setValue('transition', v),
                            locks['effects.transition']
                        )}
                    </RightCell>
                </RowShell>

                {!!expanded[dk('transition')] && (
                    <DetailBlock
                        propsMap={{
                            transitionProperty: makeInput('opacity, transform'),
                            transitionDuration: makeInput('200ms'),
                            transitionTimingFunction: makeSelect(['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'], 'xs'),
                            transitionDelay: makeInput('0ms'),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Effects"
                        disabled={locks['effects.transition']}
                    />
                )}
            </div>
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// 섹션: Interactivity
// ─────────────────────────────────────────────────────────────
const InteractivitySection: React.FC<{
    values: StyleValues;
    setValue: SetStyleValue;
    locks: Record<string, boolean>;
    onToggleLock: (k: string) => void;
}> = ({ values, setValue, locks, onToggleLock }) => {
    return (
        <>
            <div className="border-b border-neutral-200">
                <GroupHeader label="User Interaction" locked={!!locks['interact.user']} onToggleLock={() => onToggleLock('interact.user')} />

                <RowShell>
                    <LeftCell title="커서" />
                    <RightCell>
                        {renderValueControl('Interactivity', 'cursor', makeSelect(['auto', 'default', 'pointer', 'text', 'move']), String(values['cursor'] ?? ''), (v) => setValue('cursor', v), locks['interact.user'])}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="포인터 이벤트" />
                    <RightCell>
                        {renderValueControl('Interactivity', 'pointerEvents', makeSelect(['auto', 'none']), String(values['pointerEvents'] ?? ''), (v) => setValue('pointerEvents', v), locks['interact.user'])}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="텍스트 선택" />
                    <RightCell>
                        {renderValueControl('Interactivity', 'userSelect', makeSelect(['auto', 'text', 'none']), String(values['userSelect'] ?? ''), (v) => setValue('userSelect', v), locks['interact.user'])}
                    </RightCell>
                </RowShell>
            </div>
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// 커스텀/Advanced 섹선
// ─────────────────────────────────────────────────────────────
const AdvancedSection: React.FC<{
    values: StyleValues;
    setValue: (k: string, v: string) => void;
    locks: Record<string, boolean>;
    onToggleLock: (k: string) => void;
}> = ({ values, setValue, locks, onToggleLock }) => {
    const mode = values['__ovrMode'] ?? 'merge';
    const className = values['__ovrClass'] ?? '';
    const rawCss = values['__ovrRawCss'] ?? '';
    const cssVars = values['__ovrCssVars'] ?? '';
    const attrs = values['__ovrAttrs'] ?? '';

    return (
        <div className="border-b border-neutral-200">
            <GroupHeader
                label="Advanced / Overrides"
                locked={!!locks['advanced.overrides']}
                onToggleLock={() => onToggleLock('advanced.overrides')}
            />

            {/* 모드 선택 */}
            <RowShell>
                <LeftCell title="Mode" tooltip="커스텀 값 병합/대체/클래스만 추가" />
                <RightCell>
                    {renderValueControl(
                        'Advanced',
                        '__ovrMode',
                        { control: 'select', options: [
                                { value: 'merge', label: { ko: '병합(권장)' } },
                                { value: 'override-all', label: { ko: '전면 대체' } },
                                { value: 'class-only', label: { ko: '클래스만 추가' } },
                            ], ui: { size: 'sm' } },
                        mode,
                        (v) => setValue('__ovrMode', v),
                        locks['advanced.overrides']
                    )}
                </RightCell>
            </RowShell>

            {/* className */}
            <RowShell>
                <LeftCell title="className" tooltip="Tailwind/프로젝트 클래스 등" />
                <RightCell>
                    {renderValueControl(
                        'Advanced',
                        '__ovrClass',
                        { control: 'input', placeholder: 'e.g. flex items-center gap-2', ui: { size: 'sm' } },
                        className,
                        (v) => setValue('__ovrClass', v),
                        locks['advanced.overrides']
                    )}
                </RightCell>
            </RowShell>

            {/* Raw CSS */}
            <RowShell>
                <LeftCell title="Raw CSS" tooltip="세미콜론(;) 구분으로 선언 입력" />
                <RightCell>
                    {/* textarea 지원이 없다면 간단히 native로 처리 */}
                    <div className="w-full">
            <textarea
                className="w-full h-24 px-2 py-1 border rounded outline-none text-[11px]"
                placeholder="display:flex; gap:8px; background: url(/hero.png) center/cover no-repeat;"
                value={rawCss}
                onChange={(e) => setValue('__ovrRawCss', e.currentTarget.value)}
                disabled={!!locks['advanced.overrides']}
            />
                        <div className="text-[10px] text-neutral-500 mt-1">예: <code>display:flex; gap:8px;</code></div>
                    </div>
                </RightCell>
            </RowShell>

            {/* CSS Variables */}
            <RowShell>
                <LeftCell title="CSS Vars" tooltip="--변수명: 값; 형식" />
                <RightCell>
          <textarea
              className="w-full h-16 px-2 py-1 border rounded outline-none text-[11px]"
              placeholder="--brand-color: #6b5cff; --radius: 8px;"
              value={cssVars}
              onChange={(e) => setValue('__ovrCssVars', e.currentTarget.value)}
              disabled={!!locks['advanced.overrides']}
          />
                </RightCell>
            </RowShell>

            {/* data-/aria- Attributes */}
            <RowShell>
                <LeftCell title="Attributes" tooltip="data-*, aria-* 형식" />
                <RightCell>
          <textarea
              className="w-full h-16 px-2 py-1 border rounded outline-none text-[11px]"
              placeholder="data-test-id: hero; aria-hidden: true;"
              value={attrs}
              onChange={(e) => setValue('__ovrAttrs', e.currentTarget.value)}
              disabled={!!locks['advanced.overrides']}
          />
                </RightCell>
            </RowShell>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────
export default function StyleInspector({
                                           nodeId,
                                           defId,
                                           width = 360,
                                       }: {
    nodeId: string;
    defId: string;
    width?: number;
}) {
    const [values, setValues] = React.useState<StyleValues>({
        ...INITIAL_STYLE_DEFAULTS,
        __ovrMode: 'merge',
        __ovrClass: '',
        __ovrRawCss: '',
        __ovrCssVars: '',
        __ovrAttrs: '',
        __parentDisplay: undefined as any,
    });
    const setValue: SetStyleValue = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));

    const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({
        Layout: false,
        Typography: false,
        Appearance: false,
        Effects: false,
        Interactivity: false,
    });

    const [locks, setLocks] = React.useState<Record<string, boolean>>({});
    const toggleLock = (k: string) => setLocks((p) => ({ ...p, [k]: !p[k] }));

    const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
    // 펼칠 때 시드 먼저 → 상태 열기
    const openDetail = React.useCallback(
        (detailKey: string, seed?: () => void) => {
            setExpanded((prev) => {
                const opening = !prev[detailKey];
                if (opening && seed) seed();
                return { ...prev, [detailKey]: !prev[detailKey] };
            });
        },
        [setExpanded]
    );

    return (
        <div style={{ width }} className="text-[11px] text-neutral-800 overflow-x-hidden">
            {/* Layout */}
            <SectionFrame
                title="Layout"
                Icon={SECTION_ICONS['Layout']}
                collapsed={!!collapsed.Layout}
                onToggle={() => setCollapsed((p) => ({ ...p, Layout: !p.Layout }))}
            >
                <LayoutSection
                    values={values}
                    setValue={setValue}
                    locks={locks}
                    onToggleLock={toggleLock}
                    expanded={expanded}
                    openDetail={openDetail}
                />
            </SectionFrame>

            {/* Typography */}
            <SectionFrame
                title="Typography"
                Icon={SECTION_ICONS['Typography']}
                collapsed={!!collapsed.Typography}
                onToggle={() => setCollapsed((p) => ({ ...p, Typography: !p.Typography }))}
            >
                <TypographySection values={values} setValue={setValue} locks={locks} onToggleLock={toggleLock} />
            </SectionFrame>

            {/* Appearance */}
            <SectionFrame
                title="Appearance"
                Icon={SECTION_ICONS['Appearance']}
                collapsed={!!collapsed.Appearance}
                onToggle={() => setCollapsed((p) => ({ ...p, Appearance: !p.Appearance }))}
            >
                <AppearanceSection
                    values={values}
                    setValue={setValue}
                    locks={locks}
                    onToggleLock={toggleLock}
                    expanded={expanded}
                    openDetail={openDetail}
                />
            </SectionFrame>

            {/* Effects */}
            <SectionFrame
                title="Effects"
                Icon={SECTION_ICONS['Effects']}
                collapsed={!!collapsed.Effects}
                onToggle={() => setCollapsed((p) => ({ ...p, Effects: !p.Effects }))}
            >
                <EffectsSection
                    values={values}
                    setValue={setValue}
                    locks={locks}
                    onToggleLock={toggleLock}
                    expanded={expanded}
                    openDetail={openDetail}
                />
            </SectionFrame>

            {/* Interactivity */}
            <SectionFrame
                title="Interactivity"
                Icon={SECTION_ICONS['Interactivity']}
                collapsed={!!collapsed.Interactivity}
                onToggle={() => setCollapsed((p) => ({ ...p, Interactivity: !p.Interactivity }))}
            >
                <InteractivitySection values={values} setValue={setValue} locks={locks} onToggleLock={toggleLock} />
            </SectionFrame>

            {/* Advanced */}
            <SectionFrame
                title="Advanced"
                Icon={Sparkles}
                collapsed={!!collapsed.Advanced}
                onToggle={() => setCollapsed((p) => ({ ...p, Advanced: !p.Advanced }))}
            >
                <AdvancedSection
                    values={values}
                    setValue={setValue}
                    locks={locks}
                    onToggleLock={toggleLock}
                />
            </SectionFrame>
        </div>
    );
}