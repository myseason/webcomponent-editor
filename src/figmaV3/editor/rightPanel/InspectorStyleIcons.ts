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

    // Gap / Spacing 대체
    MoveHorizontal,

    // Size
    Maximize, Minimize,
} from 'lucide-react';

export type IconCmp = React.ComponentType<{ size?: number; className?: string }>;

/** prop 표기 변환 */
const toKebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const toCamel = (s: string) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

function key(group: string, prop: string, value?: string) {
    const g = (group || '').trim().toLowerCase();
    const p = (prop || '').trim(); // 입력 그대로
    const v = (value ?? '').trim().toLowerCase();
    return v ? `${g}.${p}:${v}` : `${g}.${p}`;
}

/** 실제 사용하는 prop 이름에 맞춘 매핑 (camel + kebab 모두 보강) */
const ICONS: Record<string, IconCmp> = {
    // display
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

    // justify-content (camel & kebab)
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

    // align-items (camel & kebab)
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

    // overflow
    [key('layout', 'overflow')]: Layout,

    // Typography (샘플)
    [key('typography', 'font-size')]: Type,
    [key('typography', 'fontWeight')]: Type,
    [key('typography', 'text-align')]: Type,
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