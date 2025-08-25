'use client';
/**
 * Inspector — 통합 패널
 * - CommonSection: 공통 메타(id, name, slot, tag, tag attributes)
 * - PropsAutoSection: 컴포넌트 스키마 기반 props UI (+ 조건식 프리셋/WhenBuilder)
 * - StylesSection: 스타일 편집기 (TagPolicy/Template 필터 적용)
 *
 * Toolbar:
 * - Schema Editor 토글: 하단 우측 패널에 SchemaEditor ON/OFF
 * - Expert Mode 토글: 템플릿 필터 무시(단, TagPolicy는 항상 적용)
 *
 * 구분선:
 * - Props / Styles 헤더는 "텍스트 + 가로선" 형태 (박스 제거)
 */

import React from 'react';
import { useEditor } from '../useEditor';
import { getDefinition } from '../../core/registry';
import type { BottomRightPanelKind, EditorState, NodeId } from '../../core/types';
import { CommonSection } from './sections/CommonSection';
import { PropsAutoSection } from './sections/PropsAutoSection';
import { StylesSection } from './sections/StylesSection';

/** 인라인 구분선: "label --------------" */
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
        return <div className="p-3 text-sm text-gray-500">노드를 선택하세요</div>;
    }

    const def = getDefinition(node.componentId);
    const expert = Boolean(state.ui.expertMode);

    // Schema Editor 열림 여부 (하단 우측 패널)
    const schemaOpen =
        Boolean(state.ui.bottomRight?.open) &&
        state.ui.bottomRight?.kind === 'SchemaEditor';

    // Schema Editor 토글
    const toggleSchemaPanel = () => {
        state.update((s: EditorState) => {
            const cur = s.ui.bottomRight ?? { open: false, kind: 'None' as BottomRightPanelKind, widthPct: 36 };
            if (cur.open && cur.kind === 'SchemaEditor') {
                // 이미 SchemaEditor가 열려 있으면 닫기
                s.ui = { ...s.ui, bottomRight: { ...cur, open: false } };
            } else {
                // 그렇지 않으면 SchemaEditor로 열기
                s.ui = { ...s.ui, bottomRight: { ...cur, open: true, kind: 'SchemaEditor' } };
            }
        });
    };

    // Expert 모드 토글
    const toggleExpert = () => {
        state.update((s: EditorState) => {
            s.ui = { ...s.ui, expertMode: !s.ui.expertMode };
        });
    };

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="px-2 py-2 border-b bg-white flex items-center gap-2">
                <div className="font-semibold text-sm">Inspector</div>

                <div className="ml-auto flex items-center gap-2">
                    {/* Schema Editor 토글 버튼 — ON/OFF 표시 */}
                    <button
                        type="button"
                        className={`text-[12px] px-2 py-1 border rounded ${schemaOpen ? 'bg-gray-900 text-white' : ''}`}
                        onClick={toggleSchemaPanel}
                        title="하단 우측에 스키마 에디터 열기/닫기"
                        aria-label="Toggle Schema Editor"
                        aria-pressed={schemaOpen}
                    >
                        Schema {schemaOpen ? 'ON' : 'OFF'}
                    </button>

                    {/* Expert 모드 토글 */}
                    <button
                        type="button"
                        className={`text-[12px] px-2 py-1 border rounded ${expert ? 'bg-gray-900 text-white' : ''}`}
                        onClick={toggleExpert}
                        title="Expert 모드 토글 (템플릿 필터 무시)"
                        aria-pressed={expert}
                        aria-label="Toggle Expert Mode"
                    >
                        Expert {expert ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto px-2 pb-4">
                {/* 1) 공통 메타 */}
                <CommonSection />

                {/* 2) Props (구분선만, 박스 제거) */}
                <div className="mt-4">
                    <InlineDivider label="props" />
                    {def?.propsSchema?.length ? (
                        <div className="mt-2">
                            <PropsAutoSection nodeId={id as NodeId} defId={node.componentId} />
                        </div>
                    ) : (
                        <div className="mt-2 text-[12px] text-gray-500 px-1">
                            이 컴포넌트는 편집할 props가 없습니다.
                        </div>
                    )}
                </div>

                {/* 3) Styles (구분선만, 박스 제거) */}
                <div className="mt-4">
                    <InlineDivider label="styles" />
                    <div className="mt-2">
                        <StylesSection />
                    </div>
                </div>
            </div>
        </div>
    );
}