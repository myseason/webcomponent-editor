'use client';
/**
 * ComponentEditor
 * - 상단 PageBar + 본문(좌/중/우) + 하단 BottomDock
 * - 본문은 min-h-0을 활용하여 내부 스크롤/오버플로우가 제대로 동작하도록 구성
 *
 * 규칙:
 * - 훅 최상위 호출(useEditor)
 * - any 금지
 * - 얕은 복사 update 규약은 store에서 보장
 */

import React from 'react';
import { useEditor } from './useEditor';
import { bootstrapEditor } from './bootstrap';
import PageBar from './topbar/PageBar';
import { Palette } from './leftPanel/Palette';
import { Layers } from './leftPanel/Layers';
import { Canvas } from './centerPanel/Canvas';
import { OverlayHost } from './centerPanel/OverlayHost';
import { Inspector } from './rightPanel/Inspector';
import { BottomDock } from './bottomPanel/BottomDock';

// 초기 부트스트랩(정의/기본 컴포넌트 등록 등)
bootstrapEditor();

export default function ComponentEditor() {
    // 훅(최상위)
    const editor = useEditor();

    return (
        // 화면 전체를 차지하고 내부 스크롤이 정상 동작하도록 구성
        <div className="h-screen flex flex-col min-h-0 bg-white">
            {/* ── 상단: 페이지 바(Topbar) */}
            <div className="shrink-0 border-b bg-gray-50">
                <PageBar />
            </div>

            {/* ── 본문: 좌/중/우 3열 그리드 (min-h-0 필수) */}
            <div className="flex-1 grid grid-cols-[260px_minmax(0,1fr)_320px] min-h-0">
                {/* 좌측 패널: Palette + Layers (독립 스크롤) */}
                <div className="min-h-0 overflow-auto border-r p-2">
                    <div className="text-[11px] font-semibold text-gray-600 mb-2">Palette</div>
                    <Palette />
                    <div className="h-3" />
                    <div className="text-[11px] font-semibold text-gray-600 mb-2">Layers</div>
                    <Layers />
                </div>

                {/* 중앙: Canvas + Overlay (중앙은 overflow-hidden; Canvas 내부 스크롤/줌 처리) */}
                <div className="min-h-0 overflow-hidden relative">
                    <Canvas />
                    {/* 프래그먼트/모달을 Canvas 위에 쌓아 올림 */}
                    <OverlayHost />
                </div>

                {/* 우측: Inspector (독립 스크롤) */}
                <div className="min-h-0 overflow-auto border-l">
                    <Inspector />
                </div>
            </div>

            {/* ── 하단: BottomDock (높이/리사이저는 컴포넌트 내부에서 관리) */}
            <BottomDock />
        </div>
    );
}