'use client';

import React, { useState } from 'react';
import { useEditor } from '../useEditor';
import { getDefinition } from '../../core/registry';
import type { NodeId, Fragment, EditorState } from '../../core/types';
import { CommonSection } from './sections/CommonSection';
import { PropsAutoSection } from './sections/PropsAutoSection';
import { StylesSection } from './sections/StylesSection';
import { SchemaEditor } from './sections/SchemaEditor';
import { SaveAsComponentDialog } from './sections/SaveAsComponentDialog';

const InlineDivider: React.FC<{ label: string; className?: string }> = ({ label, className }) => (
    <div className={`flex items-center gap-2 select-none ${className ?? ''}`}>
        <span className="text-[12px] font-semibold text-gray-700">{label}</span>
        <div className="h-[1px] bg-gray-200 flex-1" />
    </div>
);

function PageInspector({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    const def = getDefinition(defId);
    return (
        <>
            <CommonSection nodeId={nodeId} defId={defId} />
            <div className="mt-4">
                {/*<InlineDivider label="Props" />*/}
                {def?.propsSchema?.length ? (
                    <div className="mt-2">
                        <PropsAutoSection nodeId={nodeId} defId={defId} />
                    </div>
                ) : (
                    <div className="mt-2 text-[12px] text-gray-500 px-1">No component props to edit.</div>
                )}
            </div>
            <div className="mt-4">
                {/*<InlineDivider label="Styles" />*/}
                <div className="mt-2">
                    <StylesSection />
                </div>
            </div>
        </>
    );
}

function ComponentPolicyEditor({ fragmentId }: { fragmentId: string }) {
    const state = useEditor();
    const fragment = state.project.fragments.find((f: Fragment) => f.id === fragmentId);
    if (!fragment) return <div className="p-3 text-sm text-gray-500">Cannot find component definition.</div>;

    const rootNode = state.project.nodes[fragment.rootId];
    if (!rootNode) return null;

    const def = getDefinition(rootNode.componentId);

    return (
        <div>
            <div className="p-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold">Component Policy Editor</h3>
                        <p className="text-xs text-gray-500">
                            Defining policies for: <strong>{def?.title ?? rootNode.componentId}</strong>
                        </p>
                    </div>
                </div>
            </div>

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

    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

    const targetNodeId = mode === 'Page'
        ? selectedId ?? rootId
        : editingFragmentId ? fragments.find((f: Fragment) => f.id === editingFragmentId)?.rootId : null;

    const node = targetNodeId ? nodes[targetNodeId] : null;

    const modeBorderStyle = mode === 'Page' ? 'border-t-blue-500' : 'border-t-purple-500';

    const handleToggleExpertMode = () => {
        const nextExpertMode = !expertMode;
        update((s: EditorState) => { s.ui.expertMode = nextExpertMode; });
        setNotification(`고급 모드: ${nextExpertMode ? 'ON' : 'OFF'}`);
    };

    return (
        <div className={`h-full flex flex-col border-t-4 ${modeBorderStyle}`}>
            {/* Header: sticky로 상단에 고정 */}
            <div className="sticky top-0 px-2 py-2 border-b bg-white flex items-center gap-2 shrink-0 z-10">
                <div className="font-semibold text-sm">Inspector</div>
                <div className="text-xs font-medium text-gray-500">
                    {mode === 'Page' ? '(🚀 Page Build Mode)' : '(🛠️ Component Dev Mode)'}
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {mode === 'Page' && expertMode && (
                        <button
                            className="text-xs px-2 py-1 border rounded bg-green-100 text-green-700 hover:bg-green-200"
                            onClick={() => setIsSaveDialogOpen(true)}
                        >
                            Save as Component
                        </button>
                    )}
                    {mode === 'Page' && (
                        <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded-md">
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
            </div>

            {/* 스크롤이 필요한 Content 영역 */}
            <div className="flex-1 overflow-y-auto">
                {!node ? (
                    <div className="p-3 text-sm text-gray-500">
                        {mode === 'Page' ? "Select a node to inspect." : "Select a component from the left panel."}
                    </div>
                ) : (
                    <div className="px-2 pb-4">
                        {mode === 'Page' ? (
                            <PageInspector nodeId={node.id} defId={node.componentId} />
                        ) : (
                            editingFragmentId && <ComponentPolicyEditor fragmentId={editingFragmentId} />
                        )}
                    </div>
                )}
            </div>

            {isSaveDialogOpen && (
                <SaveAsComponentDialog
                    nodeId={selectedId!}
                    onClose={() => setIsSaveDialogOpen(false)}
                />
            )}
        </div>
    );
}