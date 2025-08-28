'use client';
/**
 * LeftSidebar
 * - 좌측 2탭: Explorer / Composer
 * - 각 탭은 상/하 분할(리사이저 포함). 비율은 ui.panels.left.splitPct에 저장
 * - any 금지, 훅 최상위, 얕은 복사 update 규약
 */
import React from 'react';
import { useEditor } from '../useEditor';
import type { EditorState, LeftTabKind } from '../../core/types';
import { ExplorerPane } from './ExplorerPane';
import { ComposerPane } from './ComposerPane';

export function LeftSidebar() {
    const state = useEditor();

    // ✅ [수정] 새로운 UI 상태 경로 참조
    const { tab, splitPct } = state.ui.panels.left;
    const clampedSplitPct = Math.min(85, Math.max(15, splitPct));

    const setTab = (t: LeftTabKind) =>
        state.update((s: EditorState) => { s.ui.panels.left.tab = t; });

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
                s.ui.panels.left.splitPct = Math.min(85, Math.max(15, Math.round(pct)));
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
        <div className="h-full flex flex-col min-h-0 bg-white border-r border-gray-200">
            {/* 탭 헤더 */}
            <div className="h-9 border-b px-2 flex items-center gap-2 shrink-0">
                <button
                    className={`text-sm px-2 py-1 rounded border ${tab === 'Explorer' ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}`}
                    onClick={() => setTab('Explorer')}
                >
                    Explorer
                </button>
                <button
                    className={`text-sm px-2 py-1 rounded border ${tab === 'Composer' ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}`}
                    onClick={() => setTab('Composer')}
                >
                    Composer
                </button>
            </div>

            {/* 상/하 분할 */}
            <div ref={containerRef} className="flex-1 grid min-h-0" style={{ gridTemplateRows: `${clampedSplitPct}% 6px 1fr` }}>
                {/* 상단 */}
                <div className="min-h-0 overflow-auto">
                    {tab === 'Explorer' ? <ExplorerPane.Top /> : <ComposerPane.Top />}
                </div>

                {/* 리사이저 */}
                <div className="h-[6px] cursor-row-resize bg-gray-200 hover:bg-blue-500 transition-colors" onMouseDown={onStartDrag} title="Drag to resize" />

                {/* 하단 */}
                <div className="min-h-0 overflow-auto border-t">
                    {tab === 'Explorer' ? <ExplorerPane.Bottom /> : <ComposerPane.Bottom />}
                </div>
            </div>
        </div>
    );
}