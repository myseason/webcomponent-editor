'use client';

import React from 'react';
import { useEditor } from '../useEditor';
import { getDefinition } from '../../core/registry';
import type { BottomRightPanelKind, EditorState, NodeId } from '../../core/types';
import { CommonSection } from './sections/CommonSection';
import { PropsAutoSection } from './sections/PropsAutoSection';
import { StylesSection } from './sections/StylesSection';

const InlineDivider: React.FC<{ label: string; className?: string }> = ({ label, className }) => (
    <div className={`flex items-center gap-2 select-none ${className ?? ''}`}>
        <span className="text-[12px] font-semibold text-gray-700">{label}</span>
        <div className="h-[1px] bg-gray-200 flex-1" />
    </div>
);

export function Inspector() {
    const state = useEditor();

    const id = state.ui.selectedId ?? state.project.rootId;
    const node = state.project.nodes[id];
    if (!node) {
        return <div className="p-3 text-sm text-gray-500">Select a node to inspect.</div>;
    }

    const def = getDefinition(node.componentId);

    // ✅ [수정] 새로운 UI 상태 경로 참조
    const { expertMode } = state.ui;
    const advancedPanel = state.ui.panels.bottom.advanced;
    const schemaOpen = Boolean(advancedPanel?.open && advancedPanel.kind === 'SchemaEditor');

    // Schema Editor 토글
    const toggleSchemaPanel = () => {
        state.update((s: EditorState) => {
            const cur = s.ui.panels.bottom.advanced;
            if (cur?.open && cur.kind === 'SchemaEditor') {
                s.ui.panels.bottom.advanced = { ...cur, open: false };
            } else {
                s.ui.panels.bottom.advanced = {
                    open: true,
                    kind: 'SchemaEditor',
                    widthPct: cur?.widthPct ?? 36,
                };
            }
        });
    };

    // Expert 모드 토글
    const toggleExpert = () => {
        state.update((s: EditorState) => { s.ui.expertMode = !s.ui.expertMode; });
    };

    return (
        <div className="h-full flex flex-col">
            <div className="px-2 py-2 border-b bg-white flex items-center gap-2 shrink-0">
                <div className="font-semibold text-sm">Inspector</div>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        className={`text-[12px] px-2 py-1 border rounded ${schemaOpen ? 'bg-blue-600 text-white' : ''}`}
                        onClick={toggleSchemaPanel}
                        title="Toggle Schema Editor in the bottom panel"
                    >
                        Schema {schemaOpen ? 'ON' : 'OFF'}
                    </button>
                    <button
                        type="button"
                        className={`text-[12px] px-2 py-1 border rounded ${expertMode ? 'bg-blue-600 text-white' : ''}`}
                        onClick={toggleExpert}
                        title="Toggle Expert Mode"
                    >
                        Expert {expertMode ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto px-2 pb-4">
                <CommonSection nodeId={id as NodeId} defId={node.componentId} />
                <div className="mt-4">
                    <InlineDivider label="Props" />
                    {def?.propsSchema?.length ? (
                        <div className="mt-2">
                            <PropsAutoSection nodeId={id as NodeId} defId={node.componentId} />
                        </div>
                    ) : (
                        <div className="mt-2 text-[12px] text-gray-500 px-1">No component props to edit.</div>
                    )}
                </div>
                <div className="mt-4">
                    <InlineDivider label="Styles" />
                    <div className="mt-2">
                        <StylesSection />
                    </div>
                </div>
            </div>
        </div>
    );
}