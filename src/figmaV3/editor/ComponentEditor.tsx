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
import { DndContext, DragOverlay, type DragStartEvent, type DragEndEvent, type DragOverEvent } from '@dnd-kit/core';

bootstrapEditor();

export function ComponentEditor() {
    const state = useEditor();
    const mainAreaRef = useRef<HTMLDivElement | null>(null);

    const [activeDrag, setActiveDrag] = useState<DndDragPayload | null>(null);
    const [dropTarget, setDropTarget] = useState<DndDropTarget | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
            if (isCtrlOrCmd && e.key === 'z') { e.preventDefault(); state.undo(); }
            if (isCtrlOrCmd && e.key === 'y') { e.preventDefault(); state.redo(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.undo, state.redo]);

    const { rightW, leftW } = { rightW: state.ui.panels.right.widthPx, leftW: state.ui.panels.left.widthPx };

    const onStartDragRight = (e: React.MouseEvent) => { /* ... */ };
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

    // DND 핸들러
    const onDragStart = (e: DragStartEvent) => setActiveDrag(e.active.data.current as DndDragPayload);
    const onDragOver = (e: DragOverEvent) => setDropTarget(e.over?.data.current as DndDropTarget ?? null);
    const onDragEnd = (e: DragEndEvent) => {
        const payload = e.active.data.current as DndDragPayload;
        const target = e.over?.data.current as DndDropTarget | undefined;

        if (payload && target) {
            const parentNode = state.project.nodes[target.nodeId];
            const childrenCount = parentNode?.children?.length ?? 0;
            const newIndex = target.position === 'before' ? 0 : target.position === 'after' ? childrenCount : childrenCount;

            if (payload.kind === 'palette-component') {
                state.addByDefAt(payload.defId, target.nodeId, newIndex);
            } else if (payload.kind === 'layers-node' || payload.kind === 'canvas-node') {
                state.moveNode(payload.nodeId, target.nodeId, newIndex);
            }
        }
        setActiveDrag(null);
        setDropTarget(null);
    };

    const themeClass = styles.mdt_v1_light_theme;

    return (
        <DndContext onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setActiveDrag(null)}>
            <div className={`${themeClass} h-full w-full bg-[var(--mdt-color-background)] text-[var(--mdt-color-text-primary)] font-[var(--mdt-font-family)] flex flex-col`}>
                <PageBar />
                <div className="flex-1 flex flex-col min-h-0">
                    <div ref={mainAreaRef} className="flex-1 flex min-h-0">
                        <div className="relative" style={{ width: leftW }}>
                            <LeftSidebar />
                            <div role="separator" onMouseDown={onStartDragLeft} className="absolute right-0 top-0 h-full w-1 cursor-col-resize"/>
                        </div>
                        <div className="flex-1 min-w-0">
                            <Canvas dropTarget={dropTarget} />
                            <OverlayHost />
                        </div>
                        <div role="separator" onMouseDown={onStartDragRight} className="w-1 cursor-col-resize"/>
                        <div style={{ width: rightW }} className="min-w-[320px] max-w-[720px] overflow-auto bg-white">
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