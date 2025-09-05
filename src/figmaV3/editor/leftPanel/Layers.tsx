'use client';
import React, { memo, useCallback, useMemo } from 'react';
import { useEditorLike as useEditor } from '../../controllers/adapters/useEditorLike';
import { useLayersController } from '../../controllers/LayersController';
import type {NodeId, Node, Fragment} from '../../core/types';
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

const getDisplayName = (node: Node): string => {
    const compId = node.componentId;
    const def = compId ? getDefinition(compId) : null;
    const base = (node.props?.name as string) || (def?.title ?? compId) || node.id;
    return base;
};

const Row: React.FC<{ id: NodeId; depth: number }> = memo(({ id, depth }) => {
    const state = useEditor();
    const layersCtl = useLayersController();
    const node = state.project.nodes[id];

    const { attributes, listeners, setNodeRef: draggableRef, isDragging } = useDraggable({ id, data: { kind: 'layers-node', nodeId: id } });
    const { setNodeRef: droppableRef } = useDroppable({ id, data: { kind: 'layers-node', nodeId: id, position: 'inside' } });

    if (!node) return null;

    const isRoot =
        id === state.project.rootId ||
        id === state.project.fragments.find((f: Fragment) => f.id === state.ui.editingFragmentId)?.rootId;

    const selected = state.ui.selectedId === id;
    const name = getDisplayName(node);

    // ✅ props.id는 unknown → 문자열일 때만 표시
    const humanId = typeof node.props?.id === 'string' ? node.props.id : undefined;

    // ✨ 쓰기 경로만 컨트롤러로 위임 (UI/마크업 불변)
    const onSelect = useCallback(() => layersCtl.select(id), [layersCtl, id]);
    const onToggleVisible = useCallback(() => layersCtl.toggleVisibility(id), [layersCtl, id]);
    const onToggleLock = useCallback(() => layersCtl.toggleLock(id), [layersCtl, id]);
    const onRemove = useCallback(() => {
        if (isRoot) return;
        layersCtl.removeCascade(id);
    }, [layersCtl, id, isRoot]);

    const children = useMemo(
        () => ((node.children ?? []) as NodeId[]).filter((cid) => !!state.project.nodes[cid]),
        [node.children, state.project.nodes],
    );

    return (
        <div
            ref={droppableRef}
            className={`flex items-center justify-between pl-1 py-0.5 ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'} ${isDragging ? 'opacity-50' : ''}`}
            style={{ borderBottom: `1px solid ${LINE_COLOR}` }}
        >
            <div className="flex items-center gap-1 flex-1" onClick={onSelect}>
                <Indent depth={depth} />
                <div ref={draggableRef} {...listeners} {...attributes} className="cursor-grab p-1 touch-none">
                    <GripVertical size={14} className="text-gray-400" />
                </div>
                <div className="text-left flex-1 truncate">
                    <span className="font-medium">{name}</span>
                    {humanId && <span className="ml-1 text-[10px] opacity-50">#{humanId}</span>}
                </div>
            </div>

            {!isDragging && (
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

function Tree({ id, depth }: { id: NodeId; depth: number }) {
    const state = useEditor();
    const node = state.project.nodes[id];

    const children = useMemo(
        () => ((node.children ?? []) as NodeId[]).filter((cid) => !!state.project.nodes[cid]),
        [node.children, state.project.nodes],
    );

    return (
        <div>
            <Row id={id} depth={depth} />
            {children.map((cid) => (
                <Tree key={cid} id={cid} depth={depth + 1} />
            ))}
        </div>
    );
}

export function Layers() {
    const state = useEditor();
    const { mode, editingFragmentId } = state.ui;

    const rootId =
        mode === 'Component' && editingFragmentId
            ? state.project.fragments.find((f: Fragment) => f.id === editingFragmentId)?.rootId
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