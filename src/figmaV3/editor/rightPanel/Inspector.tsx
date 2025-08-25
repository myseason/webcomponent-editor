'use client';
/**
 * Inspector: 선택된 노드의 props/styles를 편집합니다.
 * - propsSchema 기반 자동 UI(PropsAutoSection)
 * - 레이아웃 가드 예시: 특정 스타일 필드는 정책상 비활성화 + guard 배지 표기
 * - 상태 접근: useEditor() → 상태+액션 일원화
 */
import React from 'react';
import { useEditor } from '../useEditor';
import { getDefinition } from '../../core/registry';
import { PropsAutoSection } from './sections/PropsAutoSection';
import type { NodeId } from '../../core/types';

export function Inspector() {
    const state = useEditor();
    const id = state.ui.selectedId;

    if (!id) {
        return <div className="p-3 text-sm text-gray-500">노드를 선택하세요</div>;
    }

    const node = state.project.nodes[id];
    const def = getDefinition(node.componentId);

    return (
        <div className="p-3 space-y-4">
            <div className="text-xs font-semibold text-gray-500">Inspector</div>

            {def?.propsSchema?.length ? (
                <PropsAutoSection nodeId={id} defId={def.id} />
            ) : (
                <div className="text-xs text-gray-500">이 컴포넌트는 편집할 props가 없습니다.</div>
            )}

            <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500">Styles (element)</div>
                {/* 간단 스타일 편집기: width/height만 우선 구현 */}
                <StyleNumber label="width" nodeId={id} />
                <StyleNumber label="height" nodeId={id} />
                {/* 레이아웃 가드 예시: 정책상 position은 비활성 처리 */}
                <GuardedStyleText
                    label="position"
                    nodeId={id}
                    disabledReason="현재 정책에서 position은 제한됩니다."
                />
            </div>
        </div>
    );
}

/** width/height 숫자 입력 — 표준 시그니처(updateNodeStyles) 사용 */
function StyleNumber({ label, nodeId }: { label: 'width' | 'height'; nodeId: NodeId }) {
    const state = useEditor();
    const current =
        ((state.project.nodes[nodeId].styles.element ?? {}) as Record<string, unknown>)[
            label
            ] as number | undefined;

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value === '' ? undefined : Number(e.target.value);
        state.updateNodeStyles(nodeId, { element: { [label]: v } });
    };

    return (
        <label className="flex items-center gap-2 text-xs">
            <span className="w-14">{label}</span>
            <input
                className="flex-1 border rounded px-2 py-1"
                type="number"
                value={current ?? ''}
                onChange={onChange}
            />
        </label>
    );
}

/** 정책상 비활성 처리되는 스타일 필드 예시 */
function GuardedStyleText({label,nodeId: _nodeId, disabledReason,}: {
    label: string;
    nodeId: NodeId;
    disabledReason: string;
}) {
    const disabled = true; // 정책 예시
    return (
        <label className="flex items-center gap-2 text-xs opacity-60">
            <span className="w-14">{label}</span>
            <input
                className="flex-1 border rounded px-2 py-1"
                type="text"
                disabled={disabled}
                placeholder={disabledReason}
            />
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded">guard</span>
        </label>
    );
}