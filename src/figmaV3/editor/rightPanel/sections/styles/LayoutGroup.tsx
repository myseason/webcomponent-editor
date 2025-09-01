'use client';

import React from 'react';
import type {
    CSSDict,
    InspectorFilter,
    TagPolicy,
    TagPolicyMap,
    NodeId,
    ComponentDefinition,
} from '../../../../core/types';
import {
    useAllowed,
    Label,
    MiniSelect,
    MiniInput,
    ChipBtn,
    DisabledHint,
    type DisallowReason,
    IconBtn,
    PermissionLock,
    reasonForKey,
} from './common';
import { getDefinition } from '../../../../core/registry';
import {
    AlignStartHorizontal,
    AlignCenterHorizontal,
    AlignEndHorizontal,
    AlignHorizontalSpaceBetween,
    AlignHorizontalSpaceAround,
    AlignHorizontalDistributeCenter,
    AlignStartVertical,
    AlignCenterVertical,
    AlignEndVertical,
    AlignVerticalSpaceBetween,
    AlignVerticalSpaceAround,
    AlignVerticalDistributeCenter,
    StretchHorizontal,
    StretchVertical,
    GalleryHorizontal,
    GalleryVertical,
    ArrowLeftRight,
    ArrowUpDown,
} from 'lucide-react';
import { coerceLen } from '../../../../runtime/styleUtils';
import { useEditor } from '../../../useEditor';

type IconCmp = React.ComponentType<{ size?: number; className?: string }>;

function isContainer(def: ComponentDefinition | undefined): boolean {
    return def?.capabilities?.canHaveChildren === true;
}


