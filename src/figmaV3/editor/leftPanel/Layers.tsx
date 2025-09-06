'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
    DndContext,
    DragOverlay,
    useDraggable,
    useDroppable,
    DragStartEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import { Lock, Unlock, Eye, EyeOff, Trash2, GripVertical } from 'lucide-react';

import type { NodeId, Node } from '../../core/types';
import { getDefinition } from '../../core/registry';
import { PanelTitle } from '../../editor/common/PanelTitle';

// ✔ LayersController 최신 버전 사용
import { useLayersController } from '../../controllers/layers/LayersController';

const LINE_COLOR = '#e5e7eb';

const Indent: React.FC<{ depth: number }> = ({ depth }) => (
    <>
        {Array.from({ length: depth }).map((_, i) => (
            <span
                key={i}
                style={{
                    display: 'inline-block',
                    width: 12,
                    borderLeft: `1px solid ${LINE_COLOR}`,
                    height: '100%',
                    marginRight: 4,
                    opacity: 0.5,
                }}
            />
        ))}
    </>
);

function getDisplayName(node: Node): string {
    const t = (node.props as any)?.title;
    if (typeof t === 'string' && t.trim()) return t.trim();
    const def = getDefinition(node.componentId);
    return (def as any)?.title ?? (def as any)?.label ?? node.componentId;
}

/** ───────── Row: 한 줄 (메모 유지, selToken으로 리렌더 트리거) ───────── */
const Row: React.FC<{ id: NodeId; depth: number; rootId: NodeId | null; selToken: string | null }> = memo(
    ({ id, depth, rootId, selToken }) => {
        const { reader: _r, writer: _w } = useLayersController();
        const R = _r();
        const W = _w();

        const node = R.getNode(id as NodeId);
        const isRoot = id === rootId;

        // 드래그는 핸들(Grip)에서만
        const {
            attributes: dragAttrs,
            listeners: dragListeners,
            setNodeRef: setDragHandleRef,
            isDragging,
        } = useDraggable({
            id,
            data: { kind: 'layers-node', nodeId: id },
            // dnd-kit v5 타입이면 TS 우회 필요
            // @ts-expect-error
            activationConstraint: { distance: 4 },
        });

        // 행 전체는 droppable (inside drop)
        const { setNodeRef: setDroppableRef } = useDroppable({
            id,
            data: { kind: 'layers-node', nodeId: id, position: 'inside' },
        });

        if (!node) return null;

        const selected = selToken === id;
        const name = getDisplayName(node as Node);

        const onSelect = useCallback(() => W.setSelectedNodeId(id), [W, id]);
        const onToggleVisible = useCallback(() => W.toggleHidden(id), [W, id]);
        const onToggleLock = useCallback(() => W.toggleLocked(id), [W, id]);
        const onRemove = useCallback(() => {
            if (isRoot) return;
            W.removeNode(id);
        }, [W, id, isRoot]);

        return (
            <div
                ref={setDroppableRef}
                className="flex items-center px-2 py-1 text-sm border-b"
                style={{ borderColor: LINE_COLOR, opacity: isDragging ? 0.5 : 1, background: selected ? '#f3f4f6' : undefined }}
                onClick={onSelect}
            >
                <Indent depth={depth} />

                {/* 드래그 핸들 */}
                <div
                    ref={setDragHandleRef}
                    className="mr-2 opacity-50 cursor-grab active:cursor-grabbing select-none"
                    {...dragAttrs}
                    {...dragListeners}
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical size={14} />
                </div>

                <div className="flex-1 truncate">
                    {name} <span className="opacity-50">({(node as any).componentId})</span>
                </div>

                {!isRoot && (
                    <div className="flex items-center gap-1 ml-2">
                        <button
                            type="button"
                            className="p-1 hover:bg-gray-100 rounded"
                            title={(node as any).locked ? 'Unlock' : 'Lock'}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleLock();
                            }}
                        >
                            {(node as any).locked ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>

                        <button
                            type="button"
                            className="p-1 hover:bg-gray-100 rounded"
                            title={(node as any).isVisible === false ? 'Show' : 'Hide'}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleVisible();
                            }}
                        >
                            {(node as any).isVisible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>

                        <button
                            type="button"
                            className="p-1 hover:bg-red-50 rounded text-red-500"
                            title="Delete"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove();
                            }}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>
        );
    },
);
Row.displayName = 'Row';

