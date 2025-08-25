'use client';
import React from 'react';
import { useEditor } from './useEditor';
import { bootstrapEditor } from './bootstrap';

import PageBar from './topbar/PageBar';
import { LeftSidebar } from './leftPanel/LeftSidebar';

import { Canvas } from './centerPanel/Canvas';
import { OverlayHost } from './centerPanel/OverlayHost';
import { Inspector } from './rightPanel/Inspector';
import { BottomDock } from './bottomPanel/BottomDock';
import type { EditorState } from '../core/types';

bootstrapEditor();

export default function ComponentEditor() {
    const state = useEditor();
    const containerRef = React.useRef<HTMLDivElement | null>(null);

    const rightW = Math.max(320, Math.min(720, state.ui.rightWidthPx ?? 420));

    const onStartDragRight = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const onMove = (ev: MouseEvent) => {
            // 마우스 X로부터 우측 패널 너비 계산: 전체 오른쪽 끝 - 현재 X
            const newW = rect.right - ev.clientX;
            const clamped = Math.max(320, Math.min(720, Math.round(newW)));
            state.update((s: EditorState) => {
                s.ui = { ...s.ui, rightWidthPx: clamped };
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
        <div className="w-full h-full grid" style={{ gridTemplateRows: '40px 1fr auto' }}>
            {/* Topbar */}
            <div className="border-b">
                <PageBar />
            </div>

            {/* Main */}
            <div
                ref={containerRef}
                className="grid min-h-0"
                // 좌: 320, 중: 1fr, 리사이저: 6px, 우: 가변
                style={{ gridTemplateColumns: `320px 1fr 6px ${rightW}px` }}
            >
                {/* Left */}
                <div className="border-r min-h-0">
                    <LeftSidebar />
                </div>

                {/* Center */}
                <div className="relative min-h-0 overflow-auto">
                    <Canvas />
                    <OverlayHost />
                </div>

                {/* Right resizer */}
                <div
                    className="cursor-col-resize bg-gray-200"
                    onMouseDown={onStartDragRight}
                    title="Drag to resize"
                />

                {/* Right */}
                <div className="border-l min-h-0 overflow-auto overflow-x-hidden"> {/* 가로 스크롤 숨김 */}
                    <Inspector />
                </div>
            </div>

            {/* Bottom Dock */}
            <div className="border-t min-h-0">
                <BottomDock />
            </div>
        </div>
    );
}