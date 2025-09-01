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
 * 페이지 빌드 모드에서 사용되는 인스펙터 (For Builder)
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
 * 컴포넌트 개발 모드에서 사용되는 정책 편집기 (For Creator)
 */
function ComponentPolicyEditor({ fragmentId }: { fragmentId: string }) {
    const state = useEditor();
    const fragment = state.project.fragments.find(f => f.id === fragmentId);
    if (!fragment) return <div className="p-3 text-sm text-gray-500">Cannot find component definition.</div>;

    const rootNode = state.project.nodes[fragment.rootId];
    if (!rootNode) return null;

    const def = getDefinition(rootNode.componentId);

    return (
        <div>
            <div className="p-3">
                <h3 className="text-sm font-semibold">Component Policy Editor</h3>
                <p className="text-xs text-gray-500">
                    Defining policies for: <strong>{def?.title ?? rootNode.componentId}</strong>
                </p>
            </div>

            {/* ✨ [수정] 컴포넌트 정책 편집을 위해 모든 섹션을 렌더링합니다. */}
            <CommonSection nodeId={rootNode.id} defId={rootNode.componentId} />
            <div className="mt-4">
                <InlineDivider label="Props & Permissions" />
                <div className="mt-2">
                    <PropsAutoSection nodeId={rootNode.id} defId={rootNode.componentId} />
                </div>
            </div>
            <div className="mt-4">
                <InlineDivider label="Styles & Permissions" />
                <div className="mt-2">
                    <StylesSection />
                </div>
            </div>
            <div className="mt-4">
                <InlineDivider label="Schema Editor (Add Custom Props)" className="px-3" />
                <div className="p-2">
                    <SchemaEditor nodeId={rootNode.id} />
                </div>
            </div>
        </div>
    );
}


export function Inspector() {
    const state = useEditor();
    const { ui, project, update, setNotification } = state;
    const { mode, selectedId, editingFragmentId, expertMode } = ui;
    const { rootId, fragments, nodes } = project;

    const targetNodeId = mode === 'Page'
        ? selectedId ?? rootId
        : editingFragmentId ? fragments.find(f => f.id === editingFragmentId)?.rootId : null;

    const node = targetNodeId ? nodes[targetNodeId] : null;

    const modeBorderStyle = mode === 'Page' ? 'border-t-blue-500' : 'border-t-purple-500';
    const modeTextStyle = mode === 'Page' ? 'text-blue-500' : 'text-purple-500';

    const handleToggleExpertMode = () => {
        const nextExpertMode = !expertMode;
        update(s => { s.ui.expertMode = nextExpertMode; });
        setNotification(`고급 모드: ${nextExpertMode ? 'ON' : 'OFF'}`);
    };

    if (!node) {
        const message = mode === 'Page'
            ? "Select a node to inspect."
            : "Select a component from the left panel to define its policies.";
        return (
            <div className={`h-full border-t-4 ${modeBorderStyle}`}>
                <div className="px-2 py-2 border-b bg-white flex items-center gap-2 shrink-0">
                    <div className="font-semibold text-sm">Inspector</div>
                    <div className={`text-xs font-bold ${modeTextStyle}`}>
                        {mode === 'Page' ? '( 🚀 Page Build Mode )' : '( 🛠️ Component Dev Mode )'}
                    </div>
                </div>
                <div className="p-3 text-sm text-gray-500">{message}</div>
            </div>
        );
    }

    return (
        <div className={`h-full flex flex-col border-t-4 ${modeBorderStyle}`}>
            <div className="px-2 py-2 border-b bg-white flex items-center gap-2 shrink-0">
                <div className="font-semibold text-sm">Inspector</div>
                <div className="text-xs font-medium text-gray-500">
                    {mode === 'Page' ? '(🚀 Page Build Mode)' : '(🛠️ Component Dev Mode)'}
                </div>
                {mode === 'Page' && (
                    <div className="ml-auto flex items-center gap-1 p-0.5 bg-gray-100 rounded-md">
                        <button
                            onClick={() => expertMode && handleToggleExpertMode()}
                            className={`px-2 py-0.5 text-xs rounded-md ${!expertMode ? 'bg-white shadow-sm font-semibold' : 'text-gray-500'}`}
                        >
                            기본
                        </button>
                        <button
                            onClick={() => !expertMode && handleToggleExpertMode()}
                            className={`px-2 py-0.5 text-xs rounded-md ${expertMode ? 'bg-white shadow-sm font-semibold' : 'text-gray-500'}`}
                        >
                            고급
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-auto px-2 pb-4">
                {mode === 'Page' && (
                    <PageInspector nodeId={node.id} defId={node.componentId} />
                )}
                {mode === 'Component' && editingFragmentId && (
                    <ComponentPolicyEditor fragmentId={editingFragmentId} />
                )}
            </div>
        </div>
    );
}