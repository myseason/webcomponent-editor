'use client';
/**
 * ComponentEditor
 * - 좌: Palette(컴포넌트 추가), Layers(트리)
 * - 중: Canvas(렌더/선택/이벤트 파이프라인)
 * - 우: Inspector(Props/Styles/가드)
 * - 하: BottomDock(Actions/Data/Flows)
 *
 * 규칙:
 * - 훅은 최상위에서만 호출(useEditor)
 * - 상태는 JSX에 최소 1곳 바인딩(리렌더 트리거 + no-unused-vars 회피)
 * - 부팅은 모듈 레벨에서 1회 실행하여 등록 순서 보장
 */
import React from 'react';
import { useEditor } from './useEditor';
import { bootstrapEditor } from './bootstrap';
import { Palette } from './leftPanel/Palette';
import { Layers } from './leftPanel/Layers';
import { Canvas } from './centerPanel/Canvas';
import { Inspector } from './rightPanel/Inspector';
import { BottomDock } from './bottomPanel/BottomDock';

// 부팅은 최초 import 시 1회 실행 (컴포넌트 등록 선행)
bootstrapEditor();

export default function ComponentEditor() {
    // 최상위 훅: 상태+액션 일원화
    const editor = useEditor();

    return (
        // 상태를 data-attr에 바인딩하여 훅 반환값을 실제로 사용 → 불필요 경고 제거 및 리렌더 보장
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

                <main className="overflow-auto">
                    <Canvas />
                </main>

                <aside className="border-l bg-white overflow-auto">
                    <Inspector />
                </aside>
            </div>

            <BottomDock />
        </div>
    );
}