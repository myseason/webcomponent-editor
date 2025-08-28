'use client';

import React from 'react';
import { useEditor } from '../useEditor';
import { SchemaEditor } from '../rightPanel/sections/SchemaEditor';
import type { BottomRightPanelKind, NodeId } from '../../core/types';

export default function BottomRightHost() {
    const state = useEditor();

    // ✅ [수정] 새로운 UI 상태 경로 참조
    const advancedPanel = state.ui.panels.bottom.advanced;
    const nodeId: NodeId = state.ui.selectedId ?? state.project.rootId;

    if (!advancedPanel || !advancedPanel.open || advancedPanel.kind === 'None') {
        return null;
    }

    const title =
        advancedPanel.kind === 'SchemaEditor' ? 'Schema Editor (Project Override)'
            : advancedPanel.kind === 'PropVisibility' ? 'Prop Visibility'
                : advancedPanel.kind === 'Logs' ? 'Logs'
                    : '';

    const onClose = () => {
        state.update((s) => {
            if (s.ui.panels.bottom.advanced) {
                s.ui.panels.bottom.advanced.open = false;
            }
        });
    };

    return (
        <div className="h-full flex flex-col border-l bg-white">
            <div className="h-8 flex items-center justify-between px-2 border-b text-xs shrink-0">
                <div className="font-semibold text-gray-700">{title}</div>
                <button className="border rounded px-2 py-0.5" onClick={onClose}>
                    ✕
                </button>
            </div>

            <div className="flex-1 overflow-auto p-2">
                {advancedPanel.kind === 'SchemaEditor' && <SchemaEditor nodeId={nodeId} />}
            </div>
        </div>
    );
}