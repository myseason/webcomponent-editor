'use client';
import React from 'react';
import type { CSSDict, InspectorFilter, TagPolicy, TagPolicyMap, NodeId } from '../../../../core/types';
import { Label, MiniInput, DisabledHint, useAllowed, DisallowReason, PermissionLock, reasonForKey } from './common';
import { useEditor } from '../../../useEditor';

export function CustomGroup(props: {
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
    const { ui, project } = useEditor(); // ✨ [수정] project 상태 가져오기

    const KNOWN_KEYS: string[] = [
        'display','overflow','width','height',
        'color','fontSize','fontWeight','textAlign',
        'position','top','left','right','bottom','zIndex','overflowX','overflowY',
        'margin','padding','marginTop','marginRight','marginBottom','marginLeft',
        'paddingTop','paddingRight','paddingBottom','paddingLeft',
        'border','borderWidth','borderStyle','borderColor','borderRadius',
        'backgroundColor','backgroundImage','backgroundSize','backgroundRepeat','backgroundPosition',
        'boxShadow','filter','opacity',
        'flexDirection','justifyContent','alignItems','gap',
        'gridTemplateColumns','gridTemplateRows','gridAutoFlow','rowGap','columnGap',
    ];

    const allowAll = useAllowed(nodeId);
    // ✨ [수정] reasonForKey에 project와 ui 인자 전달
    const dis = (k: string): DisallowReason => reasonForKey(project, ui, nodeId, k, expert);

    const [k, setK] = React.useState('');
    const [v, setV] = React.useState('');

    const renderLock = (controlKey: string) => {
        if (ui.mode === 'Component') {
            return <PermissionLock componentId={componentId} controlKey={controlKey} />;
        }
        return null;
    };

    const onAdd = () => {
        const key = k.trim();
        if (!key) return;
        const reason = dis(key);
        if (reason) {
            alert(`'${key}' 사용 불가: ${reason}`);
            return;
        }
        patch({ [key]: v } as CSSDict);
        setK('');
        setV('');
    };

    return (
        <div>
            <div
                className="flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer select-none px-1 py-1 mt-2"
                onClick={onToggle}
            >
                <span>{open ? '▾' : '▸'} Custom CSS</span>
            </div>

            {open && (
                <div className="mt-2 space-y-3 px-1">
                    <div className="text-[11px] text-neutral-500">Add any other CSS properties.</div>

                    <div className="space-y-2">
                        {Object.entries(el as Record<string, unknown>)
                            .filter(([key]) => !KNOWN_KEYS.includes(key))
                            .map(([key, val]) => (
                                <div key={key} className="flex items-center gap-2">
                                    <Label>{key}</Label>
                                    {renderLock(key)}
                                    {allowAll.has(key) ? (
                                        <MiniInput
                                            value={String(val ?? '')}
                                            onChange={(nv) => patch({ [key]: nv } as CSSDict)}
                                            placeholder={key}
                                        />
                                    ) : (
                                        <>
                                            <DisabledHint reason={dis(key)!} />
                                            <span className="text-xs text-neutral-500">{String(val ?? '')}</span>
                                        </>
                                    )}
                                    <button
                                        className="text-xs text-neutral-500 hover:text-red-600"
                                        title="remove"
                                        onClick={() => patch({ [key]: undefined } as CSSDict)}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                    </div>

                    <div className="flex items-center gap-2 border-t pt-2">
                        <MiniInput value={k} onChange={setK} placeholder="property" className="w-24" />
                        <MiniInput value={v} onChange={setV} placeholder="value" className="flex-1" />
                        <button className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-xs" onClick={onAdd}>
                            Add
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}