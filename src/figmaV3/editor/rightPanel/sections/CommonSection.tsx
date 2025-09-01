'use client';

import * as React from 'react';
import { useEditor } from '../../useEditor';
import { getDefinition } from '../../../core/registry';
import { getEffectivePoliciesForNode, getTagPolicy } from '../../../runtime/capabilities';
import type { NodeId, TagPolicyMap, ComponentDefinition } from '../../../core/types';
import { PermissionLock } from './styles/common';

type AttrMap = Record<string, string>;

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <div className="text-[11px] font-semibold text-neutral-700 px-1 mb-1">{children}</div>;
}
function Row({ children }: { children: React.ReactNode }) {
    return <div className="flex items-center gap-2 px-1 py-0.5">{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
    return <div className="text-xs w-24 shrink-0 text-neutral-500 select-none">{children}</div>;
}

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

    const renderLock = (controlKey: string) => {
        if (ui.mode === 'Component') {
            return <PermissionLock componentId={defId} controlKey={controlKey} />;
        }
        return null;
    };


    return (
        <section className="space-y-4">
            <div>
                <SectionTitle>Common</SectionTitle>
                <Row>
                    <Label>id (attr)</Label>
                    {renderLock('attr:id')}
                    <input
                        className="text-[11px] border rounded px-2 py-1 flex-1 min-w-0"
                        placeholder={node.id}
                        value={elemId}
                        onChange={(e) => setElemId(e.target.value)}
                        onBlur={saveBasic}
                    />
                </Row>
                <Row>
                    <Label>name</Label>
                    {renderLock('props:name')}
                    <input
                        className="text-[11px] border rounded px-2 py-1 flex-1 min-w-0"
                        placeholder="ex) Button A"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={saveBasic}
                    />
                </Row>
                <Row>
                    <Label>slotId</Label>
                    {renderLock('props:slotId')}
                    <input
                        className="text-[11px] border rounded px-2 py-1 flex-1 min-w-0"
                        placeholder="slot identifier"
                        value={slotId}
                        onChange={(e) => setSlotId(e.target.value)}
                        onBlur={saveBasic}
                    />
                </Row>
            </div>

            <div>
                <Row>
                    <Label>As (Tag)</Label>
                    {renderLock('tag')}
                    <select
                        className="text-[11px] border rounded px-2 py-1"
                        value={selTag}
                        onChange={(e) => setSelTag(e.target.value)}
                    >
                        {allowedTags.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                        onClick={applyTag}
                    >
                        Apply
                    </button>
                </Row>
            </div>
        </section>
    );
}