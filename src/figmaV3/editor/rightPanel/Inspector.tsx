'use client';
/**
 * Inspector
 * - Common(공통 메타) → Styles → Props
 * - 하단 우측 SchemaEditor는 BottomDock에서 관리(버튼만 유지)
 */
import React from 'react';
import { useEditor } from '../useEditor';
import type { NodeId } from '../../core/types';
import { PropsAutoSection } from './sections/PropsAutoSection';
import { CommonSection } from './sections/CommonSection';
import { StylesSection } from './sections/StylesSection';

export function Inspector() {
    const state = useEditor();
    const nodeId: NodeId = state.ui.selectedId ?? state.project.rootId;
    const node = state.project.nodes[nodeId];

    return (
        <div className="h-full flex flex-col">
            {/* 헤더 */}
            <div className="h-8 border-b px-2 flex items-center justify-between text-xs">
                <div className="font-semibold text-gray-600">Inspector</div>
                <div className="flex items-center gap-2">
                    <button
                        className="border rounded px-2 py-0.5"
                        onClick={() => {
                            state.update((s) => {
                                const cur = s.ui.bottomRight ?? { open: false, kind: 'None' as const, widthPct: 36 };
                                s.ui = { ...s.ui, bottomRight: { ...cur, open: true, kind: 'SchemaEditor' } };
                            });
                        }}
                        title="Open Schema Editor (Project Override)"
                    >
                        Edit schema
                    </button>
                </div>
            </div>

            {/* 본문 */}
            <div className="flex-1 overflow-auto">
                {/* Common */}
                <CommonSection />

                {/* Styles */}
                <StylesSection />

                {/* Props (스키마 자동) */}
                <div className="px-2 pt-2">
                    <PropsAutoSection nodeId={nodeId} defId={node.componentId} />
                </div>
            </div>
        </div>
    );
}