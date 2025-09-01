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
    ColorField,
    ChipBtn,
    DisabledHint,
    useAllowed,
    reasonForKey,
    type DisallowReason,
    PermissionLock,
} from './common';
import { coerceLen } from '../../../../runtime/styleUtils';
import { Link as LinkIcon, Link2Off as UnlinkIcon } from 'lucide-react';
import { useEditor } from '../../../useEditor';

export function BorderGroup(props: {
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

    const borderStyles = ['none', 'solid', 'dashed', 'dotted', 'double'];
    const [corners, setCorners] = React.useState(false);

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
                <span>{open ? '▾' : '▸'} Border</span>
            </div>

            {open && (
                <div className="mt-1 space-y-3">
                    <div className="flex items-center gap-2">
                        <Label>border</Label>
                        {renderLock('borderWidth')}
                        {renderLock('borderStyle')}
                        {renderLock('borderColor')}
                        {!allow.has('borderWidth') && <DisabledHint reason={dis('borderWidth')!} />}
                        {allow.has('borderWidth') ? (
                            <MiniInput
                                value={(el as any).borderWidth}
                                onChange={(v) => patch({ borderWidth: coerceLen(v) })}
                                placeholder="1px"
                                className="w-20"
                            />
                        ) : <span className="text-[11px] text-neutral-400">제한</span>}

                        {!allow.has('borderStyle') && <DisabledHint reason={dis('borderStyle')!} />}
                        {allow.has('borderStyle') ? (
                            <MiniSelect
                                value={(el as any).borderStyle as string | undefined}
                                options={borderStyles}
                                onChange={(v) => patch({ borderStyle: v })}
                                className="w-24"
                            />
                        ) : <span className="text-[11px] text-neutral-400">제한</span>}

                        {!allow.has('borderColor') && <DisabledHint reason={dis('borderColor')!} />}
                        {allow.has('borderColor') ? (
                            <ColorField
                                value={(el as any).borderColor as string | undefined}
                                onChange={(v) => patch({ borderColor: v })}
                            />
                        ) : <span className="text-[11px] text-neutral-400">제한</span>}
                    </div>

                    <div className="flex items-center gap-2">
                        <Label>radius</Label>
                        {renderLock('borderRadius')}
                        {!allow.has('borderRadius') && <DisabledHint reason={dis('borderRadius')!} />}
                        {allow.has('borderRadius') ? (
                            <>
                                <MiniInput
                                    value={(el as any).borderRadius}
                                    onChange={(v) => patch({ borderRadius: coerceLen(v) })}
                                    placeholder="8px"
                                />
                                <div className="flex gap-1">
                                    {[0, 4, 8, 12, 16, 24].map((n) => (
                                        <ChipBtn
                                            key={n}
                                            title={`${n}`}
                                            onClick={() => patch({ borderRadius: n })}
                                            active={(el as any).borderRadius === n}
                                        >
                                            {n}
                                        </ChipBtn>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <span className="text-[11px] text-neutral-400">제한</span>
                        )}

                        {expert && (
                            <ChipBtn
                                title={corners ? 'All corners' : 'Per-corner'}
                                onClick={() => setCorners(!corners)}
                                active={corners}
                            >
                                {corners ? 'Per-corner' : 'All corners'}
                            </ChipBtn>
                        )}
                    </div>

                    {expert && corners && (
                        <div className="pl-24 grid grid-cols-2 gap-2">
                            {([
                                ['borderTopLeftRadius', 'Top-Left'],
                                ['borderTopRightRadius', 'Top-Right'],
                                ['borderBottomRightRadius', 'Bottom-Right'],
                                ['borderBottomLeftRadius', 'Bottom-Left'],
                            ] as const).map(([k, label]) => (
                                <div key={k} className="flex items-center gap-2">
                                    <Label>{label}</Label>
                                    {renderLock(k)}
                                    {!allow.has(k) && <DisabledHint reason={dis(k)!} />}
                                    {allow.has(k) ? (
                                        <MiniInput
                                            value={(el as any)[k]}
                                            onChange={(v) => patch({ [k]: coerceLen(v) })}
                                            placeholder={k}
                                        />
                                    ) : (
                                        <span className="text-[11px] text-neutral-400">제한</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}