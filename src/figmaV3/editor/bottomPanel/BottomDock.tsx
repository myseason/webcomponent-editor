'use client';
/**
 * BottomDock
 * - 좌측: 하단 탭 (Flows / Actions / Data / Fragments)
 * - 우측: 고급 패널 (예: SchemaEditor)
 * - 높이/너비 조절 리사이저 포함
 */

import React from 'react';
import { ActionsPanel } from './panels/ActionsPanel';
import { DataPanel } from './panels/DataPanel';
import { FlowsPanel } from './panels/FlowsPanel';
import { FragmentsPanel } from './panels/FragmentsPanel';
import { SchemaEditor } from '../rightPanel/sections/SchemaEditor';
import type { BottomRightPanelKind, EditorState } from '../../core/types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {useBottomPanelController} from "@/figmaV3/controllers/bottom/BottomPanelController";

type Tab = 'actions' | 'data' | 'flows' | 'fragments';

const MIN_HEIGHT = 120;
const MAX_VH = 0.8;
const COLLAPSED_HEIGHT_PX = 40; // 리사이저(8px) + 탭바(32px)
const TAB_BAR_HEIGHT_REM = '2rem'; // 32px

export function BottomDock() {
    const { reader, writer } = useBottomPanelController();
    const R = reader(); const W = writer();
    const state = {
        // ---- 읽기 호환 ----
        ui: R.ui(),
        project: R.project(),
        data: R.data(),
        history: R.history(),
        getEffectiveDecl: R.getEffectiveDecl.bind(R),

        // ---- 쓰기 호환 ----
        updateNodeStyles: W.updateNodeStyles.bind(W),
        updateNodeProps: W.updateNodeProps.bind(W),
        setNotification: W.setNotification.bind(W),
        update: W.update.bind(W),

        // ====== 레거시 표면(파일들이 그대로 기대하는 이름 유지) ======
        /*
        toggleBottomDock: () =>
            W.update((s: any) => {
                const cur = s.ui?.panels?.bottom ?? (s.ui.panels.bottom = {});
                cur.isCollapsed = !Boolean(cur.isCollapsed);
            }),
        */
        toggleBottomDock: W.toggleBottomDock.bind(W),

        // Flows(Edges)
        flowEdges: R.flowEdges(),
        addFlowEdge: W.addFlowEdge.bind(W),
        removeFlowEdge: W.removeFlowEdge.bind(W),
        updateFlowEdge: W.updateFlowEdge.bind(W),

        // Fragments
        addFragment: W.addFragment.bind(W),
        openFragment: W.openFragment.bind(W),
        closeFragment: W.closeFragment.bind(W),
        removeFragment: W.removeFragment.bind(W),

        // 선택 도메인 직접 접근(있을 때만 사용)
        actions: (W.actions || {}),
        flows: (W.flows || {}),
        fragments: (W.fragments || {}),
        dataOps: (W.dataOps || {}),
    };

    // ✅ [수정] 새로운 UI 상태 경로 참조
    const { heightPx, isCollapsed, advanced: advancedPanel } = state.ui.panels.bottom;
    const rightOpen = Boolean(advancedPanel?.open && advancedPanel.kind !== 'None');
    const rightPct = advancedPanel?.widthPct ?? 36;
    const leftPct = rightOpen ? 100 - rightPct : 100;

    const [tab, setTab] = React.useState<Tab>('actions');

    // ✅ [수정] isCollapsed 상태에 따라 동적으로 높이 결정
    const dockHeight = isCollapsed ? COLLAPSED_HEIGHT_PX : heightPx;

    // 높이 조절
    const onHDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const startY = e.clientY;
        const startH = heightPx;

        const onMove = (ev: MouseEvent) => {
            const dy = startY - ev.clientY;
            const vh = window.innerHeight;
            const max = Math.max(MIN_HEIGHT, Math.floor(vh * MAX_VH));
            const next = Math.max(MIN_HEIGHT, Math.min(max, startH + dy));
            state.update((s: EditorState) => { s.ui.panels.bottom.heightPx = next; });
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    // 너비 조절
    const onVDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!rightOpen) return;
        e.preventDefault();
        const root = e.currentTarget.parentElement;
        if (!root) return;

        const onMove = (ev: MouseEvent) => {
            const rect = root.getBoundingClientRect();
            const x = ev.clientX - rect.left;
            const pctRight = Math.max(20, Math.min(60, Math.round(((rect.width - x) / rect.width) * 100)));
            state.update((s: EditorState) => {
                const cur = s.ui.panels.bottom.advanced;
                if (cur) s.ui.panels.bottom.advanced = { ...cur, widthPct: pctRight };
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
        <div className="border-t bg-white select-none" style={{ height: dockHeight }}>
            <div
                className="h-2 cursor-row-resize hover:bg-blue-500 transition-colors"
                onMouseDown={onHDragStart}
                title="Drag to resize"
            />

            <div className="h-8 border-b flex items-center text-xs">
                {(['actions', 'data', 'flows', 'fragments'] as Tab[]).map(t => (
                    <button
                        key={t}
                        className={`h-full px-3 border-r capitalize ${tab === t ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}`}
                        onClick={() => setTab(t)}
                        disabled={isCollapsed ?? false}
                    >
                        {t}
                    </button>
                ))}

                <div className="ml-auto flex items-center">
                    {rightOpen && advancedPanel && (
                        <span className="mr-2 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            Advanced: {advancedPanel.kind}
                        </span>
                    )}
                    {/* ✅ [추가] 접기/펴기 토글 버튼 */}
                    <button
                        className="h-8 w-8 flex items-center justify-center border-l hover:bg-gray-100"
                        onClick={state.toggleBottomDock}
                        title={isCollapsed ? "Expand Panel" : "Collapse Panel"}
                    >
                        {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            <div
                className="relative min-h-0 overflow-hidden transition-all duration-200"
                style={{ height: `calc(100% - ${TAB_BAR_HEIGHT_REM} - 8px)` }}
            >
                {!isCollapsed && (
                <div
                    className="absolute inset-0 grid"
                    style={{ gridTemplateColumns: rightOpen ? `${leftPct}% 4px ${rightPct}%` : '100% 0 0' }}
                >
                    <div className="min-h-0 overflow-auto">
                        {tab === 'actions' && <ActionsPanel />}
                        {tab === 'data' && <DataPanel />}
                        {tab === 'flows' && <FlowsPanel />}
                        {tab === 'fragments' && <FragmentsPanel />}
                    </div>

                    <div
                        className={`cursor-col-resize ${rightOpen ? 'bg-gray-200 hover:bg-blue-500 transition-colors' : ''}`}
                        onMouseDown={onVDragStart}
                        title={rightOpen ? 'Drag to resize' : ''}
                    />

                    <div className="min-h-0 overflow-hidden">
                        {rightOpen && advancedPanel?.kind === 'SchemaEditor' && (
                            <div className="h-full flex flex-col border-l bg-white">
                                <div className="h-8 flex items-center justify-between px-2 border-b text-xs shrink-0">
                                    <div className="font-semibold text-gray-700">Schema Editor (Project Override)</div>
                                    <button
                                        className="border rounded px-2 py-0.5"
                                        onClick={() =>
                                            state.update((s: EditorState) => {
                                                if (s.ui.panels.bottom.advanced) s.ui.panels.bottom.advanced.open = false;
                                            })
                                        }
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="flex-1 overflow-auto p-2 min-h-0">
                                    <SchemaEditor nodeId={state.ui.selectedId ?? state.project.rootId} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                )}
            </div>
        </div>
    );
}

export default BottomDock;