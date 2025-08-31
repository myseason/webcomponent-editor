'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useEditor } from '../useEditor';
import type { Viewport, Page, ViewportMode } from '../../core/types';
import { Monitor, Tablet, Smartphone, RotateCw, Plus, Minus, Undo, Redo, Info } from 'lucide-react';

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
    const state = useEditor();
    const {
        project, ui, history,
        setActiveViewport, setCanvasSize, setCanvasZoom,
        toggleCanvasOrientation, selectPage,
        setBaseViewport, setViewportMode,
        undo, redo,
    } = state;

    const currentPage = useMemo(
        () => project.pages.find((p: Page) => p.rootId === project.rootId),
        [project.pages, project.rootId]
    );

    const { activeViewport, baseViewport, vpMode, width: canvasWidth, height: canvasHeight, zoom } = ui.canvas;
    const editorMode = ui.mode;

    const [wStr, setWStr] = useState(String(canvasWidth));
    const [hStr, setHStr] = useState(String(canvasHeight));
    const [zoomStr, setZoomStr] = useState(String(Math.round(zoom * 100)));

    useEffect(() => setWStr(String(canvasWidth)), [canvasWidth]);
    useEffect(() => setHStr(String(canvasHeight)), [canvasHeight]);
    useEffect(() => setZoomStr(String(Math.round(zoom * 100))), [zoom]);

    const [toast, setToast] = useState<string | null>(null);
    const notify = (msg: string) => {
        setToast(msg);
        window.clearTimeout((notify as any).__t);
        (notify as any).__t = window.setTimeout(() => setToast(null), 1600);
    };

    const setViewport = (vp: Viewport) => {
        setActiveViewport(vp);
        const sz = VIEWPORT_SIZES[vp];
        setCanvasSize({ width: sz.w, height: sz.h });
    };

    const applySize = () => {
        const w = parseInt(wStr, 10), h = parseInt(hStr, 10);
        if (!isNaN(w) && w > 0 && !isNaN(h) && h > 0) setCanvasSize({ width: w, height: h });
        else {
            setWStr(String(canvasWidth));
            setHStr(String(canvasHeight));
        }
    };

    const handleZoom = (z: number) => setCanvasZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z)));
    const applyZoom = () => {
        const v = parseInt(zoomStr, 10);
        if (!isNaN(v)) handleZoom(v / 100);
        else setZoomStr(String(Math.round(zoom * 100)));
    };

    const toggleExpertMode = () => {
        state.update(s => { s.ui.expertMode = !s.ui.expertMode; });
        notify(`Expert Mode: ${!ui.expertMode ? 'ON' : 'OFF'}`);
    }

    return (
        <div className="relative w-full flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2">
            {/* Left: 페이지 선택 또는 컴포넌트 모드 표시 */}
            <div className="flex items-center gap-2">
                {editorMode === 'Page' ? (
                    <select
                        className="px-2 py-1 rounded border border-gray-200 text-sm"
                        value={currentPage?.id ?? ''}
                        onChange={(e) => selectPage(e.target.value)}
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
                        onClick={undo}
                        disabled={history.past.length === 0}
                        title="Undo (Cmd+Z)"
                    >
                        <Undo size={16} />
                    </button>
                    <button
                        className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                        onClick={redo}
                        disabled={history.future.length === 0}
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
                            checked={vpMode[activeViewport] === 'Unified'}
                            onChange={() => { setViewportMode(activeViewport, 'Unified'); notify(`Mode: Unified (${activeViewport})`); }}
                        />
                        통합
                    </label>
                    <label className="flex items-center gap-1 text-xs text-gray-700" title="이 뷰포트에서만 Base를 오버라이드합니다.">
                        <input
                            type="radio"
                            name="vp-mode"
                            checked={vpMode[activeViewport] === 'Independent'}
                            onChange={() => { setViewportMode(activeViewport, 'Independent'); notify(`Mode: Independent (${activeViewport})`); }}
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
                                onChange={() => { setBaseViewport(vp); notify(`Base viewport: ${vp}`); }}
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
                        onClick={() => toggleCanvasOrientation()}
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

            {toast && (
                <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2">
                    <div className="flex items-center gap-2 rounded bg-black/80 text-white text-xs px-3 py-1.5 shadow">
                        <Info size={14} /> {toast}
                    </div>
                </div>
            )}
        </div>
    );
}