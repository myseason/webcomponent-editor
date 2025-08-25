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

/**
 * 레이아웃
 * [Topbar]
 * [ Left (가변) | Center (flex) | Right (가변) ]
 * [ BottomDock ]
 *
 * - 좌/우 패널은 드래그 리사이저로 폭을 조절
 * - 훅은 최상위에서만 호출(규약)
 * - 얕은 복사 update 규약
 * - SSR 하이드레이션 미스 방지: 폭 초기값은 상수/옵셔널로 처리
 */
bootstrapEditor();

export default function ComponentEditor() {
    const state = useEditor();
    const containerRef = React.useRef<HTMLDivElement | null>(null);

    // 우측 폭: 320 ~ 720
    const rightW = Math.max(320, Math.min(720, state.ui.rightWidthPx ?? 420));
    // 좌측 폭: 260 ~ 520 (기본 320)
    const leftW = Math.max(260, Math.min(520, state.ui.leftWidthPx ?? 320));

    /** 우측 리사이저 드래그 시작 */
    const onStartDragRight = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const onMove = (ev: MouseEvent) => {
            // 전체 오른쪽 끝 - 현재 X = 우측 패널 너비
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

    /** 좌측 리사이저 드래그 시작 */
    const onStartDragLeft = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const onMove = (ev: MouseEvent) => {
            // 현재 X - 전체 왼쪽 = 좌측 패널 너비
            const newW = ev.clientX - rect.left;
            const clamped = Math.max(260, Math.min(520, Math.round(newW)));
            state.update((s: EditorState) => {
                s.ui = { ...s.ui, leftWidthPx: clamped };
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
        <div ref={containerRef} className="h-full w-full flex flex-col overflow-hidden">
            {/* Topbar */}
            <PageBar />

            {/* Main */}
            <div className="flex-1 min-h-0 flex overflow-hidden">
                {/* Left */}
                <div className="relative border-r bg-white" style={{ width: leftW }}>
                    <LeftSidebar />
                    {/* 좌측 리사이저(우측 가장자리) */}
                    <div
                        onMouseDown={onStartDragLeft}
                        className="absolute top-0 right-0 w-1 cursor-col-resize hover:bg-gray-300 active:bg-gray-400"
                        style={{ height: '100%' }}
                        aria-label="resize-left"
                        role="separator"
                        aria-orientation="vertical"
                    />
                </div>

                {/* Center */}
                <div className="flex-1 min-h-0 relative bg-white">
                    <Canvas />
                    <OverlayHost />
                </div>

                {/* Right resizer (좌측 가장자리) */}
                <div
                    onMouseDown={onStartDragRight}
                    className="w-1 cursor-col-resize hover:bg-gray-300 active:bg-gray-400"
                    aria-label="resize-right"
                    role="separator"
                    aria-orientation="vertical"
                />

                {/* Right */}
                <div className="border-l bg-white" style={{ width: rightW }}>
                    <Inspector />
                </div>
            </div>

            {/* 가로 스크롤 숨김 */}
            <div className="overflow-x-hidden">
                <BottomDock />
            </div>
        </div>
    );
}