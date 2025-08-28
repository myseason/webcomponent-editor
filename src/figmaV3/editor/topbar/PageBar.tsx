'use client';
import React from 'react';
import { useEditor } from '../useEditor';
import type { EditorMode, EditorState, Viewport } from '../../core/types';
import { Monitor, Tablet, Smartphone } from 'lucide-react';

export default function PageBar() {
    const state = useEditor();
    const currentPage = state.project.pages.find((p) => p.rootId === state.project.rootId);

    // ✅ [수정] 새로운 UI 구조 경로 사용
    const { mode, expertMode } = state.ui;
    const { activeViewport } = state.ui.canvas;

    const setMode = (m: EditorMode) =>
        state.update((s: EditorState) => { s.ui.mode = m; });

    const toggleExpert = () =>
        state.update((s: EditorState) => { s.ui.expertMode = !s.ui.expertMode; });

    const setViewport = (viewport: Viewport) => {
        state.setActiveViewport(viewport);
    };

    return (
        <div className="h-10 px-3 flex items-center gap-3 text-sm border-b bg-white">
            <div className="flex items-center gap-1">
                <button
                    className={`px-2 py-1 border rounded ${mode === 'Page' ? 'bg-gray-100 font-semibold' : ''}`}
                    onClick={() => setMode('Page')}
                >
                    Page
                </button>
                <button
                    className={`px-2 py-1 border rounded ${mode === 'Component' ? 'bg-gray-100 font-semibold' : ''}`}
                    onClick={() => setMode('Component')}
                >
                    Component
                </button>
            </div>

            <div className="ml-2">
                <span className="text-gray-500">Page:</span>{' '}
                <select
                    className="border rounded px-2 py-1 bg-white"
                    value={currentPage?.id ?? ''}
                    onChange={(e) => state.selectPage(e.target.value)}
                >
                    {state.project.pages.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex items-center gap-1 mx-auto">
                <button title="Desktop" onClick={() => setViewport('base')} className={`p-2 rounded ${activeViewport === 'base' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
                    <Monitor size={16} />
                </button>
                <button title="Tablet" onClick={() => setViewport('tablet')} className={`p-2 rounded ${activeViewport === 'tablet' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
                    <Tablet size={16} />
                </button>
                <button title="Mobile" onClick={() => setViewport('mobile')} className={`p-2 rounded ${activeViewport === 'mobile' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
                    <Smartphone size={16} />
                </button>
            </div>

            <div className="ml-auto flex items-center gap-2">
                <label className="text-xs text-gray-600">Expert</label>
                <button
                    className={`px-2 py-1 border rounded ${expertMode ? 'bg-emerald-50 text-emerald-700' : ''}`}
                    onClick={toggleExpert}
                >
                    {expertMode ? 'ON' : 'OFF'}
                </button>
            </div>
        </div>
    );
}