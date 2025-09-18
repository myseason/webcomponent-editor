'use client';

import React from 'react';
import { getDefinition } from '../../core/registry';
import type { Fragment, NodeId } from '../../core/types';

import { RightDomain, useRightControllerFactory } from '../../controllers/right/RightControllerFactory';

import StyleInspector from './StyleInspector';
import CommonInspector from './CommonInspector';
// import { SaveAsComponentDialog } from './sections/SaveAsComponentDialog'; // ← 사용 중지

function PageInspector({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    // def는 필요 시 참조만, propsSchema 유무와 무관하게 PropsAutoSection을 항상 렌더
    const _def = getDefinition(defId);
    return (
        <>
            <CommonInspector nodeId={nodeId} defId={defId} width={320} />
            {/* 페이지 모드에서는 componentId 없음 → StyleInspector에서 lock 버튼 비노출 */}
            <StyleInspector nodeId={nodeId} componentId={undefined} width={320} />
        </>
    );
}

function ComponentInspector({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    return (
        <>
            <CommonInspector nodeId={nodeId} defId={defId} width={320} />
            {/* 컴포넌트 모드에서는 componentId 전달 → StyleInspector에서 lock 버튼 항상 노출 */}
            <StyleInspector nodeId={nodeId} componentId={defId} width={320} />
        </>
    );
}

export function Inspector() {
    const { reader, writer } = useRightControllerFactory(RightDomain.Inspector);

    // UI & Project 스냅샷
    const ui = reader.getUI();
    const { rootId, fragments, nodes } = reader.getProject();

    const mode = ui?.mode === 'Component' ? 'Component' : 'Page';
    const selectedId = ui.selectedId as NodeId | null | undefined;
    const editingFragmentId = ui.editingFragmentId as string | null | undefined;
    const expertMode = !!ui.expertMode;

    const isPage = mode === 'Page';
    const selId = ui?.selectedId;
    const selNode = selId ? reader.getProject().nodes[selId] : null;
    const canSaveAs = isPage && selNode?.componentId === 'box';

    const [isSaveDialogOpen, setIsSaveDialogOpen] = React.useState(false); // ← 사용 중지

    // 대상 노드 선택: Page 모드면 현재 선택(or 루트), Component 모드면 편집 중 프래그먼트 루트
    const targetNodeId: NodeId | null =
        mode === 'Page'
            ? (selectedId ?? rootId)
            : editingFragmentId
                ? (fragments.find((f: Fragment) => f.id === editingFragmentId)?.rootId ?? null)
                : null;

    // 컨트롤러 기반 VM (있으면 우선 사용)
    const vm = reader.getInspectorVM?.();
    const effectiveNodeId = (vm?.target?.nodeId ?? targetNodeId) as NodeId | null;
    const effectiveDefId =
        (vm?.target?.componentId as string | undefined) ??
        (effectiveNodeId ? (nodes[effectiveNodeId!]?.componentId as string | undefined) : undefined) ??
        ('' as string);

    const node = effectiveNodeId ? nodes[effectiveNodeId] : null;

    // 상단 보더 컬러: Page=blue, Component=purple
    const modeBorderStyle = mode === 'Page' ? 'border-t-blue-500' : 'border-t-purple-500';

    // 기본/고급 스위치 (페이지 모드에서만)
    const onToggleExpert = (next: boolean) => {
        if (mode !== 'Page') return;
        writer.setExpertMode(next);
        writer.setNotification?.(`고급 모드: ${next ? 'ON' : 'OFF'}`);
    };

    // const dialogNodeId: NodeId | null = node?.id ?? null; // ← SaveAs 비활성으로 사용 중지

    return (
        <div className="flex h-full flex-col">
            {/* Header: sticky로 상단 고정 */}
            <div
                className={[
                    'sticky top-0 z-10 bg-white',
                    'border-t-2 border-x border-b border-gray-200 px-2 py-2',
                    modeBorderStyle,
                ].join(' ')}
            >
                <div className="flex items-center justify-between">
                    <div className="text-[13px] font-semibold">Inspector</div>
                    <div className="ml-2 text-[11px] text-gray-500">
                        {mode === 'Page' ? '( Page Build Mode)' : '( Component Dev Mode )'}
                    </div>

                    <div className="ml-auto flex items-center gap-3">
                        {/* 기본/고급 스위치: 페이지 모드에서만 노출 */}
                        {mode === 'Page' && (
                            <label className="flex items-center gap-2 text-xs text-gray-700 select-none">
                                <span>기본</span>
                                {/* 토글 스위치 (체크 = 고급) */}
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={expertMode}
                                    onClick={() => onToggleExpert(!expertMode)}
                                    className={[
                                        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                                        expertMode ? 'bg-blue-600' : 'bg-gray-300',
                                    ].join(' ')}
                                    title={expertMode ? '고급 모드: ON (ComponentPolicy 무시)' : '고급 모드: OFF (ComponentPolicy 적용)'}
                                >
                  <span
                      className={[
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          expertMode ? 'translate-x-5' : 'translate-x-1',
                      ].join(' ')}
                  />
                                </button>
                                <span>고급</span>
                            </label>
                        )}

                        {/* Save as Component — 요청에 따라 주석 처리 */}
                        {/*
                        {mode === 'Page' && expertMode && dialogNodeId && (
                          <button
                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                            onClick={() => setIsSaveDialogOpen(true)}
                          >
                            Save as Component
                          </button>
                        )}
                        */}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {!node ? (
                    <div className="px-1 text-[12px] text-gray-500">
                        {mode === 'Page' ? 'Select a node to inspect.' : 'Select a component from the left panel.'}
                    </div>
                ) : mode === 'Page' ? (
                    <PageInspector nodeId={effectiveNodeId as NodeId} defId={effectiveDefId} />
                ) : (
                    // 컴포넌트 모드
                    (reader.getUI().editingFragmentId as string | null | undefined) && (
                        <ComponentInspector nodeId={effectiveNodeId as NodeId} defId={effectiveDefId} />
                    )
                )}
            </div>

            {/* Save-As dialog — 요청에 따라 주석 처리 */}
            {/*
      {isSaveDialogOpen && dialogNodeId && (
        <SaveAsComponentDialog nodeId={dialogNodeId} onClose={() => setIsSaveDialogOpen(false)} />
      )}
      */}
        </div>
    );
}