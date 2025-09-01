'use client';
import React from 'react';
import type { CSSDict, InspectorFilter, TagPolicy, TagPolicyMap, NodeId } from '../../../../core/types';
import { ColorField, ChipBtn, Label, MiniInput, DisabledHint, useAllowed, DisallowReason, PermissionLock, reasonForKey } from './common';
import { useEditor } from '../../../useEditor';

type BgMode = 'none' | 'color' | 'image' | 'transparent';

export function BackgroundGroup(props: {
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

    const renderLock = (controlKey: string) => {
        if (ui.mode === 'Component') {
            return <PermissionLock componentId={componentId} controlKey={controlKey} />;
        }
        return null;
    };

    const mode: BgMode = (() => {
        if (typeof (el as any).backgroundImage === 'string' && String((el as any).backgroundImage).trim() !== '') return 'image';
        if ((el as any).backgroundColor === 'transparent') return 'transparent';
        if (typeof (el as any).backgroundColor === 'string') return 'color';
        return 'none';
    })();

    const setMode = (m: BgMode) => {
        const css: CSSDict = {};
        if (m === 'none') {
            css.backgroundColor = undefined;
            css.backgroundImage = undefined;
        } else if (m === 'color') {
            css.backgroundImage = undefined;
            if (typeof (el as any).backgroundColor !== 'string' || (el as any).backgroundColor === 'transparent') css.backgroundColor = '#ffffff';
        } else if (m === 'image') {
            css.backgroundColor = undefined;
            if (typeof (el as any).backgroundImage !== 'string') css.backgroundImage = 'url("")';
        } else if (m === 'transparent') {
            css.backgroundImage = undefined;
            css.backgroundColor = 'transparent';
        }
        patch(css);
    };

    const [url, setUrl] = React.useState('');
    const applyUrl = () => {
        const v = url.trim();
        if (!v) return;
        patch({ backgroundImage: `url("${v}")` });
        setUrl('');
    };

    const onUpload: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === 'string' ? reader.result : '';
            if (dataUrl) patch({ backgroundImage: `url("${dataUrl}")` });
        };
        reader.readAsDataURL(f);
        e.currentTarget.value = '';
    };

    const gradients = [
        { name: 'Sunset', css: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)' },
        { name: 'Ocean', css: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)' },
        { name: 'Midnight', css: 'linear-gradient(135deg, #232526 0%, #414345 100%)' },
        { name: 'Candy', css: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
    ] as const;

    return (
        <div>
            <div
                className="flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer select-none px-1 py-1 mt-2"
                onClick={onToggle}
            >
                <span>{open ? '▾' : '▸'} Background</span>
            </div>

            {open && (
                <div className="mt-2 space-y-3 px-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Label>mode</Label>
                        {(['none', 'color', 'image', 'transparent'] as BgMode[]).map((m) => (
                            <ChipBtn key={m} onClick={() => setMode(m)} active={mode === m} title={m}>
                                {m}
                            </ChipBtn>
                        ))}
                    </div>

                    {mode === 'color' && (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Label>backgroundColor</Label>
                                {renderLock('backgroundColor')}
                                {!allow.has('backgroundColor') && <DisabledHint reason={dis('backgroundColor')!} />}
                                {allow.has('backgroundColor') ? (
                                    <>
                                        <ColorField
                                            value={(el as any).backgroundColor as string | undefined}
                                            onChange={(v) => patch({ backgroundColor: v })}
                                        />
                                        <ChipBtn title="clear" onClick={() => patch({ backgroundColor: undefined })}>
                                            Clear
                                        </ChipBtn>
                                    </>
                                ) : (
                                    <span className="text-xs text-neutral-500">제한됨</span>
                                )}
                            </div>
                        </div>
                    )}

                    {mode === 'image' && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Label>gradient presets</Label>
                                {renderLock('backgroundImage')}
                                {gradients.map((g) => (
                                    <ChipBtn
                                        key={g.name}
                                        onClick={() => patch({ backgroundImage: g.css })}
                                        disabled={!allow.has('backgroundImage')}
                                        title={g.name}
                                    >
                                        {g.name}
                                    </ChipBtn>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <Label>URL / Upload</Label>
                                {allow.has('backgroundImage') ? (
                                    <>
                                        <MiniInput value={url} onChange={setUrl} placeholder="https://…" className="w-24" />
                                        <ChipBtn title="apply" onClick={applyUrl}>Apply</ChipBtn>
                                        <input type="file" accept="image/*" onChange={onUpload} className="text-[11px] max-w-full" />
                                    </>
                                ) : (
                                    <span className="text-xs text-neutral-500">제한됨</span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Label>backgroundSize</Label>
                                {renderLock('backgroundSize')}
                                {!allow.has('backgroundSize') && <DisabledHint reason={dis('backgroundSize')!} />}
                                {allow.has('backgroundSize') ? (
                                    <MiniInput
                                        value={(el as any).backgroundSize as string | undefined}
                                        onChange={(v) => patch({ backgroundSize: v })}
                                    />
                                ) : (
                                    <span className="text-xs text-neutral-500">제한됨</span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Label>backgroundRepeat</Label>
                                {renderLock('backgroundRepeat')}
                                {!allow.has('backgroundRepeat') && <DisabledHint reason={dis('backgroundRepeat')!} />}
                                {allow.has('backgroundRepeat') ? (
                                    <MiniInput
                                        value={(el as any).backgroundRepeat as string | undefined}
                                        onChange={(v) => patch({ backgroundRepeat: v })}
                                    />
                                ) : (
                                    <span className="text-xs text-neutral-500">제한됨</span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Label>backgroundPosition</Label>
                                {renderLock('backgroundPosition')}
                                {!allow.has('backgroundPosition') && <DisabledHint reason={dis('backgroundPosition')!} />}
                                {allow.has('backgroundPosition') ? (
                                    <MiniInput
                                        value={(el as any).backgroundPosition as string | undefined}
                                        onChange={(v) => patch({ backgroundPosition: v })}
                                    />
                                ) : (
                                    <span className="text-xs text-neutral-500">제한됨</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}