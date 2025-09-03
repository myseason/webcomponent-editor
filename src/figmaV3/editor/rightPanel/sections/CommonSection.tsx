'use client';

import * as React from 'react';
import { useEditor } from '../../useEditor';
import { getDefinition } from '../../../core/registry';
import type { NodeId, ComponentDefinition } from '../../../core/types';
import { Check } from 'lucide-react';
import { PermissionLock } from './styles/common';

import {
    SectionShellV1,
    RowV1,
    RowLeftV1,
    RowRightGridV1,
    MiniInputV1,
    MiniSelectV1,
    IconBtnV1,
} from './styles/layoutV1';

type AttrMap = Record<string, unknown>;

export function CommonSection({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    const state = useEditor();
    const { ui, project, updateNodeProps } = state;

    const node = project.nodes[nodeId];
    const def = getDefinition(defId) as ComponentDefinition | undefined;
    const propsObj = (node.props ?? {}) as Record<string, unknown>;
    const initialAttrs = (propsObj.__tagAttrs as AttrMap | undefined) ?? {};

    const [elemId, setElemId] = React.useState<string>(String(initialAttrs.id ?? node.id));
    const [name, setName] = React.useState<string>(String(propsObj.name ?? ''));
    const [slotId, setSlotId] = React.useState<string>(String(propsObj.slotId ?? ''));

    React.useEffect(() => {
        const p = (project.nodes[nodeId].props ?? {}) as Record<string, unknown>;
        const a = (p.__tagAttrs as AttrMap | undefined) ?? {};
        setElemId(String((a.id as string | undefined) ?? project.nodes[nodeId].id));
        setName(String(p.name ?? ''));
        setSlotId(String(p.slotId ?? ''));
    }, [nodeId, project.nodes]);

    const saveBasic = () => {
        updateNodeProps(nodeId, { name, slotId });
        const curAttrs = ((project.nodes[nodeId].props ?? {}) as Record<string, unknown>).__tagAttrs as AttrMap | undefined;
        const nextAttrs: AttrMap = { ...(curAttrs ?? {}) };
        if (elemId && elemId.trim()) nextAttrs.id = elemId.trim();
        else delete nextAttrs.id;
        updateNodeProps(nodeId, { __tagAttrs: nextAttrs });
    };

    const allowedTags = def?.capabilities?.allowedTags ?? ['div'];
    const defaultTag = def?.capabilities?.defaultTag ?? 'div';
    const currentTag = String((propsObj.__tag as string | undefined) ?? defaultTag);
    const [selTag, setSelTag] = React.useState<string>(currentTag);
    React.useEffect(() => setSelTag(currentTag), [currentTag, nodeId]);

    const applyTag = () => {
        updateNodeProps(nodeId, { __tag: selTag });
    };

    const [open, setOpen] = React.useState(true);

    return (
        <SectionShellV1 title="Common" open={open} onToggle={() => setOpen((v) => !v)}>
            {/* id (attr) — 풀폭 */}
            <RowV1>
                <RowLeftV1 title="id (attr)" />
                <RowRightGridV1>
                    <div className="col-span-6">
                        <MiniInputV1
                            value={elemId}
                            onChange={setElemId}
                            onBlur={saveBasic as any}
                            placeholder="element id"
                            size="full"
                            title="element id"
                        />
                    </div>
                </RowRightGridV1>
            </RowV1>

            {/* name — 풀폭 */}
            <RowV1>
                <RowLeftV1 title="name" />
                <RowRightGridV1>
                    <div className="col-span-6">
                        <MiniInputV1
                            value={name}
                            onChange={setName}
                            onBlur={saveBasic as any}
                            placeholder="name"
                            size="full"
                            title="name"
                        />
                    </div>
                </RowRightGridV1>
            </RowV1>

            {/* slotId — 풀폭 */}
            <RowV1>
                <RowLeftV1 title="slotId" />
                <RowRightGridV1>
                    <div className="col-span-6">
                        <MiniInputV1
                            value={slotId}
                            onChange={setSlotId}
                            onBlur={saveBasic as any}
                            placeholder="slot id"
                            size="full"
                            title="slot id"
                        />
                    </div>
                </RowRightGridV1>
            </RowV1>

            {/* As (Tag) — select(4칸, w-full) + 빈칸(1) + Apply(1) */}
            <RowV1>
                <RowLeftV1 title="As (Tag)" />
                <RowRightGridV1>
                    <div className="col-span-4 min-w-0">
                        <MiniSelectV1
                            value={selTag}
                            options={allowedTags}
                            onChange={setSelTag}
                            title="select html tag"
                        />
                    </div>
                    <div /> {/* 빈 1칸 */}
                    <div className="flex items-center justify-end">
                        <IconBtnV1 title="Apply tag" onClick={applyTag} square24>
                            <Check size={16} />
                        </IconBtnV1>
                    </div>
                </RowRightGridV1>
            </RowV1>
        </SectionShellV1>
    );
}