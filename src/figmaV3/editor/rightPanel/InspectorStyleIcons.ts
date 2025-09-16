import type React from 'react';
import {
    // Text / Common
    Type, Text,

    // Display / Layout
    Layout, Columns, Rows, Grid2x2, LayoutGrid,

    // Flex direction
    GalleryHorizontal, GalleryVertical, ArrowLeftRight, ArrowUpDown,

    // Justify (Horizontal)
    AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
    AlignHorizontalSpaceBetween, AlignHorizontalSpaceAround, AlignHorizontalDistributeCenter,

    // Align (Vertical)
    AlignStartVertical, AlignCenterVertical, AlignEndVertical, StretchVertical,

    // Gap / Spacing
    MoveHorizontal,

    // Size
    Maximize, Minimize,

    // Typography text-align
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    CaseLower, CaseSensitive, CaseUpper,

    // Generic / Effects / Misc
    Image, Repeat, Crosshair, Layers, Pin, Box,
    Square, SquareDashed, Scan, Sun, Contrast, Droplet, Filter,
    RotateCcw, Maximize2, Italic, Timer, Clock, Underline, Strikethrough
    //, BorderAll, BezierCurve,
} from 'lucide-react';

export type IconCmp = React.ComponentType<{ size?: number; className?: string }>;

/** prop 표기 변환 */
const toKebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const toCamel = (s: string) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

function key(group: string, prop: string, value?: string) {
    const g = (group || '').trim().toLowerCase();
    const p = (prop || '').trim(); // 입력 그대로 유지 (camel/kebab 둘다 지원)
    const v = (value ?? '').trim().toLowerCase();
    return v ? `${g}.${p}:${v}` : `${g}.${p}`;
}

/**
 * 실제 사용하는 prop 이름/값에 맞춘 매핑
 * - camelCase & kebab-case 모두 보강
 * - values 중심으로 매핑 (chips/icons에서 value별 아이콘 노출)
 */
