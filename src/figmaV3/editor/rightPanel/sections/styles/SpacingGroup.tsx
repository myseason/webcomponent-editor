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
    ChipBtn,
    DisabledHint,
    IconBtn,
    useAllowed,
    reasonForKey,
    type DisallowReason,
    PermissionLock,
} from './common';
import { coerceLen } from '../../../../runtime/styleUtils';
import { Link as LinkIcon, Link2Off as UnlinkIcon } from 'lucide-react';
import { useEditor } from '../../../useEditor';

export function SpacingGroup(props: {
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

    const [linkMargin, setLinkMargin] = React.useState(true);
    const [linkPadding, setLinkPadding] = React.useState(true);

    const renderLock = (controlKey: string) => {
        if (ui.mode === 'Component') {
            return <PermissionLock componentId={componentId} controlKey={controlKey} />;
        }
        return null;
    };

    const applyMargin = (v: string) => {
        if (linkMargin) {
            patch({ margin: coerceLen(v) });
        } else {
            patch({
                marginTop: coerceLen(v),
                marginRight: coerceLen(v),
                marginBottom: coerceLen(v),
                marginLeft: coerceLen(v),
            });
        }
    };

    const applyPadding = (v: string) => {
        if (linkPadding) {
            patch({ padding: coerceLen(v) });
        } else {
            patch({
                paddingTop: coerceLen(v),
                paddingRight: coerceLen(v),
                paddingBottom: coerceLen(v),
                paddingLeft: coerceLen(v),
            });
        }
    };

    const presets = ['0', '4', '8', '12', '16', '24'];

    return (
        <section className="mt-3">
            <div
                className="flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer select-none"
                onClick={onToggle}
            >
                <span>{open ? '▾' : '▸'} Spacing</span>
            </div>

            {open && (
                <div className="mt-1 space-y-3">

                    {/* ─ margin ─ */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Label>margin</Label>
                            {renderLock('margin')}
                            <IconBtn
                                title={linkMargin ? 'unlink' : 'link all'}
                                onClick={() => setLinkMargin(!linkMargin)}
                            >
                                {linkMargin ? <LinkIcon size={16} /> : <UnlinkIcon size={16} />}
                            </IconBtn>

                            {!allow.has('margin') && !allow.has('marginTop') && <DisabledHint reason={dis('margin')!} />}

                            {(linkMargin ? allow.has('margin') : (allow.has('marginTop') && allow.has('marginRight') && allow.has('marginBottom') && allow.has('marginLeft'))) ? (
                                <MiniInput
                                    value={(el as any).margin ?? ''}
                                    onChange={applyMargin}
                                    placeholder={linkMargin ? 'e.g. 8 | 1rem' : 'all sides'}
                                    className="w-40"
                                />
                            ) : (
                                <span className="text-[11px] text-neutral-400">제한됨</span>
                            )}

                            <div className="ml-2 flex gap-1">
                                {presets.map((p) => (
                                    <ChipBtn
                                        key={`m-${p}`}
                                        title={`margin ${p}`}
                                        onClick={() => applyMargin(p)}
                                    >
                                        {p}
                                    </ChipBtn>
                                ))}
                            </div>
                        </div>

                        {!linkMargin && (
                            <div className="pl-24 space-y-1">
                                {([
                                    ['marginTop', 'Top'],
                                    ['marginRight', 'Right'],
                                    ['marginBottom', 'Bottom'],
                                    ['marginLeft', 'Left'],
                                ] as [string, string][]).map(([k, label]) => (
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

                    {/* ─ padding ─ */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Label>padding</Label>
                            {renderLock('padding')}
                            <IconBtn
                                title={linkPadding ? 'unlink' : 'link all'}
                                onClick={() => setLinkPadding(!linkPadding)}
                            >
                                {linkPadding ? <LinkIcon size={16} /> : <UnlinkIcon size={16} />}
                            </IconBtn>

                            {!allow.has('padding') && !allow.has('paddingTop') && <DisabledHint reason={dis('padding')!} />}

                            {(linkPadding ? allow.has('padding') : (allow.has('paddingTop') && allow.has('paddingRight') && allow.has('paddingBottom') && allow.has('paddingLeft'))) ? (
                                <MiniInput
                                    value={(el as any).padding ?? ''}
                                    onChange={applyPadding}
                                    placeholder={linkPadding ? 'e.g. 8 | 1rem' : 'all sides'}
                                    className="w-40"
                                />
                            ) : (
                                <span className="text-[11px] text-neutral-400">제한됨</span>
                            )}

                            <div className="ml-2 flex gap-1">
                                {presets.map((p) => (
                                    <ChipBtn
                                        key={`p-${p}`}
                                        title={`padding ${p}`}
                                        onClick={() => applyPadding(p)}
                                    >
                                        {p}
                                    </ChipBtn>
                                ))}
                            </div>
                        </div>

                        {!linkPadding && (
                            <div className="pl-24 space-y-1">
                                {([
                                    ['paddingTop', 'Top'],
                                    ['paddingRight', 'Right'],
                                    ['paddingBottom', 'Bottom'],
                                    ['paddingLeft', 'Left'],
                                ] as [string, string][]).map(([k, label]) => (
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
                </div>
            )}
        </section>
    );
}