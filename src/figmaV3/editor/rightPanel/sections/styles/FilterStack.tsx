'use client';

import React from 'react';
import type { CSSDict, NodeId } from '../../../../core/types';
import { RowV1, RowLeftV1, RowRightGridV1, MiniInputV1, MiniSelectV1 } from './layoutV1';
import type { DisallowReason } from './common';

type AllowApi = { has: (k: string) => boolean };
type DisFn = (k: string) => DisallowReason;
type RenderLock = (key: string) => React.ReactNode;

type FilterItem = { fn: string; arg: string };

function parseFilter(v: string): FilterItem[] {
    const raw = (v || '').trim();
    if (!raw) return [];
    const regex = /[a-z-]+\([^)]+\)/gi;
    const items: FilterItem[] = [];
    const m = raw.match(regex);
    if (m) {
        for (const seg of m) {
            const fn = seg.slice(0, seg.indexOf('('));
            const arg = seg.slice(seg.indexOf('(') + 1, -1);
            items.push({ fn, arg });
        }
    }
    return items;
}
function buildFilter(items: FilterItem[]) {
    return items.map((it) => `${it.fn}(${it.arg})`).join(' ');
}

const FN_OPTIONS = [
    'blur',
    'brightness',
    'contrast',
    'grayscale',
    'hue-rotate',
    'invert',
    'opacity',
    'saturate',
    'sepia',
] as const;

const FILTER_PRESETS = [
    { label: '— preset —', items: [] as FilterItem[] },
    { label: 'soften',      items: [{ fn: 'blur', arg: '4px' }] },
    { label: 'vivid',       items: [{ fn: 'contrast', arg: '1.1' }, { fn: 'saturate', arg: '1.1' }] },
    { label: 'desaturate',  items: [{ fn: 'grayscale', arg: '1' }, { fn: 'brightness', arg: '1.05' }] },
    { label: 'warm',        items: [{ fn: 'sepia', arg: '0.3' }, { fn: 'saturate', arg: '1.05' }] },
] as const;

export function FilterStack(props: {
    el: Record<string, any>;
    patch: (css: CSSDict) => void;   // ← EffectsGroup에서 safePatch로 주입됨
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

    const filter = (el as any)?.filter ? String((el as any).filter) : '';
    const [items, setItems] = React.useState<FilterItem[]>(parseFilter(filter));
    React.useEffect(() => { setItems(parseFilter(((el as any)?.filter ?? '') as string)); }, [el?.filter]);

    const apply = (next: FilterItem[]) => {
        setItems(next);
        safePatch({ filter: next.length ? buildFilter(next) : undefined });
    };
    const add = () => apply([...items, { fn: 'blur', arg: '4px' }]);
    const remove = (idx: number) => apply(items.filter((_, i) => i !== idx));
    const onSelectPreset = (label: string) => {
        if (!allow.has('filter')) return;
        const p = FILTER_PRESETS.find((x) => x.label === label);
        if (!p || p.label === '— preset —') return;
        apply([...items, ...p.items.map((x) => ({ ...x }))]);
    };

    return (
        <>
            {/* 헤더: preset(3) | +add(3) */}
            <RowV1>
                <RowLeftV1 title="filter" />
                <RowRightGridV1>
                    <div className="col-span-3 min-w-0">
                        {renderLock('filter')}
                        <MiniSelectV1
                            value={''}
                            options={FILTER_PRESETS.map((p) => p.label)}
                            onChange={(v) => onSelectPreset(String(v))}
                            title="filter preset"
                            disabled={!allow.has('filter')}
                        />
                    </div>
                    <div className="col-span-3 min-w-0">
                        <button
                            className={`h-[28px] w-full rounded border text-[12px] ${allow.has('filter') ? 'border-gray-300' : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}
                            onClick={() => allow.has('filter') && add()}
                            disabled={!allow.has('filter')}
                            title="add filter"
                        >
                            + add filter
                        </button>
                    </div>
                </RowRightGridV1>
            </RowV1>

            {/* 아이템 */}
            {items.map((it, i) => (
                <RowV1 key={i}>
                    <RowLeftV1 title={i === 0 ? 'items' : ''} />
                    <RowRightGridV1>
                        <div className="col-span-3 min-w-0">
                            <MiniSelectV1
                                value={it.fn}
                                options={[...FN_OPTIONS] as unknown as string[]}
                                onChange={(v) => { const next = items.slice(); next[i] = { ...it, fn: String(v || 'blur') }; apply(next); }}
                                title="filter function"
                            />
                        </div>
                        <div className="col-span-2 min-w-0">
                            <MiniInputV1
                                value={it.arg}
                                onChange={(v) => { const next = items.slice(); next[i] = { ...it, arg: v || '' }; apply(next); }}
                                placeholder="e.g. 4px / 1.2 / 90deg"
                                size="auto"
                                title="filter argument"
                            />
                        </div>
                        <div className="col-span-1 min-w-0">
                            <button className="h-[28px] w-full rounded border border-gray-300 text-[12px]" onClick={() => remove(i)} title="remove filter">×</button>
                        </div>
                    </RowRightGridV1>
                </RowV1>
            ))}
        </>
    );
}