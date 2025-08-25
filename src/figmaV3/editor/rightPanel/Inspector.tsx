'use client';
/**
 * Inspector
 * - 선택된 노드의 기본 속성/스타일 편집에 집중
 * - "스키마 편집(고급)" 버튼 클릭 시 하단 우측 패널을 열어 SchemaEditor 표시
 *
 * 규칙
 * - 훅은 최상위에서 호출
 * - any 금지
 * - 얕은 복사 update 사용
 */

import React from 'react';

import { useEditor } from '../useEditor';
import { getDefinition } from '../../core/registry';
import { PropsAutoSection } from './sections/PropsAutoSection';
import type { NodeId, BottomRightPanelKind } from '../../core/types';

export function Inspector() {
    // 훅(최상위)
    const state = useEditor();

    const id: NodeId | null = state.ui.selectedId;
    if (!id) {
        return <div className="p-3 text-xs text-gray-500">노드를 선택하세요.</div>;
    }
    const node = state.project.nodes[id];
    const def = getDefinition(node.componentId);

    // 우측 고급 패널 열기
    const openBottomRight = (kind: BottomRightPanelKind) => {
        state.update((s) => {
            const cur = s.ui.bottomRight ?? { open: false, kind: 'None' as BottomRightPanelKind, widthPct: 36 };
            s.ui = { ...s.ui, bottomRight: { ...cur, open: true, kind } };
        });
    };

    return (
        <div className="p-3 space-y-4">
            {/* 헤더: 컴포넌트/노드 정보 */}
            <div className="space-y-1">
                <div className="text-xs font-semibold text-gray-700">
                    Component: <span className="font-mono">{node.componentId}</span>
                    {def?.title ? <span className="text-gray-500"> ({def.title})</span> : null}
                </div>
                <div className="text-[11px] text-gray-500">
                    Node ID: <span className="font-mono">{id}</span>
                </div>

                {/* 고급 버튼: SchemaEditor 열기 */}
                <div className="mt-2 flex gap-2">
                    <button
                        className="text-xs border rounded px-2 py-1"
                        onClick={() => openBottomRight('SchemaEditor')}
                        title="프로젝트 단위 속성 스키마를 편집합니다(고급)"
                    >
                        스키마 편집(고급)
                    </button>
                </div>
            </div>

            {/* Props 편집 섹션 (기본 속성/스타일) */}
            <div>
                {def?.propsSchema?.length ? (
                    <PropsAutoSection nodeId={id} defId={node.componentId} />
                ) : (
                    <div className="text-xs text-gray-400">이 컴포넌트는 편집할 props가 없습니다.</div>
                )}
            </div>

            {/* Styles 섹션(간단 버전) — width/height만 우선 제공; 레이아웃 가드 확장 예정 */}
            <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">Styles (element)</div>
                <div className="space-y-1">
                    <StyleNumber label="width" nodeId={id} />
                    <StyleNumber label="height" nodeId={id} />
                    {/* 예시: 정책상 비활성 처리되는 스타일 필드 */}
                    <GuardedStyleText label="position" nodeId={id} disabledReason="정책상 직접 편집 불가" />
                </div>
            </div>
        </div>
    );
}

/** width/height 숫자 입력 — 표준 시그니처(updateNodeStyles) 사용 */
function StyleNumber({ label, nodeId }: { label: 'width' | 'height'; nodeId: NodeId }) {
    const state = useEditor();
    const element = (state.project.nodes[nodeId].styles.element ?? {}) as Record<string, unknown>;
    const current = element[label] as number | undefined;

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value === '' ? undefined : Number(e.target.value);
        state.updateNodeStyles(nodeId, { element: { [label]: v } });
    };

    return (
        <label className="flex items-center gap-2 text-xs">
            <span className="w-24">{label}</span>
            <input
                className="flex-1 border rounded px-2 py-1"
                type="number"
                value={current ?? ''}
                onChange={onChange}
                placeholder="px"
            />
        </label>
    );
}

/** 정책상 비활성 처리되는 스타일 필드 예시(레이아웃 가드 배지) */
function GuardedStyleText({
                              label,
                              nodeId: _nodeId,
                              disabledReason,
                          }: {
    label: string;
    nodeId: NodeId;
    disabledReason: string;
}) {
    const disabled = true; // 정책 예시
    return (
        <label className="flex items-center gap-2 text-xs opacity-60">
            <span className="w-24">{label}</span>
            <input className="flex-1 border rounded px-2 py-1" type="text" disabled={disabled} value="" readOnly />
            <span className="text-[10px] px-1 rounded bg-gray-100 text-gray-600">guard</span>
            <span className="text-[10px] text-gray-500">{disabledReason}</span>
        </label>
    );
}

export default Inspector;