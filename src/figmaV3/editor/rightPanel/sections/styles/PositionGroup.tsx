'use client';
/**
 * PositionGroup v2
 * - position(static/relative/absolute/fixed/sticky)
 * - offset(top/right/bottom/left) / zIndex
 * - overflow-x / overflow-y (기존 설계에 따라 Position 그룹에서 제공)
 * - 허용 키 필터(useAllowed), 제한 배지(DisabledHint)
 */

import React from 'react';
import type {
    CSSDict,
    InspectorFilter,
    TagPolicy,
    TagPolicyMap,
} from '../../../../core/types';
import {
    Label,
    MiniInput,
    MiniSelect,
    DisabledHint,
    useAllowed,
    reasonForKey,
    type DisallowReason,
} from './common';
import { coerceLen } from '../../../../runtime/styleUtils';

export function PositionGroup(props: {
    el: Record<string, unknown>;
    patch: (css: CSSDict) => void;
    tag: string;
    tagPolicy: TagPolicy | undefined;
    tf: InspectorFilter | undefined;
    map: TagPolicyMap | undefined;
    expert: boolean;
    open: boolean;
    onToggle: () => void;
}) {
    const { el, patch, tag, tagPolicy, tf, map, expert, open, onToggle } = props;

    const KEYS = [
        'position', 'top', 'right', 'bottom', 'left', 'zIndex',
        'overflowX', 'overflowY',
    ] as string[];
    const allow = useAllowed(KEYS, tf, tag, map, expert);
    const dis = (k: string): DisallowReason => reasonForKey(k, tagPolicy, tf, expert);

    const pos = ((el as any).position as string) ?? 'static';
    const isOffsetEnabled = pos !== 'static';

    const overflowOptions = ['visible', 'hidden', 'scroll', 'auto', 'clip'];

    return (
        <section className="mt-3">
            <div
                className="flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer select-none"
                onClick={onToggle}
            >
                <span>{open ? '▾' : '▸'} Position</span>
            </div>

            {open && (
                <div className="mt-1 space-y-3">
                    {/* position */}
                    <div className="flex items-center gap-2">
                        <Label>position</Label>
                        {!allow.has('position') && <DisabledHint reason={dis('position')!} />}
                        {allow.has('position') ? (
                            <MiniSelect
                                value={pos}
                                options={['static', 'relative', 'absolute', 'fixed', 'sticky']}
                                onChange={(v) => patch({ position: v })}
                            />
                        ) : (
                            <span className="text-[11px] text-neutral-400">제한됨</span>
                        )}
                    </div>

                    {/* offsets */}
                    <div className="flex items-center gap-2">
                        <Label>offset</Label>
                        {(['top', 'right', 'bottom', 'left'] as const).map((k) => {
                            const disabled = !isOffsetEnabled || !allow.has(k);
                            return (
                                <div key={k} className="flex items-center gap-1">
                                    {!allow.has(k) && <DisabledHint reason={dis(k)!} />}
                                    <MiniInput
                                        value={(el as any)[k]}
                                        onChange={(v) => patch({ [k]: coerceLen(v) })}
                                        placeholder={k}
                                        disabled={disabled}
                                        title={isOffsetEnabled ? k : 'position이 static일 때는 사용 불가'}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* zIndex */}
                    <div className="flex items-center gap-2">
                        <Label>zIndex</Label>
                        {!allow.has('zIndex') && <DisabledHint reason={dis('zIndex')!} />}
                        {allow.has('zIndex') ? (
                            <MiniInput
                                value={(el as any).zIndex}
                                onChange={(v) => {
                                    const n = Number(v);
                                    patch({ zIndex: Number.isFinite(n) ? n : v });
                                }}
                                placeholder="auto | 10"
                            />
                        ) : (
                            <span className="text-[11px] text-neutral-400">제한됨</span>
                        )}
                    </div>

                    {/* overflow axis */}
                    <div className="flex items-center gap-2">
                        <Label>overflow-x / y</Label>
                        {!allow.has('overflowX') && <DisabledHint reason={dis('overflowX')!} />}
                        {allow.has('overflowX') ? (
                            <MiniSelect
                                value={(el as any).overflowX as string | undefined}
                                options={overflowOptions}
                                onChange={(v) => patch({ overflowX: v })}
                            />
                        ) : <span className="text-[11px] text-neutral-400">제한</span>}

                        {!allow.has('overflowY') && <DisabledHint reason={dis('overflowY')!} />}
                        {allow.has('overflowY') ? (
                            <MiniSelect
                                value={(el as any).overflowY as string | undefined}
                                options={overflowOptions}
                                onChange={(v) => patch({ overflowY: v })}
                            />
                        ) : <span className="text-[11px] text-neutral-400">제한</span>}
                    </div>
                </div>
            )}
        </section>
    );
}