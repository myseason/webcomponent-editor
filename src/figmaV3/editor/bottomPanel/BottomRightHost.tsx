'use client';
/**
 * BottomRightHost
 * - BottomDock의 우측 고급 패널 호스트
 * - 현재는 SchemaEditor만 연결
 *
 * 참고:
 * - close 동작은 editorStore의 별도 액션 없이 state.update(...)로 처리합니다.
 * - 훅은 최상위에서만 호출, any 금지
 * - 얕은 복사: s.ui = { ...s.ui, bottomRight: { ...cur, ...patch } }
 */

import React from 'react';
import { useEditor } from '../useEditor';
import { SchemaEditor } from '../rightPanel/sections/SchemaEditor';
import type { BottomRightPanelKind, NodeId } from '../../core/types';

export default function BottomRightHost() {
    // 최상위 훅
    const state = useEditor();

    // 우측 패널 상태와 선택 노드
    const ui = state.ui.bottomRight;
    const nodeId: NodeId = state.ui.selectedId ?? state.project.rootId;

    // 우측 패널이 닫혀 있으면 렌더하지 않음
    if (!ui || !ui.open || ui.kind === 'None') return null;

    // 패널 타이틀
    const title =
        ui.kind === 'SchemaEditor' ? 'Schema Editor (Project Override)'
            : ui.kind === 'PropVisibility' ? 'Prop Visibility'
                : ui.kind === 'Logs' ? 'Logs'
                    : '';

    // 닫기 핸들러: editorStore 헬퍼 없이 update로 처리
    const onClose = () => {
        state.update((s) => {
            const cur = s.ui.bottomRight ?? {
                open: true,
                kind: 'SchemaEditor' as BottomRightPanelKind,
                widthPct: 36,
            };
            s.ui = { ...s.ui, bottomRight: { ...cur, open: false, kind: 'None' } };
        });
    };

    return (
        <div className="h-full flex flex-col border-l bg-white">
            {/* 헤더 */}
            <div className="h-8 flex items-center justify-between px-2 border-b text-xs">
                <div className="font-semibold text-gray-700">{title}</div>
                <button className="border rounded px-2 py-0.5" onClick={onClose}>
                    ✕
                </button>
            </div>

            {/* 콘텐츠 */}
            <div className="flex-1 overflow-auto p-2">
                {ui.kind === 'SchemaEditor' && <SchemaEditor nodeId={nodeId} />}
                {/* 확장 여지: 다른 kind 분기 렌더 */}
            </div>
        </div>
    );
}