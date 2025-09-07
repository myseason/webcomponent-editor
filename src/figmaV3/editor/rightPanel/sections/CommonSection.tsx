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

// ✅ 변경점: RightPanelController 사용
import { useRightPanelController } from '../../../controllers/right/RightPanelController';

type AttrMap = Record<string, string>;

export function CommonSection({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    // ✅ 컨트롤러 교체 (호출 패턴 동일)
    const { reader, writer } = useRightPanelController();
    const R = reader; const W = writer;

    // ✅ 기존 state 구성 유지 (reader/writer에서 동일 기능 바인딩)
    const state = {
        ui: R.getUI(),
        project: R.getProject(),
        data: R.data?.(), // 일부 구현에서는 data()가 없을 수 있으므로 optional
        getEffectiveDecl: R.getEffectiveDecl?.bind(R),
        updateNodeStyles: W.updateNodeStyles.bind(W),
        updateNodeProps: W.updateNodeProps.bind(W),
        setNotification: W.setNotification?.bind(W),
        saveNodeAsComponent: W.saveNodeAsComponent?.bind(W),
        updateComponentPolicy: W.updateComponentPolicy?.bind(W),
        update: W.update?.bind(W),
    };

    const { ui, project, updateNodeProps } = state;

    const node = project.nodes[nodeId];
    const def = getDefinition(defId) as ComponentDefinition | undefined;
    const propsObj = (node.props ?? {}) as Record<string, unknown>;

    // __tagAttrs(id) 관리
    const initialAttrs = (propsObj.__tagAttrs as AttrMap | undefined) ?? {};
    const [elemId, setElemId] = React.useState(String(initialAttrs.id ?? node.id));
    const [name, setName] = React.useState(String(propsObj.name ?? ''));
    const [slotId, setSlotId] = React.useState(String(propsObj.slotId ?? ''));

    React.useEffect(() => {
        const p = (project.nodes[nodeId].props ?? {}) as Record<string, unknown>;
        const a = (p.__tagAttrs as AttrMap | undefined) ?? {};
        setElemId(String((a.id as string | undefined) ?? project.nodes[nodeId].id));
        setName(String(p.name ?? ''));
        setSlotId(String(p.slotId ?? ''));
    }, [nodeId, project.nodes]);

    const saveBasic = () => {
        // name/slotId 저장
        updateNodeProps(nodeId, { name, slotId });

        // attrs(id) 저장
        const curAttrs = ((project.nodes[nodeId].props ?? {}) as Record<string, unknown>).__tagAttrs as
            | AttrMap
            | undefined;
        const nextAttrs: AttrMap = { ...(curAttrs ?? {}) };
        if (elemId && elemId.trim()) nextAttrs.id = elemId.trim();
        else delete nextAttrs.id;
        updateNodeProps(nodeId, { __tagAttrs: nextAttrs });
    };

    // 섹션 열림 상태 (기존 패턴 유지)
    const [open, setOpen] = React.useState(true);

    return (
        <div className="mt-0">
            <SectionShellV1 title="Common" open={open} onToggle={() => setOpen((v) => !v)}>
                {/* id (attr) — 풀폭 */}
                <RowV1>
                    <RowLeftV1 title="id (attr)" />
                    <RowRightGridV1>
                        <div className="col-span-6 min-w-0">
                            {!ui.expertMode && (
                                <PermissionLock controlKey="attr:id" componentId={def?.title ?? ''} />
                            )}
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

                {/* name — 풀폭 */}
                <RowV1>
                    <RowLeftV1 title="name" />
                    <RowRightGridV1>
                        <div className="col-span-6 min-w-0">
                            {!ui.expertMode && (
                                <PermissionLock controlKey="props:name" componentId={def?.title ?? ''} />
                            )}
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

                {/* slotId — 풀폭 */}
                <RowV1>
                    <RowLeftV1 title="slotId" />
                    <RowRightGridV1>
                        <div className="col-span-6 min-w-0">
                            {!ui.expertMode && (
                                <PermissionLock controlKey="props:slotId" componentId={def?.title ?? ''} />
                            )}
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

                {/* ⛔️ As(Tag) 블록은 PropsAutoSection으로 이관됨 */}
            </SectionShellV1>
        </div>
    );
}