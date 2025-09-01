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
    const { ui, project } = useEditor();

    const allow = useAllowed(nodeId);
    const dis = (k: string): DisallowReason => reasonForKey(project, ui, nodeId, k, expert);

    const [linkMargin, setLinkMargin] = React.useState(true);
    const [linkPadding, setLinkPadding] = React.useState(true);

    const renderLock = (controlKey: string) => {
        if (ui.mode === 'Component') {
            return <PermissionLock componentId={componentId} controlKey={controlKey} />;
        }
        return null;
    };

    const applyMargin = (v: string) => {
        const value = coerceLen(v);
        const patchCss: CSSDict = linkMargin
            ? { margin: value, marginTop: undefined, marginRight: undefined, marginBottom: undefined, marginLeft: undefined }
            : { margin: undefined, marginTop: value, marginRight: value, marginBottom: value, marginLeft: value };
        patch(patchCss);
    };

    const applyPadding = (v: string) => {
        const value = coerceLen(v);
        const patchCss: CSSDict = linkPadding
            ? { padding: value, paddingTop: undefined, paddingRight: undefined, paddingBottom: undefined, paddingLeft: undefined }
            : { padding: undefined, paddingTop: value, paddingRight: value, paddingBottom: value, paddingLeft: value };
        patch(patchCss);
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

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
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
                                    placeholder={linkMargin ? 'e.g. 8px' : 'all sides'}
                                    className="w-24"
                                />
                            ) : (
                                <span className="text-[11px] text-neutral-400">제한됨</span>
                            )}

                            <div className="flex gap-1 flex-wrap">
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
                            <div className="pl-8 grid grid-cols-2 gap-x-2 gap-y-1">
                                {([
                                    ['marginTop', 'Top'],
                                    ['marginRight', 'Right'],
                                    ['marginBottom', 'Bottom'],
                                    ['marginLeft', 'Left'],
                                ] as const).map(([k, label]) => (
                                    <div key={k} className="flex items-center gap-2">
                                        <Label>{label}</Label>
                                        {renderLock(k)}
                                        {!allow.has(k) && <DisabledHint reason={dis(k)!} />}
                                        {allow.has(k) ? (
                                            <MiniInput
                                                value={(el as any)[k]}
                                                onChange={(v) => patch({ [k]: coerceLen(v) })}
                                                placeholder="auto"
                                            />
                                        ) : (
                                            <span className="text-[11px] text-neutral-400">제한</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
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
                                    placeholder={linkPadding ? 'e.g. 8px' : 'all sides'}
                                    className="w-24"
                                />
                            ) : (
                                <span className="text-[11px] text-neutral-400">제한됨</span>
                            )}

                            <div className="flex gap-1 flex-wrap">
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
                            <div className="pl-8 grid grid-cols-2 gap-x-2 gap-y-1">
                                {([
                                    ['paddingTop', 'Top'],
                                    ['paddingRight', 'Right'],
                                    ['paddingBottom', 'Bottom'],
                                    ['paddingLeft', 'Left'],
                                ] as const).map(([k, label]) => (
                                    <div key={k} className="flex items-center gap-2">
                                        <Label>{label}</Label>
                                        {renderLock(k)}
                                        {!allow.has(k) && <DisabledHint reason={dis(k)!} />}
                                        {allow.has(k) ? (
                                            <MiniInput
                                                value={(el as any)[k]}
                                                onChange={(v) => patch({ [k]: coerceLen(v) })}
                                                placeholder="auto"
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