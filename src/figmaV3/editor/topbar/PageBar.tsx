'use client';
/**
 * PageBar (Topbar)
 * - 현재 페이지 표시 및 전환
 * - 모드(Page/Component) 토글
 * - 전문가 모드 토글
 */
import React from 'react';
import { useEditor } from '../useEditor';
import type { EditorMode, EditorState } from '../../core/types';

export default function PageBar() {
    const state = useEditor();
    const currentPage = state.project.pages.find((p) => p.rootId === state.project.rootId);
    const mode: EditorMode = state.ui.mode ?? 'Page';
    const expert = Boolean(state.ui.expertMode);

    const setMode = (m: EditorMode) =>
        state.update((s: EditorState) => { s.ui = { ...s.ui, mode: m }; });

    const toggleExpert = () =>
        state.update((s: EditorState) => { s.ui = { ...s.ui, expertMode: !Boolean(s.ui.expertMode) }; });

    return (
        <div className="h-10 px-3 flex items-center gap-3 text-sm">
            {/* 모드 토글 */}
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

            {/* 현재 페이지 */}
            <div className="ml-2">
                <span className="text-gray-500">Page:</span>{' '}
                <select
                    className="border rounded px-2 py-1 bg-white"
                    value={currentPage?.id ?? ''}
                    onChange={(e) => {
                        const id = e.target.value;
                        state.update((s) => {
                            const p = s.project.pages.find((x) => x.id === id);
                            if (p) s.project = { ...s.project, rootId: p.rootId };
                        });
                    }}
                >
                    {state.project.pages.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

            {/* 전문가 모드 */}
            <div className="ml-auto flex items-center gap-2">
                <label className="text-xs text-gray-600">Expert</label>
                <button
                    className={`px-2 py-1 border rounded ${expert ? 'bg-emerald-50 text-emerald-700' : ''}`}
                    onClick={toggleExpert}
                    title="전문가 모드: 템플릿 필터 무시(단, 태그/능력 정책은 항상 적용)"
                >
                    {expert ? 'ON' : 'OFF'}
                </button>
            </div>
        </div>
    );
}