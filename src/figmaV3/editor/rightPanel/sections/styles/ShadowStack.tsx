'use client';

import React from 'react';
import type { CSSDict, NodeId } from '../../../../core/types';
import { RowV1, RowLeftV1, RowRightGridV1, MiniInputV1, MiniSelectV1 } from './layoutV1';
import { ColorField, type DisallowReason } from './common';

type AllowApi = { has: (k: string) => boolean };
type DisFn = (k: string) => DisallowReason;
type RenderLock = (key: string) => React.ReactNode;

type ShadowItem = {
    inset?: boolean;
    x: string;
    y: string;
    blur: string;
    spread: string;
    color: string;
};

function s(v: unknown) {
    if (v === undefined || v === null) return '';
    return String(v).trim();
}

/* parse/build helpers (동일) */
function splitOutsideParens(str: string): string[] { /* ... 동일 구현 ... */
    const out: string[] = []; let cur = ''; let depth = 0;
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (ch === '(') depth++;
        if (ch === ')') depth = Math.max(0, depth - 1);
        if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
        cur += ch;
    }
    if (cur) out.push(cur);
    return out;
}
const colorRegex = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsl[a]?\([^)]+\))$/;
function parseBoxShadow(v: string): ShadowItem[] { /* ... 동일 구현 ... */
    const raw = s(v);
    if (!raw) return [];
    const chunks = splitOutsideParens(raw).map((t) => t.trim());
    const items: ShadowItem[] = [];
    for (const c of chunks) {
        const item: ShadowItem = { inset: false, x: '0px', y: '0px', blur: '0px', spread: '0px', color: 'rgba(0,0,0,0.2)' };
        let t = c;
        if (/(\s|^)inset(\s|$)/i.test(t)) { item.inset = true; t = t.replace(/(\s|^)inset(\s|$)/i, ' ').trim(); }
        const m = t.match(colorRegex);
        if (m) { item.color = m[0]; t = t.slice(0, t.length - m[0].length).trim(); }
        const toks = t.split(/\s+/).filter(Boolean);
        if (toks[0]) item.x = toks[0];
        if (toks[1]) item.y = toks[1];
        if (toks[2]) item.blur = toks[2];
        if (toks[3]) item.spread = toks[3];
        items.push(item);
    }
    return items;
}
function buildBoxShadow(items: ShadowItem[]): string {
    return items.map((it) => {
        const parts: string[] = [];
        if (it.inset) parts.push('inset');
        parts.push(s(it.x) || '0px', s(it.y) || '0px', s(it.blur) || '0px', s(it.spread) || '0px', s(it.color) || 'rgba(0,0,0,0.2)');
        return parts.join(' ');
    }).join(', ');
}

/* presets */
const SHADOW_PRESETS = [
    { label: '— preset —', item: { inset: false, x: '0px', y: '0px', blur: '0px', spread: '0px', color: 'rgba(0,0,0,0.2)' } },
    { label: 'soft',   item: { inset: false, x: '0px', y: '2px', blur: '8px',  spread: '0px', color: 'rgba(0,0,0,0.15)' } },
    { label: 'medium', item: { inset: false, x: '0px', y: '4px', blur: '12px', spread: '0px', color: 'rgba(0,0,0,0.20)' } },
    { label: 'hard',   item: { inset: false, x: '0px', y: '8px', blur: '20px', spread: '0px', color: 'rgba(0,0,0,0.25)' } },
    { label: 'inner',  item: { inset: true,  x: '0px', y: '2px', blur: '6px',  spread: '0px', color: 'rgba(0,0,0,0.20)' } },
] as const;

