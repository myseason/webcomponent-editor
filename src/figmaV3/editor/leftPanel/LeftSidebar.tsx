'use client';
/**
 * LeftSidebar
 * - 좌측 2탭: Explorer / Composer
 * - 각 탭은 상/하 분할(리사이저 포함). 비율은 ui.leftSplitPct에 저장
 * - any 금지, 훅 최상위, 얕은 복사 update 규약
 */
import React from 'react';
import { useEditor } from '../useEditor';
import type { EditorState, LeftTabKind } from '../../core/types';
import { ExplorerPane } from './ExplorerPane';
import { ComposerPane } from './ComposerPane';

export function LeftSidebar() {
    const state = useEditor();
    const tab: LeftTabKind = state.ui.leftTab ?? 'Explorer';
    const splitPct = Math.min(85, Math.max(30, state.ui.leftSplitPct ?? 60)); // 30~85%

    const setTab = (t: LeftTabKind) =>
        state.update((s: EditorState) => { s.ui = { ...s.ui, leftTab: t }; });

    // 드래그 리사이저
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const onStartDrag = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const el = containerRef.current;
        if (!el) return;
        const onMove = (ev: MouseEvent) => {
            const rect = el.getBoundingClientRect();
            const y = ev.clientY - rect.top;
            const pct = (y / rect.height) * 100;
            state.update((s: EditorState) => {
                s.ui = { ...s.ui, leftSplitPct: Math.min(85, Math.max(30, Math.round(pct))) };
            });
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    return (
        <div className="h-full flex flex-col min-h-0">
            {/* 탭 헤더 */}
            <div className="h-9 border-b px-2 flex items-center gap-2">
                <button
                    className={`text-sm px-2 py-1 rounded border ${tab === 'Explorer' ? 'bg-gray-100 font-semibold' : ''}`}
                    onClick={() => setTab('Explorer')}
                >
                    Explorer
                </button>
                <button
                    className={`text-sm px-2 py-1 rounded border ${tab === 'Composer' ? 'bg-gray-100 font-semibold' : ''}`}
                    onClick={() => setTab('Composer')}
                >
                    Composer
                </button>
            </div>

            {/* 상/하 분할 */}
            <div ref={containerRef} className="flex-1 grid min-h-0" style={{ gridTemplateRows: `${splitPct}% 6px 1fr` }}>
                {/* 상단 */}
                <div className="min-h-0 overflow-auto">
                    {tab === 'Explorer' ? <ExplorerPane.Top /> : <ComposerPane.Top />}
                </div>

                {/* 리사이저 */}
                <div className="cursor-row-resize bg-gray-200" onMouseDown={onStartDrag} title="Drag to resize" />

                {/* 하단 */}
                <div className="min-h-0 overflow-auto border-t">
                    {tab === 'Explorer' ? <ExplorerPane.Bottom /> : <ComposerPane.Bottom />}
                </div>
            </div>
        </div>
    );
}