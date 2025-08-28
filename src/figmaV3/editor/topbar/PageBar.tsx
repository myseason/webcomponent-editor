'use client';

import React, { useState, useEffect } from 'react';
import { useEditor } from '../useEditor';
import type { Viewport, Page } from '../../core/types';
import { Monitor, Tablet, Smartphone, RotateCw, Plus, Minus, Undo, Redo } from 'lucide-react';

const VIEWPORT_WIDTHS: Record<Viewport, { w: number, h: number }> = {
    base: { w: 1280, h: 800 },
    tablet: { w: 768, h: 1024 },
    mobile: { w: 375, h: 667 },
};

const ZOOM_MIN = 0.25; // 25%
const ZOOM_MAX = 4.0;  // 400%
const ZOOM_STEP = 0.25; // 25%

export default function PageBar() {
    const {
        project, ui, undo, redo, history,
        setActiveViewport, setCanvasSize, setCanvasZoom, selectPage,
        toggleCanvasOrientation
    } = useEditor();

    const currentPage = project.pages.find((p: Page) => p.rootId === project.rootId);
    const { activeViewport, width: canvasWidth, height: canvasHeight, zoom } = ui.canvas;

    const [localWidth, setLocalWidth] = useState(canvasWidth.toString());
    const [localHeight, setLocalHeight] = useState(canvasHeight.toString());
    const [localZoom, setLocalZoom] = useState(Math.round(zoom * 100).toString());

    useEffect(() => { setLocalWidth(canvasWidth.toString()); }, [canvasWidth]);
    useEffect(() => { setLocalHeight(canvasHeight.toString()); }, [canvasHeight]);
    useEffect(() => { setLocalZoom(Math.round(zoom * 100).toString()); }, [zoom]);

    const setViewport = (viewport: Viewport) => {
        setActiveViewport(viewport);
        setCanvasSize({ width: VIEWPORT_WIDTHS[viewport].w, height: VIEWPORT_WIDTHS[viewport].h });
    };

    const applyCanvasSize = () => {
        const newWidth = parseInt(localWidth, 10);
        const newHeight = parseInt(localHeight, 10);
        if (!isNaN(newWidth) && newWidth > 0 && !isNaN(newHeight) && newHeight > 0) {
            setCanvasSize({ width: newWidth, height: newHeight });
        } else {
            setLocalWidth(canvasWidth.toString());
            setLocalHeight(canvasHeight.toString());
        }
    };

    const handleZoom = (newZoom: number) => {
        const clampedZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
        setCanvasZoom(clampedZoom);
    };

    const applyZoom = () => {
        const newZoom = parseInt(localZoom, 10);
        if (!isNaN(newZoom)) {
            handleZoom(newZoom / 100);
        } else {
            setLocalZoom(Math.round(zoom * 100).toString());
        }
    };

    return (
        <div className="h-10 px-4 flex items-center justify-between text-sm border-b bg-white shrink-0 text-gray-800">
            {/* Left Section */}
            <div className="flex items-center gap-4 flex-1">
                <select
                    className="border rounded px-2 py-1 bg-white text-sm font-semibold"
                    value={currentPage?.id ?? ''}
                    onChange={(e) => selectPage(e.target.value)}
                >
                    {project.pages.map((p: Page) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <div className="flex items-center border-l pl-2">
                    <button
                        title="Undo (Ctrl+Z)"
                        onClick={undo}
                        disabled={history.past.length === 0}
                        className="p-1.5 hover:bg-gray-100 rounded disabled:text-gray-300 disabled:cursor-not-allowed"
                    >
                        <Undo size={16} />
                    </button>
                    <button
                        title="Redo (Ctrl+Y)"
                        onClick={redo}
                        disabled={history.future.length === 0}
                        className="p-1.5 hover:bg-gray-100 rounded disabled:text-gray-300 disabled:cursor-not-allowed"
                    >
                        <Redo size={16} />
                    </button>
                </div>
            </div>

            {/* Center Section */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded">
                    <button title="Desktop" onClick={() => setViewport('base')} className={`p-1.5 rounded ${activeViewport === 'base' ? 'bg-white shadow-sm' : 'hover:bg-gray-200 text-gray-500'}`}>
                        <Monitor size={16} />
                    </button>
                    <button title="Tablet" onClick={() => setViewport('tablet')} className={`p-1.5 rounded ${activeViewport === 'tablet' ? 'bg-white shadow-sm' : 'hover:bg-gray-200 text-gray-500'}`}>
                        <Tablet size={16} />
                    </button>
                    <button title="Mobile" onClick={() => setViewport('mobile')} className={`p-1.5 rounded ${activeViewport === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-gray-200 text-gray-500'}`}>
                        <Smartphone size={16} />
                    </button>
                </div>
                <div className="flex items-center gap-1">
                    <input
                        type="number" className="w-14 text-center border rounded-sm px-1 py-0.5 text-xs"
                        value={localWidth} onChange={e => setLocalWidth(e.target.value)}
                        onBlur={applyCanvasSize} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    />
                    <span className="text-gray-400 text-xs">×</span>
                    <input
                        type="number" className="w-14 text-center border rounded-sm px-1 py-0.5 text-xs"
                        value={localHeight} onChange={e => setLocalHeight(e.target.value)}
                        onBlur={applyCanvasSize} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    />
                    <button className="p-1 hover:bg-gray-100 rounded" title="Rotate Canvas" onClick={toggleCanvasOrientation}>
                        <RotateCw size={14} className="text-gray-500" />
                    </button>
                </div>
                <div className="flex items-center gap-2 border-l pl-4">
                    <button
                        className="p-1 hover:bg-gray-100 rounded disabled:text-gray-300 disabled:cursor-not-allowed"
                        onClick={() => handleZoom(zoom - ZOOM_STEP)}
                        disabled={zoom <= ZOOM_MIN}
                    >
                        <Minus size={14} />
                    </button>
                    <div className="w-16 text-center text-xs">
                        <input
                            type="text"
                            className="w-full text-center bg-transparent"
                            value={`${localZoom}%`}
                            onChange={e => setLocalZoom(e.target.value.replace('%', ''))}
                            onBlur={applyZoom}
                            onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                        />
                    </div>
                    <button
                        className="p-1 hover:bg-gray-100 rounded disabled:text-gray-300 disabled:cursor-not-allowed"
                        onClick={() => handleZoom(zoom + ZOOM_STEP)}
                        disabled={zoom >= ZOOM_MAX}
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3 flex-1 justify-end">
                <span className="text-xs text-gray-400">Saved</span>
                <button className="text-xs px-3 py-1 border rounded hover:bg-gray-50">
                    Preview
                </button>
                <button className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">
                    Publish
                </button>
            </div>
        </div>
    );
}