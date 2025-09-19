'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { Viewport, Page, ViewportMode } from '../../core/types';
import { Monitor, Tablet, Smartphone, RotateCw, Plus, Minus, Undo, Redo, Info } from 'lucide-react';
import {useTopbarControllerFactory} from "@/figmaV3/controllers/topbar/TopbarControllerFactory";

const VIEWPORT_SIZES: Record<Viewport, { w: number; h: number }> = {
    base:   { w: 1280, h: 800 },
    tablet: { w: 768,  h: 1024 },
    mobile: { w: 375,  h: 667 },
};

const VP_ICON: Record<Viewport, React.ReactNode> = {
    base:   <Monitor size={16} />,
    tablet: <Tablet size={16} />,
    mobile: <Smartphone size={16} />,
};

const VP_LIST: Viewport[] = ['base', 'tablet', 'mobile'];
const ZOOM_MIN = 0.25, ZOOM_MAX = 4.0, ZOOM_STEP = 0.25;

export default function PageBar() {
    const {reader, writer} = useTopbarControllerFactory();
    /*
    const {
        project, ui, history,
        setActiveViewport, setCanvasSize, setCanvasZoom,
        toggleCanvasOrientation, selectPage,
        setBaseViewport, setViewportMode,
        undo, redo, setNotification,
    } = state;
    */
    const project = reader.getProject();
    const ui = reader.getUI();

    const currentPage = useMemo(
        () => project.pages.find((p: Page) => p.rootId === project.rootId),
        [project.pages, project.rootId]
    );

    const { activeViewport, baseViewport, viewportMode, width: canvasWidth, height: canvasHeight, zoom } = ui.canvas;
    const notification = ui.notification;
    const editorMode = ui.mode;
    // 현재 활성 뷰포트의 모드(통합/개별) — 구/신 필드 호환
    const currentVpMode: ViewportMode = (viewportMode && viewportMode[activeViewport]) || 'Unified';

    const [wStr, setWStr] = useState(String(canvasWidth));
    const [hStr, setHStr] = useState(String(canvasHeight));
    const [zoomStr, setZoomStr] = useState(String(Math.round(zoom * 100)));

    useEffect(() => setWStr(String(canvasWidth)), [canvasWidth]);
    useEffect(() => setHStr(String(canvasHeight)), [canvasHeight]);
    useEffect(() => setZoomStr(String(Math.round(zoom * 100))), [zoom]);

    // ✨ [수정] 전역 notification 상태를 구독하고, 2초 후 자동으로 사라지도록 타이머 설정
    const [visibleNotification, setVisibleNotification] = useState<string | null>(null);
    useEffect(() => {
        if (ui.notification) {
            setVisibleNotification(ui.notification.message);
            const timer = setTimeout(() => {
                setVisibleNotification(null);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [ui.notification]);

    const setViewport = (vp: Viewport) => {
        writer.setActiveViewport?.(vp);
        const sz = VIEWPORT_SIZES[vp];
        const isPortrait = reader.getUI().canvas.orientation === 'portrait';
        writer.setCanvasSize?.({ width: isPortrait ? sz.h : sz.w, height: isPortrait ? sz.w : sz.h });
    };

    const applySize = () => {
        const w = parseInt(wStr, 10), h = parseInt(hStr, 10);
        if (!isNaN(w) && w > 0 && !isNaN(h) && h > 0)
            writer.setCanvasSize({ width: w, height: h });
        else {
            setWStr(String(canvasWidth));
            setHStr(String(canvasHeight));
        }
    };

    const handleZoom = (z: number) => writer.setCanvasZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z)));
    const applyZoom = () => {
        const v = parseInt(zoomStr, 10);
        if (!isNaN(v)) handleZoom(v / 100);
        else setZoomStr(String(Math.round(zoom * 100)));
    };

    const toggleExpertMode = () => {
        //state.update(s => { s.ui.expertMode = !s.ui.expertMode; });
        writer.setExpertMode(!ui.expertMode);
        writer.setNotification(`Expert Mode: ${!ui.expertMode ? 'ON' : 'OFF'}`); // ✨ [수정] 전역 알림 액션 사용
    }

    // 통합/개별 모드 토글(라디오)
    const onChangeViewportMode = (mode: ViewportMode) => {
        if (mode === currentVpMode) return;
        writer.setViewportMode(activeViewport, mode);     // (viewport, mode) 시그니처.  [oai_citation:3‡GitHub](https://raw.githubusercontent.com/myseason/webcomponent-editor/feature/v1.4/src/figmaV3/engine/domains/ui.ts)
        writer.setNotification(`Mode: ${mode} (${activeViewport})`);
    };

    return (
        <div className="relative w-full flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2">
            {/* Left: 페이지 선택 또는 컴포넌트 모드 표시 */}
            <div className="flex items-center gap-2">
                {editorMode === 'Page' ? (
                    <select
                        className="px-2 py-1 rounded border border-gray-200 text-sm"
                        value={currentPage?.id ?? ''}
                        onChange={(e) => writer.selectPage(e.target.value)}
                    >
                        {project.pages.map((p: Page) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                ) : (
                    <div className="text-sm font-semibold text-purple-600 px-2 py-1">
                        Editing Component...
                    </div>
                )}
            </div>

            {/* Center: 뷰포트 및 캔버스 컨트롤 */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
                <div className="flex items-center gap-1">
                    <button
                        className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                        onClick={writer.undo}
                        disabled={reader.getPast().length === 0}
                        title="Undo (Cmd+Z)"
                    >
                        <Undo size={16} />
                    </button>
                    <button
                        className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                        onClick={writer.redo}
                        disabled={reader.getFuture().length === 0}
                        title="Redo (Cmd+Y)"
                    >
                        <Redo size={16} />
                    </button>
                </div>

                <span className="mx-3 h-5 w-px bg-gray-300" />

                <div className="flex items-center gap-3" aria-label="Viewport style mode">
                    <label className="flex items-center gap-1 text-xs text-gray-700">
                        <input
                            type="radio"
                            name="vp-mode"
                            checked={viewportMode[activeViewport] === 'Unified'}
                            onChange={() => onChangeViewportMode('Unified')}
                        />
                        통합
                    </label>
                    <label className="flex items-center gap-1 text-xs text-gray-700" title="이 뷰포트에서만 Base를 오버라이드합니다.">
                        <input
                            type="radio"
                            name="vp-mode"
                            checked={viewportMode[activeViewport] === 'Independent'}
                            onChange={() => onChangeViewportMode('Independent')}
                        />
                        개별
                    </label>
                </div>

                <span className="mx-3 h-5 w-px bg-gray-300" />

                <div className="flex items-center gap-2">
                    {VP_LIST.map(vp => (
                        <div key={vp} className="flex items-center gap-1">
                            <button
                                onClick={() => setViewport(vp)}
                                className={`px-2 py-1 rounded border text-sm flex items-center gap-1 ${activeViewport === vp ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                                title={`Switch to ${vp}`}
                            >
                                {VP_ICON[vp]} <span className="capitalize">{vp}</span>
                            </button>
                            <input
                                type="radio"
                                name="vp-base"
                                className="accent-blue-600"
                                checked={baseViewport === vp}
                                onChange={() => {
                                    writer.setBaseViewport(vp);
                                    writer.setNotification(`Base viewport: ${vp}`);
                                }}
                                title="Set as Base"
                            />
                        </div>
                    ))}
                </div>

                <span className="mx-3 h-5 w-px bg-gray-300" />

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <input
                            className="w-16 px-2 py-1 rounded border border-gray-200 text-sm"
                            value={wStr}
                            onChange={(e) => setWStr(e.target.value)}
                            onBlur={applySize}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            aria-label="Canvas width"
                        />
                        <span>×</span>
                        <input
                            className="w-16 px-2 py-1 rounded border border-gray-200 text-sm"
                            value={hStr}
                            onChange={(e) => setHStr(e.target.value)}
                            onBlur={applySize}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            aria-label="Canvas height"
                        />
                    </div>
                    <button
                        className="p-1.5 rounded border border-gray-200 hover:bg-gray-50"
                        onClick={() => writer.toggleCanvasOrientation()}
                        title="Swap width/height"
                    >
                        <RotateCw size={16} />
                    </button>
                    <div className="flex items-center gap-1">
                        <button
                            className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                            onClick={() => handleZoom(zoom - ZOOM_STEP)}
                            disabled={zoom <= ZOOM_MIN}
                            title="Zoom out"
                        >
                            <Minus size={16} />
                        </button>
                        <input
                            className="w-14 px-2 py-1 rounded border border-gray-200 text-sm"
                            value={zoomStr}
                            onChange={(e) => setZoomStr(e.target.value.replace('%', ''))}
                            onBlur={applyZoom}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            aria-label="Zoom percent"
                        />
                        <button
                            className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                            onClick={() => handleZoom(zoom + ZOOM_STEP)}
                            disabled={zoom >= ZOOM_MAX}
                            title="Zoom in"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: 전문가 모드 토글 */}
            <div className="flex items-center gap-2">
                <button
                    className={`p-1.5 rounded border text-xs px-2 ${ui.expertMode ? 'bg-orange-100 text-orange-700' : ''}`}
                    onClick={toggleExpertMode}
                    title="Toggle Expert Mode"
                >
                    Expert
                </button>
            </div>

            {/* ✨ [수정] 전역 상태 기반 알림(Toast) UI */}
            {visibleNotification && (
                <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 rounded bg-black/80 text-white text-xs px-3 py-1.5 shadow">
                        <Info size={14} /> {visibleNotification}
                    </div>
                </div>
            )}
        </div>
    );
}