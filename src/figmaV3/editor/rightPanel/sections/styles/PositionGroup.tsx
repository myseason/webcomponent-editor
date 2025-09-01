'use client';

import React from 'react';
import type {
    CSSDict,
    InspectorFilter,
    TagPolicy,
    TagPolicyMap,
    NodeId,
} from '../../../../core/types';
import {
    Label,
    MiniInput,
    MiniSelect,
    DisabledHint,
    useAllowed,
    reasonForKey,
    type DisallowReason,
    PermissionLock,
} from './common';
import { coerceLen } from '../../../../runtime/styleUtils';
import { useEditor } from '../../../useEditor';

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
    nodeId: NodeId;
    componentId: string;
}) {
    const { el, patch, expert, open, onToggle, nodeId, componentId } = props;
    const { ui } = useEditor();

    const allow = useAllowed(nodeId);
    const dis = (k: string): DisallowReason => reasonForKey(nodeId, k, expert);

    const pos = ((el as any).position as string) ?? 'static';
    const isOffsetEnabled = pos !== 'static';

    const overflowOptions = ['visible', 'hidden', 'scroll', 'auto', 'clip'];

    const renderLock = (controlKey: string) => {
        if (ui.mode === 'Component') {
            return <PermissionLock componentId={componentId} controlKey={controlKey} />;
        }
        return null;
    };

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
                    <div className="flex items-center gap-2">
                        <Label>position</Label>
                        {renderLock('position')}
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

                    <div className="flex items-center gap-2">
                        <Label>offset</Label>
                        {renderLock('top')}
                        {renderLock('right')}
                        {renderLock('bottom')}
                        {renderLock('left')}
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
                                        className="w-16"
                                    />
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2">
                        <Label>zIndex</Label>
                        {renderLock('zIndex')}
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

                    <div className="flex items-center gap-2">
                        <Label>overflow-x / y</Label>
                        {renderLock('overflowX')}
                        {renderLock('overflowY')}
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