const ICONS: Record<string, IconCmp> = {
    // ───────────────────────────────────────────────────────────
    // Layout / Display
    // ───────────────────────────────────────────────────────────
    [key('layout', 'display', 'block')]: Layout,
    [key('layout', 'display', 'inline')]: Text,
    [key('layout', 'display', 'inline-block')]: Layout,
    [key('layout', 'display', 'flex')]: GalleryHorizontal,
    [key('layout', 'display', 'grid')]: Grid2x2,

    // flex-direction (camel & kebab)
    [key('layout', 'flexDirection', 'row')]: GalleryHorizontal,
    [key('layout', 'flexDirection', 'row-reverse')]: ArrowLeftRight,
    [key('layout', 'flexDirection', 'column')]: GalleryVertical,
    [key('layout', 'flexDirection', 'column-reverse')]: ArrowUpDown,

    [key('layout', 'flex-direction', 'row')]: GalleryHorizontal,
    [key('layout', 'flex-direction', 'row-reverse')]: ArrowLeftRight,
    [key('layout', 'flex-direction', 'column')]: GalleryVertical,
    [key('layout', 'flex-direction', 'column-reverse')]: ArrowUpDown,

    // justify-content (camel & kebab) — 가로 축 정렬
    [key('layout', 'justifyContent', 'flex-start')]: AlignStartHorizontal,
    [key('layout', 'justifyContent', 'center')]: AlignCenterHorizontal,
    [key('layout', 'justifyContent', 'flex-end')]: AlignEndHorizontal,
    [key('layout', 'justifyContent', 'space-between')]: AlignHorizontalSpaceBetween,
    [key('layout', 'justifyContent', 'space-around')]: AlignHorizontalSpaceAround,
    [key('layout', 'justifyContent', 'space-evenly')]: AlignHorizontalDistributeCenter,

    [key('layout', 'justify-content', 'flex-start')]: AlignStartHorizontal,
    [key('layout', 'justify-content', 'center')]: AlignCenterHorizontal,
    [key('layout', 'justify-content', 'flex-end')]: AlignEndHorizontal,
    [key('layout', 'justify-content', 'space-between')]: AlignHorizontalSpaceBetween,
    [key('layout', 'justify-content', 'space-around')]: AlignHorizontalSpaceAround,
    [key('layout', 'justify-content', 'space-evenly')]: AlignHorizontalDistributeCenter,

    // align-items (camel & kebab) — 세로 축 정렬
    [key('layout', 'alignItems', 'flex-start')]: AlignStartVertical,
    [key('layout', 'alignItems', 'center')]: AlignCenterVertical,
    [key('layout', 'alignItems', 'flex-end')]: AlignEndVertical,
    [key('layout', 'alignItems', 'stretch')]: StretchVertical,

    [key('layout', 'align-items', 'flex-start')]: AlignStartVertical,
    [key('layout', 'align-items', 'center')]: AlignCenterVertical,
    [key('layout', 'align-items', 'flex-end')]: AlignEndVertical,
    [key('layout', 'align-items', 'stretch')]: StretchVertical,

    // gap
    [key('layout', 'gap')]: MoveHorizontal,

    // grid (camel & kebab)
    [key('layout', 'gridTemplateColumns')]: Columns,
    [key('layout', 'gridTemplateRows')]: Rows,
    [key('layout', 'grid-template-columns')]: Columns,
    [key('layout', 'grid-template-rows')]: Rows,

    [key('layout', 'gridGap')]: MoveHorizontal,
    [key('layout', 'grid-gap')]: MoveHorizontal,

    [key('layout', 'grid')]: LayoutGrid,

    // size (camel & kebab)
    [key('layout', 'size')]: Maximize,
    [key('layout', 'width')]: Maximize,
    [key('layout', 'height')]: Maximize,
    [key('layout', 'minWidth')]: Minimize,
    [key('layout', 'minHeight')]: Minimize,
    [key('layout', 'maxWidth')]: Maximize,
    [key('layout', 'maxHeight')]: Maximize,

    [key('layout', 'min-width')]: Minimize,
    [key('layout', 'min-height')]: Minimize,
    [key('layout', 'max-width')]: Maximize,
    [key('layout', 'max-height')]: Maximize,

    // overflow (select)
    [key('layout', 'overflow')]: Layout,

    // Grid 전용 정렬 — justifyItems / alignItems / justifySelf / alignSelf
    // 값: start | center | end | stretch  (수평/수직 각각에 수평/수직 정렬 아이콘 매칭)
    [key('layout', 'justifyItems', 'start')]: AlignStartHorizontal,
    [key('layout', 'justifyItems', 'center')]: AlignCenterHorizontal,
    [key('layout', 'justifyItems', 'end')]: AlignEndHorizontal,
    [key('layout', 'justifyItems', 'stretch')]: AlignHorizontalDistributeCenter, // 대체 표현

    [key('layout', 'alignItems', 'start')]: AlignStartVertical,
    [key('layout', 'alignItems', 'center')]: AlignCenterVertical,
    [key('layout', 'alignItems', 'end')]: AlignEndVertical,
    [key('layout', 'alignItems', 'stretch')]: StretchVertical,

    [key('layout', 'justifySelf', 'start')]: AlignStartHorizontal,
    [key('layout', 'justifySelf', 'center')]: AlignCenterHorizontal,
    [key('layout', 'justifySelf', 'end')]: AlignEndHorizontal,
    [key('layout', 'justifySelf', 'stretch')]: AlignHorizontalDistributeCenter,

    [key('layout', 'alignSelf', 'start')]: AlignStartVertical,
    [key('layout', 'alignSelf', 'center')]: AlignCenterVertical,
    [key('layout', 'alignSelf', 'end')]: AlignEndVertical,
    [key('layout', 'alignSelf', 'stretch')]: StretchVertical,

    // Sizing / Spacing (대표 키)
    [key('layout', 'boxSizing')]: Box,
    [key('layout', 'padding')]: MoveHorizontal,
    [key('layout', 'margin')]: MoveHorizontal,

    // ───────────────────────────────────────────────────────────
    // Typography
    // ───────────────────────────────────────────────────────────
    [key('typography', 'font-size')]: Type,
    [key('typography', 'fontSize')]: Type,
    [key('typography', 'font-weight')]: Type,
    [key('typography', 'fontWeight')]: Type,

    // text-align (핵심 보강)
    [key('typography', 'textAlign', 'left')]: AlignLeft,
    [key('typography', 'textAlign', 'center')]: AlignCenter,
    [key('typography', 'textAlign', 'right')]: AlignRight,
    [key('typography', 'textAlign', 'justify')]: AlignJustify,

    [key('typography', 'text-align', 'left')]: AlignLeft,
    [key('typography', 'text-align', 'center')]: AlignCenter,
    [key('typography', 'text-align', 'right')]: AlignRight,
    [key('typography', 'text-align', 'justify')]: AlignJustify,

    // text-transform
    [key('typography', 'text-transform', 'capitalize')]: CaseSensitive,
    [key('typography', 'text-transform', 'uppercase')]: CaseUpper,
    [key('typography', 'text-transform', 'lowercase')]: CaseLower,

    [key('typography', 'textTransform', 'capitalize')]: CaseSensitive,
    [key('typography', 'textTransform', 'uppercase')]: CaseUpper,
    [key('typography', 'textTransform', 'lowercase')]: CaseLower,

    // text-decoration
    [key('typography', 'text-decoration', 'underline')]: Underline,
    [key('typography', 'text-decoration', 'line-through')]: Strikethrough,

    [key('typography', 'textDecoration', 'underline')]: Underline,
    [key('typography', 'textDecoration', 'line-through')]: Strikethrough,

    // color
    [key('typography', 'color')]: Type,

    // ───────────────────────────────────────────────────────────
    // Appearance (배경/테두리/투명도 등)
    // ───────────────────────────────────────────────────────────
    [key('appearance', 'backgroundColor')]: Droplet,
    [key('appearance', 'background')]: Image,
    [key('appearance', 'backgroundImage')]: Image,
    [key('appearance', 'backgroundSize')]: Maximize2,
    [key('appearance', 'backgroundRepeat')]: Repeat,
    [key('appearance', 'backgroundPosition')]: Crosshair,
    [key('appearance', 'backgroundClip')]: Layers,
    [key('appearance', 'backgroundOrigin')]: Layers,
    [key('appearance', 'backgroundAttachment')]: Pin,

    //[key('appearance', 'border')]: BorderAll,
    [key('appearance', 'borderWidth')]: Square,
    [key('appearance', 'borderStyle')]: SquareDashed,
    [key('appearance', 'borderColor')]: Droplet,

    [key('appearance', 'borderRadius')]: Scan, // 둥근 모서리 느낌의 대체 아이콘
    [key('appearance', 'outline')]: SquareDashed,
    [key('appearance', 'outlineWidth')]: Square,
    [key('appearance', 'outlineStyle')]: SquareDashed,
    [key('appearance', 'outlineColor')]: Droplet,

    [key('appearance', 'opacity')]: Sun, // 투명도는 Sun/Contrast로 대응
    [key('effects', 'opacity')]: Sun,

    // ───────────────────────────────────────────────────────────
    // Effects
    // ───────────────────────────────────────────────────────────
    [key('effects', 'filter')]: Filter,
    [key('effects', 'brightness')]: Sun,
    [key('effects', 'contrast')]: Contrast,
    [key('effects', 'grayscale')]: Filter,
    [key('effects', 'invert')]: Contrast,
    [key('effects', 'saturate')]: Droplet,
    [key('effects', 'sepia')]: Droplet,
    [key('effects', 'blur')]: Filter,
    [key('effects', 'drop-shadow')]: Layers,

    [key('effects', 'mixBlendMode')]: Layers,

    // Transform
    [key('effects', 'transform')]: RotateCcw,
    [key('effects', 'translate')]: MoveHorizontal,
    [key('effects', 'translateX')]: ArrowLeftRight,
    [key('effects', 'translateY')]: ArrowUpDown,
    [key('effects', 'scale')]: Maximize2,
    [key('effects', 'rotate')]: RotateCcw,
    [key('effects', 'skew')]: Italic,
    [key('effects', 'transformOrigin')]: Crosshair,
    [key('effects', 'perspective')]: Box,

    // Transition
    [key('effects', 'transition')]: Timer,
    //[key('effects', 'transitionProperty')]: BezierCurve,
    [key('effects', 'transitionDuration')]: Clock,
    //[key('effects', 'transitionTimingFunction')]: BezierCurve,
    [key('effects', 'transitionDelay')]: Clock,
};

/**
 * group/prop/value 조합으로 아이콘을 찾는다.
 * 1) 입력 그대로
 * 2) prop을 camelCase로 변환
 * 3) prop을 kebab-case로 변환
 */
export function getIconFor(group: string, prop: string, value?: string): IconCmp | null {
    // 1) 그대로
    const exact = ICONS[key(group, prop, value)] ?? ICONS[key(group, prop)];
    if (exact) return exact;

    // 2) camelCase
    const camel = toCamel(prop);
    if (camel !== prop) {
        const found = ICONS[key(group, camel, value)] ?? ICONS[key(group, camel)];
        if (found) return found;
    }

    // 3) kebab-case
    const kebab = toKebab(prop);
    if (kebab !== prop) {
        const found = ICONS[key(group, kebab, value)] ?? ICONS[key(group, kebab)];
        if (found) return found;
    }

    return null;
}