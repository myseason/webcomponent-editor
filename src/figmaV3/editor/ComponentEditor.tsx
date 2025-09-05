'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useEditor } from './useEditor';
import { bootstrapEditor } from './bootstrap';
import PageBar from './topbar/PageBar';
import { LeftSidebar } from './leftPanel/LeftSidebar';
import { Canvas } from './centerPanel/Canvas';
import { OverlayHost } from './centerPanel/OverlayHost';
import { Inspector } from './rightPanel/Inspector';
import { BottomDock } from './bottomPanel/BottomDock';
import type { EditorState, DndDragPayload, DndDropTarget } from '../core/types';
import styles from './ui/theme.module.css';
import {
    DndContext,
    DragOverlay,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
} from '@dnd-kit/core';

// ✅ [추가] 아키텍처 개발 배선 훅/초기화
import { useArchitectureDevWiring, initArchitecture } from './initArchitecture';

// 기존 부트스트랩 (원본 유지)
bootstrapEditor();

// ✅ [추가] 가드/레지스트리 초기화 1회
initArchitecture();

export function ComponentEditor() {
    const state = useEditor();
    const mainAreaRef = useRef<HTMLDivElement | null>(null);
    const [activeDrag, setActiveDrag] = useState<DndDragPayload | null>(null);
    const [dropTarget, setDropTarget] = useState<DndDropTarget | null>(null);

    // ✅ [추가] 개발 배선(로깅/저널/Undo 키바인딩). UI에는 영향 없음.
    useArchitectureDevWiring({
        enableLogging: true,
        enableJournal: true,
        autoReplayJournal: false,
        enableUndoKeyBinding: true,
        journalKey: '__EDITOR_CMD_JOURNAL__',
    });

    // (원본 유지) Undo/Redo 키바인딩 - 기존 키핸들링도 유지
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
            if (isCtrlOrCmd && e.key === 'z') {
                e.preventDefault();
                state.undo();
            }
            if (isCtrlOrCmd && e.key === 'y') {
                e.preventDefault();
                state.redo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.undo, state.redo]);

    // (원본 유지) 좌측 패널 리사이즈
    const { leftW } = { leftW: state.ui.panels.left.widthPx };
    const onStartDragLeft = (e: React.MouseEvent) => {
        e.preventDefault();
        const el = mainAreaRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const onMove = (ev: MouseEvent) => {
            const newW = ev.clientX - rect.left;
            const clamped = Math.max(260, Math.min(520, Math.round(newW)));
            state.update((s: EditorState) => {
                s.ui.panels.left.widthPx = clamped;
            });
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    // (원본 유지) DnD
    const onDragStart = (e: DragStartEvent) =>
        setActiveDrag(e.active.data.current as DndDragPayload);
    const onDragOver = (e: DragOverEvent) =>
        setDropTarget((e.over?.data.current as DndDropTarget) ?? null);
    const onDragEnd = (e: DragEndEvent) => {
        const payload = e.active.data.current as DndDragPayload;
        const target = e.over?.data.current as DndDropTarget | undefined;
        if (payload && target) {
            const parentNode = state.project.nodes[target.nodeId];
            const childrenCount = parentNode?.children?.length ?? 0;
            const newIndex =
                target.position === 'before'
                    ? 0
                    : target.position === 'after'
                        ? childrenCount
                        : childrenCount;

            if (payload.kind === 'palette-component') {
                state.addByDefAt(payload.defId, target.nodeId, newIndex);
            } else if (
                payload.kind === 'layers-node' ||
                payload.kind === 'canvas-node'
            ) {
                state.moveNode(payload.nodeId, target.nodeId, newIndex);
            }
        }
        setActiveDrag(null);
        setDropTarget(null);
    };

    const themeClass = styles.mdt_v1_light_theme;

    return (
        <div className={themeClass} style={{ height: '100vh', width: '100vw' }}>
            <div className="flex flex-col h-full w-full" ref={mainAreaRef}>
                {/* 상단 바 */}
                <div className="shrink-0">
                    <PageBar />
                </div>

                {/* 메인 영역 */}
                <div className="flex-1 min-h-0 flex">
                    {/* 좌 패널 */}
                    <div
                        className="shrink-0 relative"
                        style={{ width: leftW, minWidth: 260, maxWidth: 520 }}
                    >
                        <LeftSidebar />
                        <div
                            onMouseDown={onStartDragLeft}
                            className="absolute top-0 right-0 h-full w-[6px] cursor-col-resize"
                        />
                    </div>

                    {/* 중앙 + 우 패널 */}
                    <div className="flex-1 min-h-0 flex">
                        {/* 중앙 캔버스 */}
                        <div className="flex-1 min-w-0 relative">
                            <DndContext
                                onDragStart={onDragStart}
                                onDragOver={onDragOver}
                                onDragEnd={onDragEnd}
                            >
                                <Canvas dropTarget={dropTarget} />
                                <DragOverlay>
                                    {activeDrag ? (
                                        <div className="px-2 py-1 text-xs bg-black/70 text-white rounded">
                                            Dragging:{' '}
                                            {activeDrag.kind === 'palette-component'
                                                ? activeDrag.defId
                                                : activeDrag.nodeId}
                                        </div>
                                    ) : null}
                                </DragOverlay>
                            </DndContext>
                            <OverlayHost />
                        </div>

                        {/* 우 패널 */}
                        <div className="shrink-0 w-[320px] border-l">
                            <Inspector />
                        </div>
                    </div>
                </div>

                {/* 하단 패널 */}
                <div className="shrink-0">
                    <BottomDock />
                </div>
            </div>
        </div>
    );
}

export default ComponentEditor;