'use client';

import * as React from 'react';
import { getDefinition } from '../../../core/registry';
import type { NodeId, ComponentDefinition } from '../../../core/types';

import { PermissionLock } from './styles/common';
import {
    SectionShellV1,
    RowV1,
    RowLeftV1,
    RowRightGridV1,
    MiniInputV1,
} from './styles/layoutV1';

import { RightDomain, useRightControllerFactory } from '../../../controllers/right/RightControllerFactory';

type AttrMap = Record<string, string>;

export function CommonSection(props: {
    nodeId: NodeId;
    defId: string;
    /** ✅ 선택 props: Inspector.tsx 미수정 */
    open?: boolean;
    onToggle?: () => void;
}) {
    const { nodeId, defId } = props;
    const open = props.open ?? true;
    const onToggle = props.onToggle ?? (() => {});

    // ✅ 컨트롤러 경유 (reader/writer)
    const { reader, writer } = useRightControllerFactory(RightDomain.Inspector);

    const ui = reader.getUI();
    const project = reader.getProject();

    const node = project.nodes[nodeId];
    if (!node) return null;

    const def = getDefinition(defId) as ComponentDefinition | undefined;
    const propsObj = (node.props ?? {}) as Record<string, unknown>;

    const initialAttrs = (propsObj.__tagAttrs as AttrMap | undefined) ?? {};
    const [elemId, setElemId] = React.useState(String(initialAttrs.id ?? node.id));
    const [name, setName] = React.useState(String(propsObj.name ?? ''));
    const [slotId, setSlotId] = React.useState(String(propsObj.slotId ?? ''));

    React.useEffect(() => {
        const p = (project.nodes[nodeId].props ?? {}) as Record<string, unknown>;
        const a = (p.__tagAttrs as AttrMap | undefined) ?? {};
        setElemId(String((a.id as string | undefined) ?? project.nodes[nodeId].id));
        setName(String((p as any).name ?? ''));
        setSlotId(String((p as any).slotId ?? ''));
    }, [nodeId, project.nodes]);

    const saveBasic = () => {
        // name/slotId 저장
        reader.getInspectorVM().updateNodeProps(nodeId, { name, slotId });

        // attrs(id) 저장
        const curAttrs = ((project.nodes[nodeId].props ?? {}) as any).__tagAttrs as AttrMap | undefined;
        const next: AttrMap = { ...(curAttrs ?? {}) };

        if (elemId && elemId.trim().length > 0) next.id = elemId.trim();
        else delete next.id;

        reader.getInspectorVM().updateNodeProps(nodeId, { __tagAttrs: next });
    };

    // ✅ 잠금 토글 (메인 키만)
    const lockControl = (controlKey: string) => {
        if (ui.expertMode) return;
        const componentId = def?.title ?? '';
        const normalized = controlKey.replace(/:/g, '.'); // 'props:name' → 'props.name'
        writer.updateComponentPolicy(componentId, {
            inspector: {
                controls: {
                    [normalized]: { visible: false },
                },
            } as any,
        });
    };

    return (
        <div className="mt-4">
            <SectionShellV1 title="Common" open={open} onToggle={onToggle}>
                {/* id */}
                <RowV1>
                    <RowLeftV1 title="id" />
                    <RowRightGridV1>
                        <div className="col-span-6 min-w-0">
                            <MiniInputV1
                                value={elemId}
                                onChange={setElemId}
                                onBlur={saveBasic}
                                placeholder="element id"
                                size="full"
                                title="id"
                            />
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* name */}
                <RowV1>
                    <RowLeftV1
                        title={
                            <>
                                name
                                {!ui.expertMode && (
                                    <span className="ml-1 inline-flex">
                    <PermissionLock
                        controlKey="props:name"
                        componentId={def?.title ?? ''}
                        disabled={ui.expertMode}
                        onClick={() => lockControl('props:name')}
                    />
                  </span>
                                )}
                            </>
                        }
                    />
                    <RowRightGridV1>
                        <div className="col-span-6 min-w-0">
                            <MiniInputV1
                                value={name}
                                onChange={setName}
                                onBlur={saveBasic}
                                placeholder="friendly name"
                                size="full"
                                title="name"
                            />
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* slotId */}
                <RowV1>
                    <RowLeftV1 title="slotId" />
                    <RowRightGridV1>
                        <div className="col-span-6 min-w-0">
                            <MiniInputV1
                                value={slotId}
                                onChange={setSlotId}
                                onBlur={saveBasic}
                                placeholder="slot identifier"
                                size="full"
                                title="slotId"
                            />
                        </div>
                    </RowRightGridV1>
                </RowV1>
            </SectionShellV1>
        </div>
    );
}