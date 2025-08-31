'use client';

import React from 'react';
import { useEditor } from '../useEditor';
import { getDefinition } from '../../core/registry';
import type { NodeId } from '../../core/types';
import { CommonSection } from './sections/CommonSection';
import { PropsAutoSection } from './sections/PropsAutoSection';
import { StylesSection } from './sections/StylesSection';
import { SchemaEditor } from './sections/SchemaEditor';

const InlineDivider: React.FC<{ label: string; className?: string }> = ({ label, className }) => (
    <div className={`flex items-center gap-2 select-none ${className ?? ''}`}>
        <span className="text-[12px] font-semibold text-gray-700">{label}</span>
        <div className="h-[1px] bg-gray-200 flex-1" />
    </div>
);

/**
 * 페이지 빌드 모드에서 사용되는 인스펙터
 */
function PageInspector({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    const def = getDefinition(defId);
    return (
        <>
            <CommonSection nodeId={nodeId} defId={defId} />
            <div className="mt-4">
                <InlineDivider label="Props" />
                {def?.propsSchema?.length ? (
                    <div className="mt-2">
                        <PropsAutoSection nodeId={nodeId} defId={defId} />
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
        </>
    );
}

/**
 * 컴포넌트 개발 모드에서 사용되는 인스펙터
 */
function ComponentInspector({ fragmentId }: { fragmentId: string }) {
    const state = useEditor();
    const fragment = state.project.fragments.find(f => f.id === fragmentId);
    if (!fragment) return null;

    const rootNode = state.project.nodes[fragment.rootId];
    if (!rootNode) return null;

    const def = getDefinition(rootNode.componentId);

    return (
        <div>
            <div className="p-3">
                <h3 className="text-sm font-semibold">Component Definition</h3>
                <p className="text-xs text-gray-500">Editing: <strong>{def?.title ?? rootNode.componentId}</strong></p>
            </div>
            <InlineDivider label="Component Properties (Schema)" className="px-3" />
            <div className="p-2">
                <SchemaEditor nodeId={rootNode.id} />
            </div>
        </div>
    );
}


export function Inspector() {
    const state = useEditor();
    const { mode, selectedId, editingFragmentId } = state.ui;
    const { rootId, fragments, nodes } = state.project;

    const targetNodeId = mode === 'Page'
        ? selectedId ?? rootId
        : editingFragmentId ? fragments.find(f => f.id === editingFragmentId)?.rootId : null;

    const node = targetNodeId ? nodes[targetNodeId] : null;

    // ✨ [추가] 모드에 따른 테두리 색상 클래스
    const modeBorderStyle = mode === 'Page' ? 'border-t-blue-500' : 'border-t-purple-500';

    if (!node) {
        return <div className="p-3 text-sm text-gray-500">Select a node to inspect.</div>;
    }

    return (
        // ✨ [수정] 최상위 div에 모드별 테두리 클래스 적용
        <div className={`h-full flex flex-col border-t-4 ${modeBorderStyle}`}>
            <div className="px-2 py-2 border-b bg-white flex items-center gap-2 shrink-0">
                <div className="font-semibold text-sm">Inspector</div>
                <div className="ml-auto text-xs font-medium text-purple-600">
                    Mode: {mode}
                </div>
            </div>

            <div className="flex-1 overflow-auto px-2 pb-4">
                {mode === 'Page' && (
                    <PageInspector nodeId={node.id} defId={node.componentId} />
                )}
                {mode === 'Component' && editingFragmentId && (
                    <ComponentInspector fragmentId={editingFragmentId} />
                )}
            </div>
        </div>
    );
}