'use client';
/**
 * BottomDock
 * - 좌측: 기존 하단 탭(Flows / Actions / Data / Fragments) — 세로 스크롤
 * - 우측: 고급 패널(예: SchemaEditor) — 세로 스크롤
 * - 상단에 수평 리사이저 바(높이 조절), 중간에 수직 리사이저(좌/우 너비 조절)
 *
 * 규칙
 * - 훅 최상위 호출
 * - any 금지
 * - 얕은 복사 update 사용
 */

import React from 'react';
import { useEditor } from '../useEditor';
import { ActionsPanel } from './panels/ActionsPanel';
import { DataPanel } from './panels/DataPanel';
import { FlowsPanel } from './panels/FlowsPanel';
import { FragmentsPanel } from './panels/FragmentsPanel';
import { SchemaEditor } from '../rightPanel/sections/SchemaEditor';
import type { BottomRightPanelKind, EditorState } from '../../core/types';

type Tab = 'actions' | 'data' | 'flows' | 'fragments';

const MIN_HEIGHT = 120; // px
const MAX_VH = 0.8;     // 화면 높이의 80%까지 허용
const DEFAULT_HEIGHT = 160; // px (14rem)

export function BottomDock() {
    // 훅(최상위)
    const state = useEditor();
    const ui = state.ui.bottomRight;

    const [tab, setTab] = React.useState<Tab>('actions');

    // ── 높이: UI에 저장해 두고, 없으면 기본값
    const bottomHeightPx = state.ui.bottomHeightPx ?? DEFAULT_HEIGHT;

    // ── 우측 패널 상태
    const rightOpen = Boolean(ui?.open && ui.kind !== 'None');
    const rightPct = ui?.widthPct ?? 36; // 우측 % (20~60 범위로 관리)
    const leftPct = rightOpen ? 100 - rightPct : 100;

    // ── 수평 리사이저(높이 조절)
    const onHDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const startY = e.clientY;
        const startH = bottomHeightPx;

        const onMove = (ev: MouseEvent) => {
            const dy = startY - ev.clientY; // 위로 올리면 양수 → 높이 증가
            const vh = typeof window !== 'undefined' ? window.innerHeight : 1000;
            const max = Math.max(MIN_HEIGHT, Math.floor(vh * MAX_VH));
            const next = Math.max(MIN_HEIGHT, Math.min(max, startH + dy));
            state.update((s: EditorState) => {
                s.ui = { ...s.ui, bottomHeightPx: next };
            });
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            document.body.style.cursor = '';
        };

        document.body.style.cursor = 'row-resize';
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    // ── 수직 리사이저(좌/우 너비 조절)
    const onVDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!rightOpen) return;
        e.preventDefault();
        const root = (e.currentTarget.parentElement as HTMLElement) ?? null;
        if (!root) return;

        const onMove = (ev: MouseEvent) => {
            const rect = root.getBoundingClientRect();
            const x = ev.clientX - rect.left; // 좌측 너비
            const pctRight = Math.max(20, Math.min(60, Math.round(((rect.width - x) / rect.width) * 100)));
            state.update((s: EditorState) => {
                const cur = s.ui.bottomRight ?? { open: true, kind: 'SchemaEditor' as BottomRightPanelKind, widthPct: 36 };
                s.ui = { ...s.ui, bottomRight: { ...cur, widthPct: pctRight } };
            });
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            document.body.style.cursor = '';
        };

        document.body.style.cursor = 'col-resize';
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    return (
        /**
         * 부모가 flex-col + min-h-0로 구성되어 있어야 내부 스크롤이 정상 동작합니다.
         * (ComponentEditor의 레이아웃 메모 참고)
         */
        <div className="border-t bg-white select-none" style={{ height: bottomHeightPx }}>
            {/* ── 수평 리사이저 바 (높이 조절) */}
            <div
                className="h-2 cursor-row-resize hover:bg-gray-200"
                onMouseDown={onHDragStart}
                title="드래그하여 하단 패널 높이 조절"
            />

            {/* 탭 바 */}
            <div className="h-8 border-b flex items-center text-xs">
                <button
                    className={`h-full px-3 border-r ${tab === 'actions' ? 'bg-gray-100 font-semibold' : ''}`}
                    onClick={() => setTab('actions')}
                >
                    Actions
                </button>
                <button
                    className={`h-full px-3 border-r ${tab === 'data' ? 'bg-gray-100 font-semibold' : ''}`}
                    onClick={() => setTab('data')}
                >
                    Data
                </button>
                <button
                    className={`h-full px-3 border-r ${tab === 'flows' ? 'bg-gray-100 font-semibold' : ''}`}
                    onClick={() => setTab('flows')}
                >
                    Flows
                </button>
                <button
                    className={`h-full px-3 border-r ${tab === 'fragments' ? 'bg-gray-100 font-semibold' : ''}`}
                    onClick={() => setTab('fragments')}
                >
                    Fragments
                </button>

                {/* 우측 패널 상태 뱃지 */}
                {rightOpen ? (
                    <span className="ml-auto mr-2 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
            right: {ui?.kind}
          </span>
                ) : (
                    <span className="ml-auto mr-2 text-[10px] text-gray-500">
            right: closed
          </span>
                )}
            </div>

            {/* 본문: 좌/우 split grid — 각 영역에 개별 세로 스크롤 */}
            <div className="h-[calc(100%-2rem-0.5rem)] relative min-h-0">
                {/* 2rem = 탭바 높이 8 + 수평 리사이저 8(px) ≈ 32px, 0.5rem은 border/여유치 보정 용도 */}
                <div
                    className="absolute inset-0 grid"
                    style={{ gridTemplateColumns: rightOpen ? `${leftPct}% 4px ${rightPct}%` : '100% 0 0' }}
                >
                    {/* 좌측 패널 — 세로 스크롤 */}
                    <div className="min-h-0 overflow-auto">
                        {tab === 'actions' && <ActionsPanel />}
                        {tab === 'data' && <DataPanel />}
                        {tab === 'flows' && <FlowsPanel />}
                        {tab === 'fragments' && <FragmentsPanel />}
                    </div>

                    {/* 수직 리사이저 */}
                    <div
                        className={`cursor-col-resize ${rightOpen ? 'bg-gray-200 hover:bg-gray-300' : ''}`}
                        onMouseDown={onVDragStart}
                        title={rightOpen ? '드래그로 패널 너비 조절' : ''}
                    />

                    {/* 우측 고급 패널 — 세로 스크롤 */}
                    <div className="min-h-0 overflow-hidden">
                        {rightOpen && ui?.kind === 'SchemaEditor' && (
                            <div className="h-full flex flex-col border-l bg-white">
                                {/* 헤더 */}
                                <div className="h-8 flex items-center justify-between px-2 border-b text-xs shrink-0">
                                    <div className="font-semibold text-gray-700">Schema Editor (Project Override)</div>
                                    <button
                                        className="border rounded px-2 py-0.5"
                                        onClick={() =>
                                            state.update((s: EditorState) => {
                                                const cur = s.ui.bottomRight ?? { open: true, kind: 'SchemaEditor' as BottomRightPanelKind, widthPct: 36 };
                                                s.ui = { ...s.ui, bottomRight: { ...cur, open: false, kind: 'None' } };
                                            })
                                        }
                                    >
                                        ✕
                                    </button>
                                </div>
                                {/* 콘텐츠 — 세로 스크롤 */}
                                <div className="flex-1 overflow-auto p-2 min-h-0">
                                    <SchemaEditor nodeId={state.ui.selectedId ?? state.project.rootId} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BottomDock;