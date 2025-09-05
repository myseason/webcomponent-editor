'use client';
import React, { useState, useRef, useEffect } from 'react';
import { usePagesController } from '@/figmaV3/controllers/PagesController';
import type { Page } from '../../../core/types';
import { MoreHorizontal, Copy, Trash2 } from 'lucide-react';

function slugify(s: string): string {
    return s.trim().toLowerCase().replace(/[\s_]+/g, '-').slice(0, 64);
}

/**
 * ✨ [신규] 페이지 액션 메뉴 컴포넌트
 */
const PageActions = ({ page, onDuplicate, onDelete }: { page: Page; onDuplicate: () => void; onDelete: () => void; }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                className="p-1 rounded-md hover:bg-gray-200"
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                title="Actions"
            >
                <MoreHorizontal size={16} />
            </button>
            {isOpen && (
                <div role="menu" className="absolute right-0 mt-1 w-36 bg-white border rounded shadow-md z-10">
                    <button role="menuitem" className="w-full px-2 py-1.5 text-xs hover:bg-neutral-50 flex items-center gap-2" onClick={onDuplicate}>
                        <Copy size={14} /> Duplicate
                    </button>
                    <button role="menuitem" className="w-full px-2 py-1.5 text-xs hover:bg-neutral-50 text-red-600 flex items-center gap-2" onClick={onDelete}>
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            )}
        </div>
    );
};

export function PagesPanel() {
    const pageCtl = usePagesController();
    const pageReader = pageCtl.reader();
    const pageWriter = pageCtl.writer();

    const pages = React.useMemo<ReadonlyArray<Page>>(() => pageReader.list(), [pageReader]);
    const selectedPageId = pageReader.getCurrentPageId() ?? pages[0]?.id ?? null;
    const [selectedPageIdForDetails, setSelectedPageIdForDetails] = useState<string | null>(selectedPageId);

    useEffect(() => {
        setSelectedPageIdForDetails(selectedPageId);
    }, [selectedPageId]);

    const onCreate = () => {
        const name = prompt('Page title', 'New Page')?.trim();
        if (!name)
            return;

        const newPageId = pageWriter.addPage(name);
        if (newPageId)
            pageWriter.setCurrentPage(newPageId);
    };

    const onDuplicate = (pid: string) => {
        const id = pageWriter.duplicatePage(pid);
        if (id)
            pageWriter.setCurrentPage(id);
    };

    const onDelete = (pid: string) => {
        if (!confirm('Delete this page?')) return;
        pageWriter.removePage(pid);
    };

    const selectedPage = pages.find((x) => x.id === selectedPageIdForDetails!) ?? null;

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-2 py-2 border-b">
                <div className="text-xs font-semibold text-gray-600">Pages</div>
                <button className="px-2 py-1 text-xs rounded border hover:bg-neutral-50" onClick={onCreate}>+ New</button>
            </div>

            <div className="flex-1 overflow-auto">
                {pages.length === 0 ? (
                    <div className="p-3 text-xs text-gray-400">No pages.</div>
                ) : (
                    pages.map((p) => {
                        const isActive = selectedPageId === p.id;
                        return (
                            <div key={p.id} className={`flex items-center justify-between px-2 py-1 ${isActive ? 'bg-blue-50' : 'hover:bg-neutral-50'}`}>
                                <button
                                    className="text-left text-xs flex-1 py-1"
                                    onClick={() => { pageWriter.setCurrentPage(p.id); setSelectedPageIdForDetails(p.id); }}
                                    aria-pressed={isActive}
                                    title={p.name ?? 'Untitled'}
                                >
                                    <div className="font-medium">{p.name ?? 'Untitled'}</div>
                                    <div className="text-[10px] opacity-60">{p.id}</div>
                                </button>
                                <PageActions page={p} onDuplicate={() => onDuplicate(p.id)} onDelete={() => pages.length > 1 && onDelete(p.id)} />
                            </div>
                        );
                    })
                )}
            </div>

            {/* 상세 편집(선택된 페이지) */}
            <div className="border-t p-2">
                <div className="text-xs font-semibold text-gray-600 mb-1">Details</div>
                {selectedPage ? (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Title</label>
                            <input
                                className="w-full border rounded px-2 py-1 text-xs"
                                value={selectedPage.name ?? ''}
                                onChange={e => pageWriter.updatePageMeta(selectedPage.id, { name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
                            <textarea
                                className="w-full border rounded px-2 py-1 text-sm h-16 resize-none"
                                value={selectedPage.description ?? ''}
                                onChange={e => pageWriter.updatePageMeta(selectedPage.id, { description: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">URL Slug</label>
                            <input
                                className="w-full border rounded px-2 py-1 font-mono text-xs"
                                value={selectedPage.slug ?? ''}
                                onChange={e => pageWriter.updatePageMeta(selectedPage.id, { slug: slugify(e.target.value) })}
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