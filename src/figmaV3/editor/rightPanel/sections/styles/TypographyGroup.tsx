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
    ColorField,
    Label,
    MiniInput,
    ChipBtn,
    DisabledHint,
    useAllowed,
    type DisallowReason,
    PermissionLock,
    reasonForKey,
} from './common';
import { useEditor } from '../../../useEditor';

export function TypographyGroup(props: {
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
    // ✨ [수정] useEditor를 최상위에서 한 번만 호출합니다.
    const { ui, project } = useEditor();

    const allow = useAllowed(nodeId);

    // ✨ [수정] reasonForKey에 project와 ui 상태를 전달합니다.
    const dis = (k: string): DisallowReason => reasonForKey(project, ui, nodeId, k, expert);

    const fw = String((el as any).fontWeight ?? '');
    const ta = String((el as any).textAlign ?? '');

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
                <span>{open ? '▾' : '▸'} Typography</span>
            </div>

            {open && (
                <div className="mt-1 space-y-2">
                    <div className="flex items-center gap-2">
                        <Label>color</Label>
                        {renderLock('color')}
                        {!allow.has('color') && <DisabledHint reason={dis('color')!} />}
                        {allow.has('color') ? (
                            <ColorField
                                value={(el as any)['color'] as string | undefined}
                                onChange={(v) => patch({ color: v })}
                            />
                        ) : (
                            <span className="text-[11px] text-neutral-400">제한됨</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Label>fontSize</Label>
                        {renderLock('fontSize')}
                        {!allow.has('fontSize') && <DisabledHint reason={dis('fontSize')!} />}
                        {allow.has('fontSize') ? (
                            <MiniInput
                                value={(el as any)['fontSize'] as string | number | undefined}
                                onChange={(v) => patch({ fontSize: v })}
                                placeholder="14 | 14px | 1rem"
                            />
                        ) : (
                            <span className="text-[11px] text-neutral-400">제한됨</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Label>fontWeight</Label>
                        {renderLock('fontWeight')}
                        {!allow.has('fontWeight') && <DisabledHint reason={dis('fontWeight')!} />}
                        {allow.has('fontWeight') ? (
                            <div className="flex gap-1">
                                {(['400', '700'] as const).map((w) => (
                                    <ChipBtn
                                        key={w}
                                        title={w === '400' ? 'Regular' : 'Bold'}
                                        onClick={() => patch({ fontWeight: w })}
                                        active={fw === w}
                                    >
                                        {w === '400' ? 'Regular' : 'Bold'}
                                    </ChipBtn>
                                ))}
                            </div>
                        ) : (
                            <span className="text-[11px] text-neutral-400">제한됨</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Label>textAlign</Label>
                        {renderLock('textAlign')}
                        {!allow.has('textAlign') && <DisabledHint reason={dis('textAlign')!} />}
                        {allow.has('textAlign') ? (
                            <div className="flex gap-1">
                                {(['left', 'center', 'right'] as const).map((a) => (
                                    <ChipBtn
                                        key={a}
                                        title={a}
                                        onClick={() => patch({ textAlign: a })}
                                        active={ta === a}
                                    >
                                        {a}
                                    </ChipBtn>
                                ))}
                            </div>
                        ) : (
                            <span className="text-[11px] text-neutral-400">제한됨</span>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}