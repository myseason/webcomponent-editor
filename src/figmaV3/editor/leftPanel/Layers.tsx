'use client';
import React, { memo, useCallback, useMemo } from 'react';
import { useEditor } from '../useEditor';
import type { NodeId, Node } from '../../core/types';
import { getDefinition } from '../../core/registry';
import { Lock, Unlock, Eye, EyeOff, Trash2, GripVertical } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import {PanelTitle} from "@/figmaV3/editor/common/PanelTitle";

const LINE_COLOR = '#e5e7eb';

const Indent: React.FC<{ depth: number }> = ({ depth }) => {
    return (
        <span style={{ display: 'inline-flex', height: '100%', alignItems: 'center' }}>
            {Array.from({ length: depth }).map((_, i) => (
                <span key={i} style={{ display: 'inline-block', width: 16, position: 'relative', height: '100%' }}>
                    <span
                        style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: 8,
                            width: 0,
                            borderLeft: `1px solid ${LINE_COLOR}`,
                            opacity: 0.7,
                        }}
                    />
                </span>
            ))}
        </span>
    );
};

function getDisplayName(node: Node): string {
    const t = (node.props as any)?.title;
    if (typeof t === 'string' && t.trim()) return t.trim();
    const def = getDefinition(node.componentId);
    return (def as any)?.title ?? (def as any)?.label ?? node.componentId;
}

const Row: React.FC<{ id: NodeId; depth: number }> = memo(({ id, depth }) => {
    const state = useEditor();
    const node = state.project.nodes[id];

    const { attributes, listeners, setNodeRef: draggableRef, isDragging } = useDraggable({ id, data: { kind: 'layers-node', nodeId: id } });
    const { setNodeRef: droppableRef } = useDroppable({ id, data: { kind: 'layers-node', nodeId: id, position: 'inside' } });

    if (!node) return null;

    const isRoot = id === state.project.rootId || id === state.project.fragments.find(f => f.id === state.ui.editingFragmentId)?.rootId;
    const selected = state.ui.selectedId === id;
    const name = getDisplayName(node);

    const onSelect = useCallback(() => state.select(id), [state, id]);
    const onToggleVisible = useCallback(() => state.toggleNodeVisibility(id), [state, id]);
    const onToggleLock = useCallback(() => state.toggleNodeLock(id), [state, id]);
    const onRemove = useCallback(() => {
        if (isRoot) return;
        state.removeNodeCascade(id);
    }, [state, id, isRoot]);

    return (
        <div
            ref={droppableRef}
            className={`flex items-center justify-between pl-1 pr-2 text-sm ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'} ${isDragging ? 'opacity-50' : ''}`}
            style={{ borderBottom: `1px solid ${LINE_COLOR}` }}
        >
            <div className="flex items-center gap-1 flex-1" onClick={onSelect}>
                <Indent depth={depth} />
                <div ref={draggableRef} {...listeners} {...attributes} className="cursor-grab p-1 touch-none">
                    <GripVertical size={14} className="text-gray-400" />
                </div>
                <div className="text-left flex-1 truncate">
                    <span className="font-medium">{name}</span>
                    <span className="ml-2 text-[11px] text-gray-500">({node.componentId})</span>
                </div>
            </div>
            {!isRoot && (
                <div className="flex items-center gap-1">
                    <button className="p-1 rounded border" onClick={onToggleLock} title={node.locked ? 'Unlock' : 'Lock'}>
                        {node.locked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                    <button className="p-1 rounded border" onClick={onToggleVisible} title={node.isVisible === false ? 'Show' : 'Hide'}>
                        {node.isVisible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button className="p-1 rounded border text-red-600" onClick={onRemove} title="Delete">
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
});
Row.displayName = 'Row';

const Tree: React.FC<{ id: NodeId; depth: number }> = ({ id, depth }) => {
    const state = useEditor();
    const node = state.project.nodes[id];
    if (!node) return null;
    const children = useMemo(() => ((node.children ?? []) as NodeId[]).filter((cid) => !!state.project.nodes[cid]), [node.children, state.project.nodes]);
    return (
        <div>
            <Row id={id} depth={depth} />
            {children.map((cid) => (<Tree key={cid} id={cid} depth={depth + 1} />))}
        </div>
    );
};

export function Layers() {
    const state = useEditor();
    const { mode, editingFragmentId } = state.ui;

    const rootId = mode === 'Component' && editingFragmentId
        ? state.project.fragments.find(f => f.id === editingFragmentId)?.rootId
        : state.project.rootId;

    if (!rootId || !state.project.nodes[rootId]) {
        return <div className="p-3 text-sm text-gray-500">루트 노드를 찾을 수 없습니다.</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <PanelTitle title="Layers" />
            <div className="h-full overflow-auto">
                <Tree id={rootId} depth={0} />
            </div>
        </div>
    );
}