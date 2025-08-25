'use client';
/**
 * ComponentEditor
 * - 상단 PageBar를 추가하여 페이지 생성/선택/수정/삭제를 지원
 * - 레이아웃: [Header | Main | BottomDock]
 */
import React from 'react';
import { useEditor } from './useEditor';
import { bootstrapEditor } from './bootstrap';
import PageBar from './topbar/PageBar';
import { Palette } from './leftPanel/Palette';
import { Layers } from './leftPanel/Layers';
import { Canvas } from './centerPanel/Canvas';
import { Inspector } from './rightPanel/Inspector';
import { BottomDock } from './bottomPanel/BottomDock';
import { OverlayHost } from './centerPanel/OverlayHost';

bootstrapEditor();

export default function ComponentEditor() {
    const editor = useEditor();

    return (
        <div
            className="h-screen w-screen grid grid-rows-[auto_1fr_auto]"
            data-root-id={editor.project.rootId}
        >
            {/* Header */}
            <PageBar />

            {/* Main */}
            <div className="grid grid-cols-[260px_1fr_320px] gap-0">
                <aside className="border-r bg-white overflow-auto">
                    <div className="p-2 text-xs font-semibold text-gray-600">Palette</div>
                    <Palette />
                    <div className="h-px bg-gray-100 my-2" />
                    <div className="p-2 text-xs font-semibold text-gray-600">Layers</div>
                    <Layers />
                </aside>

                <main className="overflow-auto relative">
                    <Canvas />
                    {/* 오버레이: 상위에 렌더 */}
                    <OverlayHost />
                </main>

                <aside className="border-l bg-white overflow-auto">
                    <Inspector />
                </aside>
            </div>

            {/* BottomDock */}
            <BottomDock />
        </div>
    );
}