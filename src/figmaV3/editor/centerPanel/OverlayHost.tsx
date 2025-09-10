'use client';

import React from 'react';
import type { Fragment, NodeId, Node } from '../../core/types';
import { getRenderer } from '../../core/registry';
import {useEditorControllerFactory} from "@/figmaV3/controllers/EditorControllerFactory";

// RenderNode는 이제 props로 reader와 writer를 전달받습니다.
function RenderNode({ id, reader, writer }: { id: NodeId, reader: any, writer: any }) {
    const node = reader.nodes.getNode(id);
    if(!node) return null;

    const renderer = getRenderer(node.componentId);
    const style = (node.styles?.element ?? {}) as React.CSSProperties;

    const onSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        writer.nodes.selectNode(id);
    };

    if (!renderer) return null;
    const renderedEl = renderer({ node, fire: () => {} });

    return (
        <div style={style} onClick={onSelect}>
            {renderedEl}
            {(node.children ?? []).map((cid: NodeId) => (
                <RenderNode key={cid} id={cid} reader={reader} writer={writer} />
            ))}
        </div>
    );
}

export function OverlayHost() {
    const { reader, writer } = useEditorControllerFactory();
    const overlays = reader.getUI().overlays;
    const frags = reader.getFragments();

    const closeTopFragment = () => writer.fragments.closeFragment();
    const closeSpecificFragment = (id: string) => writer.fragments.closeFragment(id);

    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && overlays.length > 0) {
                closeTopFragment();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [overlays.length]); // eslint-disable-line react-hooks/exhaustive-deps

    if (overlays.length === 0) return null;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            closeTopFragment();
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
                        className="fixed inset-0 bg-black/30 flex items-center justify-center pointer-events-auto"
                        style={{ zIndex: 1000 + i }}
                        onClick={handleBackdropClick}
                    >
                        <div className="relative bg-white rounded-xl shadow-xl p-4 min-w-[360px] max-w-[80vw] max-h-[80vh] overflow-auto">
                            <button
                                aria-label="Close overlay"
                                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 border rounded px-2 py-1 text-xs"
                                onClick={() => closeSpecificFragment(fragId)}
                            >
                                ✕
                            </button>
                            <RenderNode id={f.rootId} reader={reader} writer={writer} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}