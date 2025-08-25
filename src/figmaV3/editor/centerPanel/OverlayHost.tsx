'use client';
/**
 * OverlayHost: 열린 fragment 스택을 오버레이로 렌더링합니다.
 * - 가장 위의 fragment가 상단에 오도록 z-index 순서대로 렌더
 * - fragment.rootId를 시작점으로 RenderNode 재귀 렌더
 */
import React from 'react';
import { useEditor } from '../useEditor';
import type { NodeId } from '../../core/types';
import { editorStore } from '../../store/editStore';
import { getRenderer } from '../../core/registry';

function RenderNode({ id }: { id: NodeId }) {
    const state = editorStore.getState();
    const node = state.project.nodes[id];
    const renderer = getRenderer(node.componentId);
    const style = (node.styles?.element ?? {}) as React.CSSProperties;

    const onSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        editorStore.getState().select(id);
    };

    if (!renderer) return null;

    return (
        <div style={style} onClick={onSelect}>
            {renderer({ node })}
            {(node.children ?? []).map((cid: NodeId) => (
                <RenderNode key={cid} id={cid} />
            ))}
        </div>
    );
}

export function OverlayHost() {
    const state = useEditor();
    const overlays = state.ui.overlays;
    const frags = state.project.fragments;

    if (overlays.length === 0) return null;

    return (
        <div className="pointer-events-none">
            {overlays.map((fragId: string, i: number) => {
                const f = frags.find((x) => x.id === fragId);
                if (!f) return null;
                return (
                    <div
                        key={fragId}
                        className="fixed inset-0 bg-black/30 flex items-center justify-center"
                        style={{ zIndex: 1000 + i }}
                    >
                        <div className="pointer-events-auto bg-white rounded-xl shadow-xl p-4 min-w-[360px] max-w-[80vw] max-h-[80vh] overflow-auto">
                            <RenderNode id={f.rootId} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}