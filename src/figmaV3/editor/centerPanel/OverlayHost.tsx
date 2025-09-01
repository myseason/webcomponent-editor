'use client';
/**
 * OverlayHost
 * - 열린 fragment 스택(ui.overlays)을 오버레이로 렌더링
 * - 닫기 UX 추가:
 *   (1) 우상단 ✕ 버튼 → 해당 fragment 닫기
 *   (2) 배경(backdrop) 클릭 → 최상단 fragment 닫기
 *   (3) ESC → 최상단 fragment 닫기
 *
 * 규칙:
 * - 훅은 최상위에서만 호출(useEditor, useEffect)
 * - any 금지
 * - SSR: 본 파일은 'use client' 이므로 window 접근은 useEffect 안에서만
 */
import React from 'react';
import { useEditor } from '../useEditor';
import type {Fragment, NodeId} from '../../core/types';
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
    // 훅은 최상위에서 호출
    const state = useEditor();
    const overlays = state.ui.overlays;
    const frags = state.project.fragments;

    // ESC로 최상단 닫기
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && overlays.length > 0) {
                editorStore.getState().closeFragment(); // top-of-stack
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [overlays.length]);

    if (overlays.length === 0) return null;

    // 배경 클릭 시 최상단 닫기 — 컨텐츠 영역 클릭은 닫히지 않도록 target 체크
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            editorStore.getState().closeFragment(); // top-of-stack
        }
    };

    return (
        <div className="pointer-events-none">
            {overlays.map((fragId: string, i: number) => {
                const f = frags.find((x: Fragment) => x.id === fragId);
                if (!f) return null;
                return (
                    <div
                        key={fragId}
                        className="fixed inset-0 bg-black/30 flex items-center justify-center"
                        style={{ zIndex: 1000 + i }}
                        onClick={handleBackdropClick}
                    >
                        <div className="pointer-events-auto relative bg-white rounded-xl shadow-xl p-4 min-w-[360px] max-w-[80vw] max-h-[80vh] overflow-auto">
                            {/* 닫기 버튼 */}
                            <button
                                aria-label="Close overlay"
                                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 border rounded px-2 py-1 text-xs"
                                onClick={() => editorStore.getState().closeFragment(fragId)}
                            >
                                ✕
                            </button>

                            {/* 프래그먼트 루트 렌더 */}
                            <RenderNode id={f.rootId} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}