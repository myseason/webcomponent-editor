'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor } from './useEditor';
import { bootstrapEditor } from './bootstrap';
import PageBar from './topbar/PageBar';
import { LeftSidebar } from './leftPanel/LeftSidebar';
import { Canvas } from './centerPanel/Canvas';
import { OverlayHost } from './centerPanel/OverlayHost';
import { Inspector } from './rightPanel/Inspector';
import { BottomDock } from './bottomPanel/BottomDock';
import type { EditorState } from '../core/types';
import styles from './ui/theme.module.css';

bootstrapEditor();

export function ComponentEditor() {
    const state = useEditor();
    const mainAreaRef = useRef<HTMLDivElement | null>(null);

    // ✅ [추가] Undo/Redo 키보드 단축키 리스너
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
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [state.undo, state.redo]); // state.undo, state.redo를 의존성 배열에 추가

    const rightW = state.ui.panels.right.widthPx;
    const leftW = state.ui.panels.left.widthPx;

    const onStartDragRight = (e: React.MouseEvent) => {
        e.preventDefault();
        const el = mainAreaRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const onMove = (ev: MouseEvent) => {
            const newW = rect.right - ev.clientX;
            const clamped = Math.max(320, Math.min(720, Math.round(newW)));
            state.update((s: EditorState) => {
                s.ui.panels.right.widthPx = clamped;
            });
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

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
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const themeClass = styles.mdt_v1_light_theme;

    return (
        <div className={`${themeClass} h-full w-full bg-[var(--mdt-color-background)] text-[var(--mdt-color-text-primary)] font-[var(--mdt-font-family)] flex flex-col`}>
            <PageBar />
            <div className="flex-1 flex flex-col min-h-0">
                <div ref={mainAreaRef} className="flex-1 flex min-h-0">
                    <div className="relative" style={{ width: leftW }}>
                        <LeftSidebar />
                        <div role="separator" onMouseDown={onStartDragLeft} className="absolute right-0 top-0 h-full w-1 cursor-col-resize"/>
                    </div>
                    <div className="flex-1 min-w-0">
                        <Canvas />
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
    );
}
export default ComponentEditor;