'use client';
/**
 * Layers: 프로젝트 트리를 간단한 리스트로 보여주고 선택/삭제를 지원합니다.
 * - 루트 노드는 삭제 금지(가드)
 * - 상태 접근은 editorStore의 상태+액션을 사용
 */
import React from 'react';
import type { NodeId } from '../../core/types';
import { editorStore } from '../../store/editStore';
import { useEditor } from '../useEditor';

function NodeRow({ id, depth }: { id: NodeId; depth: number }) {
    const state = editorStore.getState(); // 상태+액션
    const node = state.project.nodes[id];
    const isRoot = id === state.project.rootId;
    const selected = state.ui.selectedId === id;

    const onSelect = () => editorStore.getState().select(id);

    const onRemove = () => {
        /*
        if (isRoot)
            return alert('루트 노드는 삭제할 수 없습니다.');
        const parentId = editorStore.getState().getParentOf(id);
        if (!parentId) return;
        editorStore.getState().update((s) => {
            const parent = s.project.nodes[parentId];
            parent.children = (parent.children ?? []).filter((cid: NodeId) => cid !== id);
        });
        */
        if (isRoot)
            return alert('루트 노드는 삭제할 수 없습니다.');
        editorStore.getState().removeNodeCascade(id);
    };

    return (
        <div
            className={`flex items-center gap-2 px-2 py-1 ${selected ? 'bg-blue-50' : ''}`}
            style={{ paddingLeft: depth * 12 }}
        >
            <button className="text-xs text-gray-700" onClick={onSelect} title={id}>
                {node.componentId}
            </button>
            {!isRoot && (
                <button className="ml-auto text-xs text-red-500" onClick={onRemove} title="삭제">
                    ⌫
                </button>
            )}
        </div>
    );
}

function Tree({ id, depth }: { id: NodeId; depth: number }) {
    const node = editorStore.getState().project.nodes[id];
    return (
        <div>
            <NodeRow id={id} depth={depth} />
            {node.children?.map((cid: NodeId) => (
                <Tree key={cid} id={cid} depth={depth + 1} />
            ))}
        </div>
    );
}

export function Layers() {
    const state = useEditor(); // 최상위 훅
    return (
        <div className="p-3">
            <div className="text-xs font-semibold text-gray-500 mb-2">Layers</div>
            <Tree id={state.project.rootId} depth={0} />
        </div>
    );
}