export function LayoutGroup(props: {
    el: Record<string, unknown>;
    tag: string;
    tagPolicy: TagPolicy | undefined;
    tf: InspectorFilter | undefined;
    map: TagPolicyMap | undefined;
    expert: boolean;
    patch: (css: CSSDict) => void;
    open: boolean;
    onToggle: () => void;
    nodeId: NodeId;
    componentId: string;
}) {
    const { el, patch, expert, open, onToggle, nodeId, componentId } = props;
    const { ui, project } = useEditor();
    const def = getDefinition(componentId);

    const allow = useAllowed(nodeId);
    const dis = (k: string): DisallowReason => reasonForKey(project, ui, nodeId, k, expert);

    const display = ((el as any).display as string) ?? 'block';
    const isInline = display === 'inline';
    const container = isContainer(def);

    const dir = ((el as any).flexDirection as string) ?? 'row';
    const isCol = dir === 'column' || dir === 'column-reverse';

    const renderLock = (controlKey: string) => {
        if (ui.mode === 'Component') {
            return <PermissionLock componentId={componentId} controlKey={controlKey} />;
        }
        return null;
    };

    const justifyIcons: { v: string; title: string; I: IconCmp }[] = isCol
        ? [
            { v: 'flex-start', title: 'flex-start', I: AlignStartVertical },
            { v: 'center', title: 'center', I: AlignCenterVertical },
            { v: 'flex-end', title: 'flex-end', I: AlignEndVertical },
            { v: 'space-between', title: 'space-between', I: AlignVerticalSpaceBetween },
            { v: 'space-around', title: 'space-around', I: AlignVerticalSpaceAround },
            { v: 'space-evenly', title: 'space-evenly', I: AlignVerticalDistributeCenter },
        ]
        : [
            { v: 'flex-start', title: 'flex-start', I: AlignStartHorizontal },
            { v: 'center', title: 'center', I: AlignCenterHorizontal },
            { v: 'flex-end', title: 'flex-end', I: AlignEndHorizontal },
            { v: 'space-between', title: 'space-between', I: AlignHorizontalSpaceBetween },
            { v: 'space-around', title: 'space-around', I: AlignHorizontalSpaceAround },
            { v: 'space-evenly', title: 'space-evenly', I: AlignHorizontalDistributeCenter },
        ];

    const alignIcons: { v: string; title: string; I: IconCmp }[] = isCol
        ? [
            { v: 'flex-start', title: 'flex-start', I: AlignStartHorizontal },
            { v: 'center', title: 'center', I: AlignCenterHorizontal },
            { v: 'flex-end', title: 'flex-end', I: AlignEndHorizontal },
            { v: 'stretch', title: 'stretch', I: StretchHorizontal },
        ]
        : [
            { v: 'flex-start', title: 'flex-start', I: AlignStartVertical },
            { v: 'center', title: 'center', I: AlignCenterVertical },
            { v: 'flex-end', title: 'flex-end', I: AlignEndVertical },
            { v: 'stretch', title: 'stretch', I: StretchVertical },
        ];

    const parseRepeat = (v: unknown): number | null => {
        if (typeof v !== 'string') return null;
        const m = v.trim().match(/^repeat\((\d+),\s*1fr\)$/);
        return m ? Number(m[1]) : null;
    };
    const cols = parseRepeat((el as any).gridTemplateColumns);
    const rows = parseRepeat((el as any).gridTemplateRows);
    const setCols = (n: number | 'auto') =>
        n === 'auto'
            ? patch({ gridTemplateColumns: undefined })
            : patch({ gridTemplateColumns: `repeat(${n}, 1fr)` });
    const setRows = (n: number | 'auto') =>
        n === 'auto'
            ? patch({ gridTemplateRows: undefined })
            : patch({ gridTemplateRows: `repeat(${n}, 1fr)` });

    return (
        <section className="mt-3">
            <div
                className="flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer select-none"
                onClick={onToggle}
            >
                <span>{open ? '▾' : '▸'} Layout</span>
            </div>

            {open && (
                <div className="mt-1 space-y-2">
                    <div className="flex items-center gap-2">
                        <Label>display</Label>
                        {renderLock('display')}
                        {!allow.has('display') && <DisabledHint reason={dis('display')!} />}
                        {allow.has('display') ? (
                            <div className="flex gap-1 flex-wrap">
                                {(['block', 'inline', 'flex', 'grid'] as const).map((v) => (
                                    <ChipBtn
                                        key={v}
                                        title={v}
                                        onClick={() => patch({ display: v })}
                                        active={display === v}
                                    >
                                        {v}
                                    </ChipBtn>
                                ))}
                            </div>
                        ) : (
                            <span className="text-[11px] text-neutral-400">제한됨</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Label>overflow</Label>
                        {renderLock('overflow')}
                        {!allow.has('overflow') && <DisabledHint reason={dis('overflow')!} />}
                        {allow.has('overflow') ? (
                            <MiniSelect
                                value={(el as any).overflow as string | undefined}
                                options={['visible', 'hidden', 'scroll', 'auto', 'clip']}
                                onChange={(v) => patch({ overflow: v })}
                                className="w-auto"
                            />
                        ) : (
                            <span className="text-[11px] text-neutral-400">제한됨</span>
                        )}
                    </div>

                    {!isInline ? (
                        <>
                            <div className="flex items-center gap-2">
                                <Label>width / height</Label>
                                {renderLock('width')}
                                {renderLock('height')}
                                {!allow.has('width') && <DisabledHint reason={dis('width')!} />}
                                {allow.has('width') ? (
                                    <MiniInput
                                        value={(el as any)['width'] as string | number | undefined}
                                        onChange={(v) => patch({ width: coerceLen(v) })}
                                        placeholder="auto"
                                    />
                                ) : (
                                    <span className="text-[11px] text-neutral-400">제한됨</span>
                                )}
                                {!allow.has('height') && <DisabledHint reason={dis('height')!} />}
                                {allow.has('height') ? (
                                    <MiniInput
                                        value={(el as any)['height'] as string | number | undefined}
                                        onChange={(v) => patch({ height: coerceLen(v) })}
                                        placeholder="auto"
                                    />
                                ) : (
                                    <span className="text-[11px] text-neutral-400">제한됨</span>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-[11px] text-neutral-500 px-1">
                            display:inlineでは width/height が適用されません。
                        </div>
                    )}

                    {container && display === 'flex' && (
                        <>
                            <div className="text-[10px] text-neutral-500 pt-1 px-1">Flex Container</div>
                            <div className="flex items-center gap-2">
                                <Label>direction</Label>
                                {renderLock('flexDirection')}
                                {!allow.has('flexDirection') && <DisabledHint reason={dis('flexDirection')!} />}
                                <div className="flex gap-1 flex-wrap">
                                    {[
                                        { v: 'row', I: GalleryHorizontal, title: 'row' },
                                        { v: 'row-reverse', I: ArrowLeftRight, title: 'row-reverse' },
                                        { v: 'column', I: GalleryVertical, title: 'column' },
                                        { v: 'column-reverse', I: ArrowUpDown, title: 'column-reverse' },
                                    ].map(({ v, I, title }) => (
                                        <IconBtn key={v} title={title} onClick={() => patch({ flexDirection: v })} disabled={!allow.has('flexDirection')} active={dir === v}>
                                            <I size={16} />
                                        </IconBtn>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label>justify</Label>
                                {renderLock('justifyContent')}
                                {!allow.has('justifyContent') && <DisabledHint reason={dis('justifyContent')!} />}
                                <div className="flex gap-1 flex-wrap">
                                    {justifyIcons.map(({ v, I, title }) => (
                                        <IconBtn key={v} title={title} onClick={() => patch({ justifyContent: v })} disabled={!allow.has('justifyContent')} active={(el as any).justifyContent === v}>
                                            <I size={16} />
                                        </IconBtn>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label>align</Label>
                                {renderLock('alignItems')}
                                {!allow.has('alignItems') && <DisabledHint reason={dis('alignItems')!} />}
                                <div className="flex gap-1 flex-wrap">
                                    {alignIcons.map(({ v, I, title }) => (
                                        <IconBtn key={v} title={title} onClick={() => patch({ alignItems: v })} disabled={!allow.has('alignItems')} active={(el as any).alignItems === v}>
                                            <I size={16} />
                                        </IconBtn>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label>gap</Label>
                                {renderLock('gap')}
                                {!allow.has('gap') && <DisabledHint reason={dis('gap')!} />}
                                {allow.has('gap') ? (
                                    <MiniInput value={(el as any)['gap'] as string | number | undefined} onChange={(v) => patch({ gap: coerceLen(v) })} placeholder="8px" />
                                ) : (
                                    <span className="text-[11px] text-neutral-400">제한됨</span>
                                )}
                            </div>
                        </>
                    )}

                    {container && display === 'grid' && (
                        <>
                            <div className="text-[10px] text-neutral-500 pt-1 px-1">Grid Container</div>
                            <div className="flex items-center gap-2">
                                <Label>columns</Label>
                                {renderLock('gridTemplateColumns')}
                                {!allow.has('gridTemplateColumns') && <DisabledHint reason={dis('gridTemplateColumns')!} />}
                                {allow.has('gridTemplateColumns') ? (
                                    <div className="flex gap-1 flex-wrap">
                                        <ChipBtn title="Auto" onClick={() => setCols('auto')} active={cols === null}>Auto</ChipBtn>
                                        {[1, 2, 3, 4, 5, 6].map((n) => (
                                            <ChipBtn key={n} title={`${n}`} onClick={() => setCols(n)} active={cols === n}>{n}</ChipBtn>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-[11px] text-neutral-400">제한됨</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Label>rows</Label>
                                {renderLock('gridTemplateRows')}
                                {!allow.has('gridTemplateRows') && <DisabledHint reason={dis('gridTemplateRows')!} />}
                                {allow.has('gridTemplateRows') ? (
                                    <div className="flex gap-1 flex-wrap">
                                        <ChipBtn title="Auto" onClick={() => setRows('auto')} active={rows === null}>Auto</ChipBtn>
                                        {[1, 2, 3, 4].map((n) => (
                                            <ChipBtn key={n} title={`${n}`} onClick={() => setRows(n)} active={rows === n}>{n}</ChipBtn>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-[11px] text-neutral-400">제한됨</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Label>gap</Label>
                                {renderLock('gap')}
                                {renderLock('rowGap')}
                                {renderLock('columnGap')}
                                {!allow.has('gap') && <DisabledHint reason={dis('gap')!} />}
                                {allow.has('gap') ? (
                                    <MiniInput value={(el as any)['gap'] as string | number | undefined} onChange={(v) => patch({ gap: coerceLen(v) })} placeholder="8px" />
                                ) : (
                                    <span className="text-[11px] text-neutral-400">제한됨</span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </section>
    );
}