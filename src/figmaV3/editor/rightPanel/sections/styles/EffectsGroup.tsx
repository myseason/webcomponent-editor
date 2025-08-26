'use client';
import React from 'react';
import type { CSSDict, InspectorFilter, TagPolicy, TagPolicyMap } from '../../../../core/types';
import { ChipBtn, DisabledHint, Label, MiniInput, NumberInput, useAllowed, DisallowReason, ColorField } from './common';
import { fmtFilter, fmtShadow, parseFilter, parseShadow, FilterVals, Shadow } from './effects-utils';

export function EffectsGroup(props: {
    el: Record<string, unknown>;
    patch: (css: CSSDict) => void;
    expert: boolean;
    tag: string;
    tagPolicy: TagPolicy | undefined;
    tf: InspectorFilter | undefined;
    map: TagPolicyMap | undefined;
    open: boolean;
    onToggle: () => void;
}) {
    const { el, patch, expert, tag, tf, map, tagPolicy, open, onToggle } = props;

    const allow = useAllowed(['boxShadow', 'filter', 'opacity'], tf, tag, map, expert);

    const dis = (k: string): DisallowReason => {
        if (tagPolicy?.styles?.allow && !tagPolicy.styles.allow.includes(k)) return 'tag';
        if (tagPolicy?.styles?.deny && tagPolicy.styles.deny.includes(k)) return 'tag';
        if (!expert && tf?.styles) {
            if (tf.styles.allow && !tf.styles.allow.includes(k)) return 'template';
            if (tf.styles.deny && tf.styles.deny.includes(k)) return 'template';
        }
        return null;
    };

    const [shadow, setShadow] = React.useState<Shadow>(
        parseShadow((el as any).boxShadow) ?? { x: 0, y: 2, blur: 8, spread: 0, color: 'rgba(0,0,0,0.15)' }
    );
    const [fvals, setFvals] = React.useState<FilterVals>(parseFilter((el as any).filter));

    React.useEffect(() => {
        setShadow(parseShadow((el as any).boxShadow) ?? { x: 0, y: 2, blur: 8, spread: 0, color: 'rgba(0,0,0,0.15)' });
        setFvals(parseFilter((el as any).filter));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [(el as any).boxShadow, (el as any).filter]);

    const commitShadow = (next: Partial<Shadow>) => {
        const m = { ...shadow, ...next };
        setShadow(m);
        patch({ boxShadow: fmtShadow(m) });
    };

    const commitFilter = (next: Partial<FilterVals>) => {
        const m = { ...fvals, ...next };
        setFvals(m);
        const s = fmtFilter(m);
        patch({ filter: s || undefined });
    };

    return (
        <div>
            {/* 통일된 타이틀 */}
            <div
                className="flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer select-none px-1 py-1 mt-2"
                onClick={onToggle}
            >
                <span>{open ? '▾' : '▸'} Effects</span>
            </div>

            {open && (
                <div className="mt-2 space-y-3 px-1">
                    {/* boxShadow */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Label>boxShadow</Label>
                            {!allow.has('boxShadow') && <DisabledHint reason={dis('boxShadow')!} />}
                        </div>

                        {allow.has('boxShadow') ? (
                            <>
                                {/* Presets */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {[
                                        { name: 'None', v: '' },
                                        { name: 'XS', v: '0 1px 1px rgba(0,0,0,.06)' },
                                        { name: 'SM', v: '0 1px 2px rgba(0,0,0,.12)' },
                                        { name: 'MD', v: '0 2px 8px rgba(0,0,0,.15)' },
                                        { name: 'LG', v: '0 6px 16px rgba(0,0,0,.18)' },
                                        { name: 'XL', v: '0 12px 32px rgba(0,0,0,.22)' },
                                    ].map((p) => (
                                        <ChipBtn key={p.name} onClick={() => patch({ boxShadow: p.v || undefined })} title={p.name}>
                                            {p.name}
                                        </ChipBtn>
                                    ))}
                                </div>

                                {/* Raw */}
                                <MiniInput
                                    value={String((el as any).boxShadow ?? '')}
                                    onChange={(v) => patch({ boxShadow: v })}
                                    placeholder="x y blur spread color"
                                    className="w-[280px]"
                                />

                                {/* 전문가: 요소별 조절 */}
                                {expert && (
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <Label>x(px)</Label>
                                        <NumberInput value={shadow.x} onChange={(v) => commitShadow({ x: Number.isFinite(v) ? v : 0 })} step={1} />
                                        <Label>y(px)</Label>
                                        <NumberInput value={shadow.y} onChange={(v) => commitShadow({ y: Number.isFinite(v) ? v : 0 })} step={1} />
                                        <Label>blur(px)</Label>
                                        <NumberInput
                                            value={shadow.blur}
                                            onChange={(v) => commitShadow({ blur: Math.max(0, Number.isFinite(v) ? v : 0) })}
                                            step={1}
                                            min={0}
                                        />
                                        <Label>spread(px)</Label>
                                        <NumberInput
                                            value={shadow.spread}
                                            onChange={(v) => commitShadow({ spread: Number.isFinite(v) ? v : 0 })}
                                            step={1}
                                        />
                                        <Label>color</Label>
                                        <ColorField value={shadow.color} onChange={(v) => commitShadow({ color: v })} />
                                    </div>
                                )}
                            </>
                        ) : (
                            <span className="text-xs text-neutral-500">제한됨</span>
                        )}
                    </div>

                    {/* filter */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Label>filter</Label>
                            {!allow.has('filter') && <DisabledHint reason={dis('filter')!} />}
                        </div>

                        {allow.has('filter') ? (
                            <>
                                {/* Presets */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {[
                                        { name: 'None', v: '' },
                                        { name: 'Blur', v: 'blur(4px)' },
                                        { name: 'Bright+', v: 'brightness(110%)' },
                                        { name: 'Dark-', v: 'brightness(90%)' },
                                        { name: 'Gray', v: 'grayscale(100%)' },
                                        { name: 'Sepia', v: 'sepia(100%)' },
                                    ].map((p) => (
                                        <ChipBtn key={p.name} onClick={() => patch({ filter: p.v || undefined })} title={p.name}>
                                            {p.name}
                                        </ChipBtn>
                                    ))}
                                </div>

                                {/* Raw */}
                                <MiniInput
                                    value={String((el as any).filter ?? '')}
                                    onChange={(v) => patch({ filter: v })}
                                    placeholder="blur(4px) brightness(110%) …"
                                    className="w-[280px]"
                                />

                                {/* 전문가: 요소별 조절 */}
                                {expert && (
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <Label>blur(px)</Label>
                                        <NumberInput
                                            value={fvals.blur}
                                            onChange={(v) => commitFilter({ blur: Math.max(0, Number.isFinite(v) ? v : 0) })}
                                            step={0.5}
                                            min={0}
                                        />
                                        <Label>brightness(%)</Label>
                                        <NumberInput
                                            value={fvals.brightness}
                                            onChange={(v) => commitFilter({ brightness: Math.max(0, Number.isFinite(v) ? v : 0) })}
                                            step={1}
                                            min={0}
                                        />
                                        <Label>contrast(%)</Label>
                                        <NumberInput
                                            value={fvals.contrast}
                                            onChange={(v) => commitFilter({ contrast: Math.max(0, Number.isFinite(v) ? v : 0) })}
                                            step={1}
                                            min={0}
                                        />
                                        <Label>saturate(%)</Label>
                                        <NumberInput
                                            value={fvals.saturate}
                                            onChange={(v) => commitFilter({ saturate: Math.max(0, Number.isFinite(v) ? v : 0) })}
                                            step={1}
                                            min={0}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <span className="text-xs text-neutral-500">제한됨</span>
                        )}
                    </div>

                    {/* opacity 0~1 → % UI */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Label>opacity</Label>
                            {!allow.has('opacity') && <DisabledHint reason={dis('opacity')!} />}
                        </div>
                        {allow.has('opacity') ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={Math.round((Number((el as any).opacity ?? 1) || 1) * 100)}
                                    onChange={(e) => {
                                        const pct = Number(e.target.value);
                                        const v = Math.max(0, Math.min(100, pct)) / 100;
                                        patch({ opacity: v });
                                    }}
                                    className="w-[180px]"
                                />
                                <NumberInput
                                    value={Math.round((Number((el as any).opacity ?? 1) || 1) * 100)}
                                    onChange={(v) => {
                                        const clamped = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 100;
                                        patch({ opacity: clamped / 100 });
                                    }}
                                    step={1}
                                    min={0}
                                    max={100}
                                    className="w-[72px]"
                                />
                                <span className="text-xs text-neutral-500">%</span>
                            </div>
                        ) : (
                            <span className="text-xs text-neutral-500">제한됨</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}