/** ───────── Tree: 재귀 렌더 ───────── */
const Tree: React.FC<{ id: NodeId; depth: number; rootId: NodeId | null }> = ({ id, depth, rootId }) => {
    const { reader: _r } = useLayersController();
    const R = _r();

    const node = R.getNode(id);
    if (!node) return null;

    const selToken = R.selectedNodeId() ?? null;

    const children = useMemo(
        () => (R.getChildren(id) as NodeId[]).filter((cid) => !!R.getNode(cid)),
        [id, (node as any)?.children, R.nodesToken()],
    );

    return (
        <>
            <Row id={id} depth={depth} rootId={rootId} selToken={selToken} />
            {children.map((cid) => (
                <Tree key={cid} id={cid} depth={depth + 1} rootId={rootId} />
            ))}
        </>
    );
};

/** ───────── Drag Preview(Row 미니 버전) ───────── */
const DragPreview: React.FC<{ id: NodeId | null }> = ({ id }) => {
    const { reader: _r } = useLayersController();
    const R = _r();
    if (!id) return null;
    const node = R.getNode(id);
    if (!node) return null;
    const name = getDisplayName(node as Node);
    return (
        <div className="px-2 py-1 text-sm rounded shadow-md border bg-white opacity-90">
            {name} <span className="opacity-50">({(node as any).componentId})</span>
        </div>
    );
};

/** ───────── Main: Layers ───────── */
export function Layers() {
    const { reader: _r, writer: _w } = useLayersController();
    const R = _r();
    const W = _w();

    const [activeId, setActiveId] = useState<NodeId | null>(null);

    const editingFragmentId = R.editingFragmentId();
    const fragment = R.getFragmentById(editingFragmentId as string | null);

    // 우선순위: fragment.rootId → 현재 페이지 rootId(project.rootId)
    const rootId: NodeId | null = useMemo(() => {
        if (fragment?.rootId) return fragment.rootId as NodeId;
        return R.getProjectRootId();
    }, [fragment?.rootId, R]);

    const isDescendant = useCallback(
        (ancestor: NodeId, node: NodeId): boolean => {
            if (ancestor === node) return true;
            const queue = [...(R.getChildren(ancestor) as NodeId[])];
            for (let i = 0; i < queue.length; i++) {
                const cid = queue[i];
                if (cid === node) return true;
                const kids = R.getChildren(cid) as NodeId[];
                if (kids?.length) queue.push(...kids);
            }
            return false;
        },
        [R],
    );

    const onDragStart = useCallback((e: DragStartEvent) => {
        const nid = e.active?.data?.current?.nodeId as NodeId | undefined;
        if (nid) setActiveId(nid);
    }, []);

    const onDragEnd = useCallback(
        (e: DragEndEvent) => {
            const fromId = e.active?.data?.current?.nodeId as NodeId | undefined;
            const overId = (e.over?.data?.current as any)?.nodeId as NodeId | undefined;
            setActiveId(null);

            if (!fromId || !overId || fromId === overId) return;

            // 1) 드롭 타깃 보정: 단일 컴포넌트면 → 가장 가까운 컨테이너(Box or canHaveChildren)로 보정
            let containerId: NodeId | null = R.isContainer(overId) ? overId : R.nearestContainer(overId);
            if (!containerId) return; // 컨테이너가 없으면 무시

            // 2) 순환 금지: 자신의 자손에게 드롭 금지
            if (isDescendant(fromId, containerId)) return;

            // 3) 이동(부모 마지막 자식으로 append)
            W.appendChild(containerId, fromId);
            W.setSelectedNodeId(fromId);
        },
        [R, W, isDescendant],
    );

    if (!rootId || !R.getNode(rootId)) {
        return <div className="p-3 text-sm text-gray-500">루트 노드를 찾을 수 없습니다.</div>;
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <PanelTitle title={ 'Layers' } />

            <DndContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-auto">
                    <Tree id={rootId} depth={0} rootId={rootId} />
                </div>

                <DragOverlay dropAnimation={null}>
                    <DragPreview id={activeId} />
                </DragOverlay>
            </DndContext>
        </div>
    );
}