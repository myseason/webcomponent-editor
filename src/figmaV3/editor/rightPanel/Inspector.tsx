'use client';

import React, { useState } from 'react';
import { getDefinition } from '../../core/registry';
import type { NodeId, Fragment } from '../../core/types';

// 기존 섹션들 (UI/UX 유지)
import { CommonSection } from './sections/CommonSection';
import { PropsAutoSection } from './sections/PropsAutoSection';
import { StylesSection } from './sections/StylesSection';
import { SchemaEditor } from './sections/SchemaEditor';
import { SaveAsComponentDialog } from './sections/SaveAsComponentDialog';

// ✅ 새 컨트롤러(한 채널)만 의존 — 더 이상 useEditor() 직접 사용하지 않음
import { useInspectorController } from '../../controllers/InspectorController';

function PageInspector({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    // def는 필요 시 참조만, 스키마 유무와 상관없이 PropsAutoSection은 항상 렌더
    const _def = getDefinition(defId);
    return (
        <>
            {/* Common: 헤더와 바로 붙도록 첫 섹션은 여백 제거 */}
            <div className="-mt-2">
                <CommonSection nodeId={nodeId} defId={defId} />
            </div>

            {/* Props — 항상 렌더 */}
            <PropsAutoSection nodeId={nodeId} defId={defId} />

            {/* Styles */}
            <StylesSection />

            {/* Schema */}
            <SchemaEditor nodeId={nodeId} />
        </>
    );
}

function ComponentInspector({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    return (
        <>
            <div className="-mt-2">
                <CommonSection nodeId={nodeId} defId={defId} />
            </div>
            <PropsAutoSection nodeId={nodeId} defId={defId} />
            <StylesSection />
            <SchemaEditor nodeId={nodeId} />
        </>
    );
}

export function Inspector() {
    const ctl = useInspectorController();
    const { mode, expertMode, target } = ctl;

    // 다이얼로그 상태
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

    // 대상 노드 선택: (컨트롤러가 계산해 줌)
    const nodeId: NodeId | null = target?.nodeId ?? null;
    const node = target?.node ?? null;
    const defId: string | null = target?.defId ?? null;
    const def = defId ? getDefinition(defId) : undefined;

    // 상단 border 컬러(기존 규칙 유지): Page=blue, Component=purple
    const modeBorderStyle = mode === 'Page' ? 'border-t-blue-500' : 'border-t-purple-500';
    const title = def?.title ?? defId ?? 'Unknown Component';

    // SaveAsComponentDialog에 전달할 nodeId
    const dialogNodeId: NodeId | null = node?.id ?? null;

    return (
        <aside className="flex flex-col h-full">
            {/* Header: sticky로 상단에 고정 */}
            <div className={`sticky top-0 z-10 bg-white border-b border-t-4 ${modeBorderStyle}`}>
                <div className="px-3 pt-3 pb-2">
                    <div className="text-sm font-semibold leading-6">{title}</div>
                    <div className="text-xs text-muted-foreground">
                        node: {nodeId ?? '(none)'}{' '}
                        <span className="ml-2">
              {mode === 'Page' ? '( Page Build Mode)' : '(️ Component Dev Mode)'}
            </span>
                    </div>

                    {/* 상단 우측: Page 모드에서만 ‘기본/고급’ 토글 + Save as Component */}
                    <div className="mt-2 flex items-center gap-2">
                        {mode === 'Page' && (
                            <>
                                <button
                                    onClick={() => ctl.setExpertMode(false)}
                                    className={[
                                        'px-2 py-0.5 text-xs rounded-md',
                                        !expertMode ? 'bg-white shadow-sm font-semibold' : 'text-gray-500',
                                    ].join(' ')}
                                >
                                    기본
                                </button>
                                <button
                                    onClick={() => ctl.setExpertMode(true)}
                                    className={[
                                        'px-2 py-0.5 text-xs rounded-md',
                                        expertMode ? 'bg-white shadow-sm font-semibold' : 'text-gray-500',
                                    ].join(' ')}
                                >
                                    고급
                                </button>
                                {/* Save as Component: Page 모드 + 고급 모드일 때만 노출 (베이스 UX 유지) */}
                                {expertMode && (
                                    <button
                                        onClick={() => setIsSaveDialogOpen(true)}
                                        className="ml-auto inline-flex items-center px-2 py-1 text-xs rounded-md bg-indigo-600 text-white"
                                    >
                                        Save as Component
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* 스크롤이 필요한 Content 영역 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-6">
                {!node ? (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        {mode === 'Page'
                            ? 'Select a node to inspect.'
                            : 'Select a component from the left panel.'}
                    </div>
                ) : mode === 'Page' ? (
                    <PageInspector nodeId={node.id} defId={defId!} />
                ) : (
                    <ComponentInspector nodeId={node.id} defId={defId!} />
                )}
            </div>

            {/* ✅ SaveAsComponentDialog는 nodeId가 필요합니다 */}
            {isSaveDialogOpen && dialogNodeId && (
                <SaveAsComponentDialog nodeId={dialogNodeId} onClose={() => setIsSaveDialogOpen(false)} />
            )}
        </aside>
    );
}

export default Inspector;