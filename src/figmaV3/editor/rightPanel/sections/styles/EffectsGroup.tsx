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
        parseShadow(el.boxShadow) ?? { x: 0, y: 2, blur: 8, spread: 0, color: 'rgba(0,0,0,0.15)' }
    );
    const [fvals, setFvals] = React.useState<FilterVals>(parseFilter(el.filter));

    React.useEffect(() => {
        setShadow(parseShadow(el.boxShadow) ?? { x: 0, y: 2, blur: 8, spread: 0, color: 'rgba(0,0,0,0.15)' });
        setFvals(parseFilter(el.filter));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [el.boxShadow, el.filter]);

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
        <div className="border-t border-neutral-200 pt-3 mt-3">
            <button type="button" className="w-full text-left text-[12px] uppercase tracking-wide text-neutral-500 mb-2 flex items-center gap-2" onClick={onToggle}>
                <span className="inline-block w-3">{open ? '▾' : '▸'}</span><span>Effects</span>
            </button>

            {open && (
                <div className="space-y-3">
                    {/* boxShadow */}
                    <div>
                        <Label>boxShadow {!allow.has('boxShadow') && <DisabledHint reason={dis('boxShadow')!} />}</Label>
                        {allow.has('boxShadow') ? (
                            <>
                                <div className="flex items-center gap-1 flex-wrap mb-1">
                                    {[
                                        { name: 'None', v: '' },
                                        { name: 'XS', v: '0 1px 1px rgba(0,0,0,.06)' },
                                        { name: 'SM', v: '0 1px 2px rgba(0,0,0,.12)' },
                                        { name: 'MD', v: '0 2px 8px rgba(0,0,0,.15)' },
                                        { name: 'LG', v: '0 6px 16px rgba(0,0,0,.18)' },
                                        { name: 'XL', v: '0 12px 32px rgba(0,0,0,.22)' },
                                    ].map((p) => (
                                        <ChipBtn key={p.name} title={p.name} onClick={() => patch({ boxShadow: p.v || undefined })}>{p.name}</ChipBtn>
                                    ))}
                                </div>

                                {/* Raw */}
                                <MiniInput value={el.boxShadow as string | undefined} onChange={(v) => patch({ boxShadow: v })} />

                                {/* 전문가: 요소별 조절 + 숫자 필드(우측) */}
                                {expert && (
                                    <div className="grid grid-cols-12 gap-2 mt-2 items-center">
                                        {/* X */}
                                        <label className="col-span-4 text-[12px] text-neutral-600">x(px)</label>
                                        <input className="col-span-5" type="range" min={-64} max={64} step={1}
                                               value={shadow.x} onChange={(e) => commitShadow({ x: Number(e.target.value) })} />
                                        <NumberInput className="col-span-3"
                                                     value={shadow.x}
                                                     onChange={(v) => commitShadow({ x: Number.isFinite(v) ? v : 0 })}
                                                     step={1} />

                                        {/* Y */}
                                        <label className="col-span-4 text-[12px] text-neutral-600">y(px)</label>
                                        <input className="col-span-5" type="range" min={-64} max={64} step={1}
                                               value={shadow.y} onChange={(e) => commitShadow({ y: Number(e.target.value) })} />
                                        <NumberInput className="col-span-3"
                                                     value={shadow.y}
                                                     onChange={(v) => commitShadow({ y: Number.isFinite(v) ? v : 0 })}
                                                     step={1} />

                                        {/* Blur */}
                                        <label className="col-span-4 text-[12px] text-neutral-600">blur(px)</label>
                                        <input className="col-span-5" type="range" min={0} max={96} step={1}
                                               value={shadow.blur} onChange={(e) => commitShadow({ blur: Number(e.target.value) })} />
                                        <NumberInput className="col-span-3"
                                                     value={shadow.blur}
                                                     onChange={(v) => commitShadow({ blur: Math.max(0, Number.isFinite(v) ? v : 0) })}
                                                     step={1} min={0} />

                                        {/* Spread */}
                                        <label className="col-span-4 text-[12px] text-neutral-600">spread(px)</label>
                                        <input className="col-span-5" type="range" min={-64} max={64} step={1}
                                               value={shadow.spread} onChange={(e) => commitShadow({ spread: Number(e.target.value) })} />
                                        <NumberInput className="col-span-3"
                                                     value={shadow.spread}
                                                     onChange={(v) => commitShadow({ spread: Number.isFinite(v) ? v : 0 })}
                                                     step={1} />
                                        {/* Color 필드는 기존 그대로 */}
                                    </div>
                                )}
                            </>
                        ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                    </div>

                    {/* filter */}
                    <div>
                        <Label>filter {!allow.has('filter') && <DisabledHint reason={dis('filter')!} />}</Label>
                        {allow.has('filter') ? (
                            <>
                                <div className="flex items-center gap-1 flex-wrap mb-1">
                                    {[
                                        { name: 'None', v: '' },
                                        { name: 'Blur', v: 'blur(4px)' },
                                        { name: 'Bright+', v: 'brightness(110%)' },
                                        { name: 'Dark-', v: 'brightness(90%)' },
                                        { name: 'Gray', v: 'grayscale(100%)' },
                                        { name: 'Sepia', v: 'sepia(100%)' },
                                    ].map((p) => (
                                        <ChipBtn key={p.name} title={p.name} onClick={() => patch({ filter: p.v || undefined })}>{p.name}</ChipBtn>
                                    ))}
                                </div>

                                <MiniInput value={el.filter as string | undefined} onChange={(v) => patch({ filter: v })} />
                                {expert && (
                                    <div className="grid grid-cols-12 gap-2 mt-2 items-center">
                                        {/* blur */}
                                        <label className="col-span-4 text-[12px] text-neutral-600">blur(px)</label>
                                        <input className="col-span-5" type="range" min={0} max={50} step={0.5}
                                               value={fvals.blur} onChange={(e) => commitFilter({ blur: Number(e.target.value) })} />
                                        <NumberInput className="col-span-3"
                                                     value={fvals.blur}
                                                     onChange={(v) => commitFilter({ blur: Math.max(0, Number.isFinite(v) ? v : 0) })}
                                                     step={0.5} min={0} />

                                        {/* brightness */}
                                        <label className="col-span-4 text-[12px] text-neutral-600">brightness(%)</label>
                                        <input className="col-span-5" type="range" min={0} max={300} step={1}
                                               value={fvals.brightness} onChange={(e) => commitFilter({ brightness: Number(e.target.value) })} />
                                        <NumberInput className="col-span-3"
                                                     value={fvals.brightness}
                                                     onChange={(v) => commitFilter({ brightness: Math.max(0, Number.isFinite(v) ? v : 0) })}
                                                     step={1} min={0} />

                                        {/* contrast */}
                                        <label className="col-span-4 text-[12px] text-neutral-600">contrast(%)</label>
                                        <input className="col-span-5" type="range" min={0} max={300} step={1}
                                               value={fvals.contrast} onChange={(e) => commitFilter({ contrast: Number(e.target.value) })} />
                                        <NumberInput className="col-span-3"
                                                     value={fvals.contrast}
                                                     onChange={(v) => commitFilter({ contrast: Math.max(0, Number.isFinite(v) ? v : 0) })}
                                                     step={1} min={0} />

                                        {/* saturate */}
                                        <label className="col-span-4 text-[12px] text-neutral-600">saturate(%)</label>
                                        <input className="col-span-5" type="range" min={0} max={300} step={1}
                                               value={fvals.saturate} onChange={(e) => commitFilter({ saturate: Number(e.target.value) })} />
                                        <NumberInput className="col-span-3"
                                                     value={fvals.saturate}
                                                     onChange={(v) => commitFilter({ saturate: Math.max(0, Number.isFinite(v) ? v : 0) })}
                                                     step={1} min={0} />
                                    </div>
                                )}

                            </>
                        ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                    </div>

                    {/* opacity 0~1 → UI는 %로 표시 */}
                    <div>
                        <Label>opacity {!allow.has('opacity') && <DisabledHint reason={dis('opacity')!} />}</Label>
                        {allow.has('opacity') ? (
                            <div className="grid grid-cols-12 gap-2 items-center">
                                <input className="col-span-9" type="range" min={0} max={100} step={1}
                                       value={Math.round(((Number(el.opacity) || 1) * 100))}
                                       onChange={(e) => {
                                           const pct = Number(e.target.value);
                                           const v = Math.max(0, Math.min(100, pct)) / 100;
                                           patch({ opacity: v });
                                       }} />
                                <NumberInput className="col-span-3"
                                             value={Math.round(((Number(el.opacity) || 1) * 100))}
                                             onChange={(v) => {
                                                 const clamped = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 100;
                                                 patch({ opacity: clamped / 100 });
                                             }}
                                             step={1} min={0} max={100} />
                            </div>
                        ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                    </div>
                </div>
            )}
        </div>
    );
}