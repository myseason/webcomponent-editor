'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { EditorState, DndDragPayload, DndDropTarget } from '../core/types';
import { bootstrapEditor } from './bootstrap';

import PageBar from './topbar/PageBar';
import { LeftSidebar } from './leftPanel/LeftSidebar';
import { Canvas } from './centerPanel/Canvas';
import { OverlayHost } from './centerPanel/OverlayHost';
import { Inspector } from './rightPanel/Inspector';
import { BottomDock } from './bottomPanel/BottomDock';
import { DndContext, DragOverlay, type DragStartEvent, type DragEndEvent, type DragOverEvent } from '@dnd-kit/core';
import styles from './ui/theme.module.css';
import {useEditorControllerFactory} from "@/figmaV3/controllers/EditorControllerFactory";

bootstrapEditor();

export function ComponentEditor() {
    const {reader, writer} = useEditorControllerFactory();
    const mainAreaRef = useRef<HTMLDivElement | null>(null);

    const [activeDrag, setActiveDrag] = useState<DndDragPayload | null>(null);
    const [dropTarget, setDropTarget] = useState<DndDropTarget | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
            if (isCtrlOrCmd && e.key === 'z') { e.preventDefault(); writer.undo(); }
            if (isCtrlOrCmd && e.key === 'y') { e.preventDefault(); writer.redo(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [writer.undo, writer.redo]);

    const { leftW } = { leftW: reader.getUI().panels.left.widthPx };

    const onStartDragLeft = (e: React.MouseEvent) => {
        e.preventDefault();
        const el = mainAreaRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const onMove = (ev: MouseEvent) => {
            const newW = ev.clientX - rect.left;
            const clamped = Math.max(260, Math.min(520, Math.round(newW)));

            // updateWidthPx
            writer.setLeftWidthPx(clamped);
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const onDragStart = (e: DragStartEvent) => setActiveDrag(e.active.data.current as DndDragPayload);
    const onDragOver = (e: DragOverEvent) => setDropTarget(e.over?.data.current as DndDropTarget ?? null);
    const onDragEnd = (e: DragEndEvent) => {
        const payload = e.active.data.current as DndDragPayload;
        const target = e.over?.data.current as DndDropTarget | undefined;

        if (payload && target) {
            const parentNode = reader.getProject().nodes[target.nodeId];
            const childrenCount = parentNode?.children?.length ?? 0;
            const newIndex = target.position === 'before' ? 0 : target.position === 'after' ? childrenCount : childrenCount;

            if (payload.kind === 'palette-component') {
                writer.WE.addNodeByDef(payload.defId, target.nodeId, newIndex);
            } else if (payload.kind === 'layers-node' || payload.kind === 'canvas-node') {
                writer.moveNode(payload.nodeId, target.nodeId, newIndex);
            }
        }
        setActiveDrag(null);
        setDropTarget(null);
    };

    const themeClass = styles.mdt_v1_light_theme;

    return (
        <DndContext onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setActiveDrag(null)}>
            {/* ✅ [수정] 최상위 flex 컨테이너로 높이 문제 해결 */}
            <div className={`${themeClass} h-full w-full bg-[var(--mdt-color-background)] text-[var(--mdt-color-text-primary)] font-[var(--mdt-font-family)] flex flex-col`}>
                <PageBar />
                {/* ✅ [수정] 메인 영역이 남은 공간을 모두 차지하도록 flex-1, min-h-0 추가 */}
                <div className="flex-1 flex flex-col min-h-0">
                    {/* ✅ [수정] 좌/중앙/우 패널 컨테이너가 남은 공간을 모두 차지하도록 flex-1, min-h-0 추가 */}
                    <div ref={mainAreaRef} className="flex-1 flex min-h-0">
                        <div className="relative" style={{ width: leftW }}>
                            <LeftSidebar />
                            <div role="separator" onMouseDown={onStartDragLeft} className="absolute right-0 top-0 h-full w-1 cursor-col-resize"/>
                        </div>
                        {/* ✅ [수정] 중앙 캔버스 영역이 남은 공간을 모두 차지하도록 flex-1, min-w-0 추가 */}
                        <div className="flex-1 min-w-0 relative">
                            <Canvas dropTarget={dropTarget} />
                            <OverlayHost />
                        </div>
                        <div className="w-[400px] shrink-0 bg-white border-l border-gray-200">
                            <Inspector />
                        </div>
                    </div>
                    <BottomDock />
                </div>
            </div>
            <DragOverlay>
                {activeDrag ? <div className="px-2 py-1 bg-blue-500 text-white rounded text-xs opacity-80">Dragging: {activeDrag.kind === 'palette-component' ? activeDrag.defId : activeDrag.nodeId}</div> : null}
            </DragOverlay>
        </DndContext>
    );
}
export default ComponentEditor;