'use client';
/**
 * Canvas: 노드 트리를 재귀 렌더하며, fire(evt)로 Actions → Flows를 실행합니다.
 */
import React from 'react';
import type { NodeId, SupportedEvent } from '../../core/types';
import { useEditor } from '../useEditor';
import { getRenderer } from '../../core/registry';
import { runActions } from '../../runtime/actions';
import { findEdges, applyEdge, checkWhen } from '../../runtime/flow';
import { editorStore } from '../../store/editStore';

function RenderNode({ id }: { id: NodeId }) {
    const state = editorStore.getState(); // 상태+액션
    const node = state.project.nodes[id];
    const selected = state.ui.selectedId === id;
    const renderer = getRenderer(node.componentId);

    const fire = (evt: SupportedEvent) => {
        // 1) 액션 실행
        const actions =
            (node.props as Record<string, unknown>).__actions as
                | Record<string, { steps: import('../../core/types').ActionStep[] }>
                | undefined;
        const steps = actions?.[evt]?.steps ?? [];
        void runActions(steps, {
            alert: (msg) => alert(msg),
            setData: (path, value) => editorStore.getState().setData(path, value),
            setProps: (nodeId, patch) => editorStore.getState().updateNodeProps(nodeId, patch),
            navigate: (toPageId) => editorStore.getState().selectPage(toPageId),
            openFragment: (_fragmentId) => {},
            closeFragment: (_fragmentId) => {},
            http: async (method, url, body, headers) => {
                const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
                try { return await res.json(); } catch { return await res.text(); }
            },
            emit: (_topic, _payload) => {},
        });

        // 2) 플로우 평가/적용
        const curr = editorStore.getState();
        const edges = findEdges(curr, node.id, evt);
        edges.forEach((edge) => {
            if (checkWhen(edge, editorStore.getState())) {
                applyEdge(edge, {
                    navigate: (toPageId) => editorStore.getState().selectPage(toPageId),
                    openFragment: (_fragmentId) => {},
                    closeFragment: (_fragmentId) => {},
                });
            }
        });
    };

    const onSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        editorStore.getState().select(id);
    };

    if (!renderer) {
        return (
            <div className="border border-dashed border-red-300 text-red-500 text-xs p-2" onClick={onSelect}>
                Unknown component: {node.componentId}
            </div>
        );
    }

    return (
        <div className={`relative ${selected ? 'outline outline-blue-400' : ''}`} onClick={onSelect}>
            {renderer({ node, fire })}
            {node.children?.map((cid: NodeId) => (
                <RenderNode key={cid} id={cid} />
            ))}
        </div>
    );
}

export function Canvas() {
    void useEditor(); // 최상위 훅: 상태 변화에 따른 리렌더 트리거
    const root = editorStore.getState().project.rootId;

    return (
        <div className="w-full h-full flex items-start justify-center bg-neutral-50">
            <div className="bg-white shadow-sm border w-[640px] min-h-[80vh] mt-10 p-4">
                <RenderNode id={root} />
            </div>
        </div>
    );
}