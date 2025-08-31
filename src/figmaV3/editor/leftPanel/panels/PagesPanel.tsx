'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useEditor } from '../../useEditor';
import type { Page } from '../../../core/types';

function slugify(s: string): string {
    return s.trim().toLowerCase().replace(/[\s_]+/g, '-').slice(0, 64);
}

export function PagesPanel() {
    const state = useEditor();
    const { project, ui, addPage, removePage, selectPage, update, duplicatePage } = state;

    // ✨ [수정] 이제 로컬 선택 상태가 전역 '열린 페이지' 상태를 따라갑니다.
    const [selectedPageId, setSelectedPageId] = useState<string | null>(project.rootId ? project.pages.find(p => p.rootId === project.rootId)?.id ?? null : null);

    useEffect(() => {
        const currentPage = project.pages.find(p => p.rootId === project.rootId);
        if (currentPage) {
            setSelectedPageId(currentPage.id);
        }
    }, [project.rootId, project.pages]);

    const [splitPct, setSplitPct] = useState(50);
    const containerRef = useRef<HTMLDivElement | null>(null);

    if (ui.mode !== 'Page') {
        return <div className="p-4 text-sm text-gray-500">Page management is available in Page Build Mode.</div>
    }

    const selectedPage = project.pages.find(p => p.id === selectedPageId);

    const createPage = () => {
        const newPageId = addPage('Untitled Page');
        selectPage(newPageId); // 새로 만든 페이지를 바로 엽니다.
    };

    const onStartDrag = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const el = containerRef.current;
        if (!el) return;

        const onMove = (ev: MouseEvent) => {
            const rect = el.getBoundingClientRect();
            const y = ev.clientY - rect.top;
            const pct = (y / rect.height) * 100;
            setSplitPct(Math.min(85, Math.max(15, Math.round(pct))));
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    return (
        <div ref={containerRef} className="h-full grid" style={{ gridTemplateRows: `${splitPct}% 6px 1fr` }}>
            {/* 상단: 페이지 목록 */}
            <div className="overflow-auto p-2">
                <div className="text-xs font-semibold text-gray-700 px-2 py-1">Pages</div>
                <ul className="space-y-1 mt-2">
                    {project.pages.map((p) => (
                        <li key={p.id}>
                            <button
                                type="button"
                                // ✨ [수정] 더블클릭 대신 클릭 시 바로 페이지를 열도록 변경
                                onClick={() => selectPage(p.id)}
                                className={`w-full text-left px-2 py-1.5 rounded border text-sm ${selectedPageId === p.id ? 'bg-blue-50 border-blue-400' : 'hover:bg-gray-50'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="truncate">{p.name}</span>
                                    {p.rootId === project.rootId && (
                                        <span className="text-xs text-blue-600 font-semibold ml-2 bg-blue-100 px-2 py-0.5 rounded-full">OPEN</span>
                                    )}
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* 리사이저 */}
            <div className="h-[6px] cursor-row-resize bg-gray-200 hover:bg-blue-500 transition-colors" onMouseDown={onStartDrag} title="Drag to resize" />

            {/* 하단: 페이지 상세 정보 */}
            <div className="overflow-auto border-t p-2 space-y-3">
                <div className="flex gap-2">
                    <button className="text-xs px-2 py-1 border rounded" onClick={createPage}>+ New Page</button>
                    {selectedPage && <button className="text-xs px-2 py-1 border rounded" onClick={() => duplicatePage(selectedPage.id)}>Duplicate</button>}
                    {selectedPage && project.pages.length > 1 && <button className="text-xs px-2 py-1 border rounded text-red-600" onClick={() => removePage(selectedPage.id)}>Delete</button>}
                </div>
                {selectedPage ? (
                    <div className="space-y-2">
                        <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Page Name</label>
                            <input
                                className="w-full border rounded px-2 py-1 text-sm"
                                value={selectedPage.name}
                                onChange={e => update(s => { s.project.pages.find(p=>p.id===selectedPageId)!.name = e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
                            <textarea
                                className="w-full border rounded px-2 py-1 text-sm h-16 resize-none"
                                value={selectedPage.description ?? ''}
                                onChange={e => update(s => { s.project.pages.find(p=>p.id===selectedPageId)!.description = e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">URL Slug</label>
                            <input
                                className="w-full border rounded px-2 py-1 font-mono text-xs"
                                value={selectedPage.slug ?? ''}
                                onChange={e => update(s => { s.project.pages.find(p=>p.id===selectedPageId)!.slug = slugify(e.target.value) })}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-gray-400 pt-2">Select a page to see its details.</div>
                )}
            </div>
        </div>
    );
}