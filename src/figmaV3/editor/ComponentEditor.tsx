'use client';
/**
 * ComponentEditor
 * - 상단 PageBar(있다면) + 좌/중/우 + 하단 도크
 * - Canvas 위에 OverlayHost를 올려 프래그먼트 표시
 */
import React from 'react';
import { useEditor } from './useEditor';
import { bootstrapEditor } from './bootstrap';
import { Palette } from './leftPanel/Palette';
import { Layers } from './leftPanel/Layers';
import { Canvas } from './centerPanel/Canvas';
import { OverlayHost } from './centerPanel/OverlayHost';
import { Inspector } from './rightPanel/Inspector';
import { BottomDock } from './bottomPanel/BottomDock';

bootstrapEditor();

export default function ComponentEditor() {
    const editor = useEditor();

    return (
        <div
            className="h-screen w-screen grid grid-rows-[1fr_auto]"
            data-root-id={editor.project.rootId}
        >
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
                    <OverlayHost /> {/* ← 오버레이 */}
                </main>

                <aside className="border-l bg-white overflow-auto">
                    <Inspector />
                </aside>
            </div>

            <BottomDock />
        </div>
    );
}