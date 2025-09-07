'use client';

import React, { useState } from 'react';
import { getDefinition } from '../../core/registry';
import type { NodeId, Fragment, EditorState } from '../../core/types';

import { CommonSection } from './sections/CommonSection';
import { PropsAutoSection } from './sections/PropsAutoSection';
import { StylesSection } from './sections/StylesSection';
import { SchemaEditor } from './sections/SchemaEditor';
import { SaveAsComponentDialog } from './sections/SaveAsComponentDialog';

//import { useInspectorViewModel } from '../../controllers/hooks';
import { useRightPanelController } from '../../controllers/right/RightPanelController';

function PageInspector({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    // def는 필요 시 참조만, propsSchema 유무와 무관하게 PropsAutoSection을 항상 렌더
    const _def = getDefinition(defId);

    return (
        <>
            {/* Common: 헤더와 바로 붙도록 첫 섹션은 여백 제거 */}
            <CommonSection nodeId={nodeId} defId={defId} />

            {/* Props — ✅ 항상 렌더: 스키마 없어도 내부에서 As(Tag)/Tag Attrs UI 표시 */}
            <div className="mt-4">
                <PropsAutoSection nodeId={nodeId} defId={defId} />
            </div>

            {/* Styles — 베이스 시그니처는 props 없음 */}
            <div className="mt-4">
                <StylesSection />
            </div>

            {/* Schema — 베이스 시그니처는 { nodeId } */}
            <div className="mt-4">
                <SchemaEditor nodeId={nodeId} />
            </div>
        </>
    );
}

function ComponentInspector({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    return (
        <>
            <CommonSection nodeId={nodeId} defId={defId} />
            <div className="mt-4">
                <PropsAutoSection nodeId={nodeId} defId={defId} />
            </div>

            <div className="mt-4">
                <StylesSection />
            </div>

            <div className="mt-4">
                <SchemaEditor nodeId={nodeId} />
            </div>
        </>
    );
}

export function Inspector() {

    const { reader, writer } = useRightPanelController();
    const { mode, selectedId, editingFragmentId, expertMode } = reader.getUi();
    const { rootId, fragments, nodes } = reader.getProject();

    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

    // 대상 노드 선택: Page 모드면 현재 선택(or 루트), Component 모드면 편집 중 프래그먼트 루트
    const targetNodeId: NodeId | null =
        mode === 'Page'
            ? (selectedId ?? rootId)
            : editingFragmentId
                ? (fragments.find((f: Fragment) => f.id === editingFragmentId)?.rootId ?? null)
                : null;

    const node = targetNodeId ? nodes[targetNodeId] : null;

    //------------------------------------------------------------------------------------------------------------------
    // 컨트롤러 기반 VM (타깃 노드 단일화)
    const vm = reader.getInspectorTarget();

    // 컨트롤러가 계산한 nodeId/defId가 있으면 우선 사용
    const effectiveNodeId = (vm?.target?.nodeId ?? targetNodeId) as NodeId | null;
    const effectiveDefId =
        vm?.target?.componentId ??
        (effectiveNodeId ? (nodes[effectiveNodeId]?.componentId as string | undefined) : undefined) ??
        null as unknown as string | null;

    // node도 effectiveNodeId 기준으로 다시 잡아줍니다.
    const effectiveNode = effectiveNodeId ? nodes[effectiveNodeId] : null;

    //------------------------------------------------------------------------------------------------------------------


    // 상단 border 컬러(기존 규칙 유지): Page=blue, Component=purple
    const modeBorderStyle = mode === 'Page' ? 'border-t-blue-500' : 'border-t-purple-500';

    const handleToggleExpertMode = () => {
        const nextExpertMode = !expertMode;
        writer.setExpertMode(nextExpertMode);
        writer.setNotification(`고급 모드: ${nextExpertMode ? 'ON' : 'OFF'}`);
    };

    // SaveAsComponentDialog에 전달할 nodeId
    const dialogNodeId: NodeId | null = node?.id ?? null;

    return (
        <div className="flex h-full flex-col">
            {/* Header: sticky로 상단에 고정 */}
            <div
                className={[
                    'sticky top-0 z-10 bg-white',
                    'border-t-2 border-x border-b border-gray-200 px-2 py-2',
                    modeBorderStyle, // 개발 모드에 따른 보더 색
                ].join(' ')}
            >
                <div className="flex items-center justify-between">
                    <div className="text-[13px] font-semibold">Inspector</div>
                    <div className="ml-2 text-[11px] text-gray-500">
                        {mode === 'Page' ? '( Page Build Mode)' : '(️ Component Dev Mode)'}
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        {/* Save as Component: Page 모드 + 고급 모드일 때만 노출 (베이스 UX 유지) */}
                        {mode === 'Page' && expertMode && (
                            <button
                                className="rounded border border-gray-300 px-2 py-1 text-xs"
                                onClick={() => setIsSaveDialogOpen(true)}
                            >
                                Save as Component
                            </button>
                        )}

                        {/* 기본/고급 토글: Page 모드에서만 노출 (베이스 UX 유지) */}
                        {mode === 'Page' && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => {
                                        if (expertMode) handleToggleExpertMode();
                                    }}
                                    className={[
                                        'px-2 py-0.5 text-xs rounded-md',
                                        !expertMode ? 'bg-white shadow-sm font-semibold' : 'text-gray-500',
                                    ].join(' ')}
                                >
                                    기본
                                </button>
                                <button
                                    onClick={() => {
                                        if (!expertMode) handleToggleExpertMode();
                                    }}
                                    className={[
                                        'px-2 py-0.5 text-xs rounded-md',
                                        expertMode ? 'bg-white shadow-sm font-semibold' : 'text-gray-500',
                                    ].join(' ')}
                                >
                                    고급
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 스크롤이 필요한 Content 영역 */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {!node ? (
                    <div className="px-1 text-[12px] text-gray-500">
                        {mode === 'Page' ? 'Select a node to inspect.' : 'Select a component from the left panel.'}
                    </div>
                ) : (
                    <>
                        {mode === 'Page' ? (
                            <PageInspector
                                nodeId={effectiveNodeId as NodeId}       // 기존: nodeId={targetNodeId}
                                defId={(effectiveDefId as string) ?? ''} // 기존: defId={node.componentId 등}
                            />
                        ) : (
                            editingFragmentId && (
                                <ComponentInspector
                                    nodeId={effectiveNodeId as NodeId}
                                    defId={(effectiveDefId as string) ?? ''}
                                />
                            )
                        )}
                    </>
                )}
            </div>

            {/* ✅ SaveAsComponentDialog는 nodeId가 필요합니다 */}
            {isSaveDialogOpen && dialogNodeId && (
                <SaveAsComponentDialog nodeId={dialogNodeId} onClose={() => setIsSaveDialogOpen(false)} />
            )}
        </div>
    );
}