export function ShadowStack(props: {
    el: Record<string, any>;
    patch: (css: CSSDict) => void;      // ← EffectsGroup에서 safePatch로 주입됨
    nodeId: NodeId;
    componentId: string;
    allow: AllowApi;
    dis: DisFn;
    renderLock: RenderLock;
}) {
    const { el, patch, allow, renderLock } = props;

    /* 🔐 마운트-세이프 */
    const mountedRef = React.useRef(false);
    React.useEffect(() => { mountedRef.current = true; }, []);
    const safePatch = React.useCallback((css: CSSDict) => {
        if (!mountedRef.current) return;
        patch(css);
    }, [patch]);

    const boxShadow = ((el as any)?.boxShadow ? String((el as any).boxShadow) : '');
    const [items, setItems] = React.useState<ShadowItem[]>(parseBoxShadow(boxShadow));
    React.useEffect(() => { setItems(parseBoxShadow(((el as any)?.boxShadow ?? '') as string)); }, [el?.boxShadow]);

    const apply = (next: ShadowItem[]) => {
        setItems(next);
        safePatch({ boxShadow: next.length ? buildBoxShadow(next) : undefined });
    };

    const add = () => apply([...items, { inset: false, x: '0px', y: '2px', blur: '8px', spread: '0px', color: 'rgba(0,0,0,0.15)' }]);
    const remove = (idx: number) => apply(items.filter((_, i) => i !== idx));
    const onSelectPreset = (label: string) => {
        if (!allow.has('boxShadow')) return;
        const p = SHADOW_PRESETS.find((x) => x.label === label);
        if (!p || p.label === '— preset —') return;
        apply([...items, { ...p.item }]);
    };

    return (
        <>
            {/* 헤더: preset(3) | +add(3) */}
            <RowV1>
                <RowLeftV1 title="shadow" />
                <RowRightGridV1>
                    <div className="col-span-3 min-w-0">
                        {renderLock('boxShadow')}
                        <MiniSelectV1
                            value={''}
                            options={SHADOW_PRESETS.map((p) => p.label)}
                            onChange={(v) => onSelectPreset(String(v))}
                            title="shadow preset"
                            disabled={!allow.has('boxShadow')}
                        />
                    </div>
                    <div className="col-span-3 min-w-0">
                        <button
                            className={`h-[28px] w-full rounded border text-[12px] ${allow.has('boxShadow') ? 'border-gray-300' : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}
                            onClick={() => allow.has('boxShadow') && add()}
                            disabled={!allow.has('boxShadow')}
                            title="add shadow"
                        >
                            + add shadow
                        </button>
                    </div>
                </RowRightGridV1>
            </RowV1>

            {/* 아이템(2줄) */}
            {items.map((it, i) => (
                <React.Fragment key={i}>
                    <RowV1>
                        <RowLeftV1 title={i === 0 ? 'items' : ''} />
                        <RowRightGridV1>
                            <div className="col-span-1 min-w-0">
                                <MiniSelectV1
                                    value={it.inset ? 'inset' : 'outer'}
                                    options={['outer', 'inset']}
                                    onChange={(v) => { const nv = v === 'inset'; const next = items.slice(); next[i] = { ...it, inset: nv }; apply(next); }}
                                    title="shadow type"
                                />
                            </div>
                            <div className="col-span-1 min-w-0"><MiniInputV1 value={it.x} onChange={(v) => { const next = items.slice(); next[i] = { ...it, x: v || '0px' }; apply(next); }} placeholder="0px" size="auto" title="offset-x" /></div>
                            <div className="col-span-1 min-w-0"><MiniInputV1 value={it.y} onChange={(v) => { const next = items.slice(); next[i] = { ...it, y: v || '0px' }; apply(next); }} placeholder="2px" size="auto" title="offset-y" /></div>
                            <div className="col-span-1 min-w-0"><MiniInputV1 value={it.blur} onChange={(v) => { const next = items.slice(); next[i] = { ...it, blur: v || '0px' }; apply(next); }} placeholder="8px" size="auto" title="blur" /></div>
                            <div className="col-span-1 min-w-0"><MiniInputV1 value={it.spread} onChange={(v) => { const next = items.slice(); next[i] = { ...it, spread: v || '0px' }; apply(next); }} placeholder="0px" size="auto" title="spread" /></div>
                            <div className="col-span-1" />
                        </RowRightGridV1>
                    </RowV1>

                    <RowV1>
                        <RowLeftV1 title="" />
                        <RowRightGridV1>
                            <div className="col-span-5 min-w-0">
                                <div className="origin-left scale-90 w-full">
                                    <ColorField
                                        value={it.color || 'rgba(0,0,0,0.2)'}
                                        onChange={(v) => { const next = items.slice(); next[i] = { ...it, color: s(v) || 'rgba(0,0,0,0.2)' }; apply(next); }}
                                    />
                                </div>
                            </div>
                            <div className="col-span-1 min-w-0">
                                <button className="h-[28px] w-full rounded border border-gray-300 text-[12px]" onClick={() => remove(i)} title="remove shadow">×</button>
                            </div>
                        </RowRightGridV1>
                    </RowV1>
                </React.Fragment>
            ))}
        </>
    );
}