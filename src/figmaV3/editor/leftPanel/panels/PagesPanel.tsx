'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { EditorState, Page } from '../../../core/types';
import { Copy, MoreHorizontal, Trash2 } from 'lucide-react';

import {LeftDomain, useLeftControllerFactory} from '../../../controllers/left/LeftControllerFactory';

function slugify(s: string): string {
    return s.trim().toLowerCase().replace(/[\s_]+/g, '-').slice(0, 64);
}

/**
 * ✨ [신규] 페이지 액션 메뉴 컴포넌트
 */
const PageActions = ({
                         page,
                         onDuplicate,
                         onDelete,
                     }: {
    page: Page;
    onDuplicate: () => void;
    onDelete: () => void;
}) => {
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
            <button onClick={() => setIsOpen(!isOpen)} className="p-1 rounded-md hover:bg-gray-200">
                <MoreHorizontal size={16} />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-white border rounded-md shadow-lg z-10">
                    <ul className="text-xs">
                        <li>
                            <button
                                onClick={() => {
                                    onDuplicate();
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
                            >
                                <Copy size={14} /> Duplicate
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => {
                                    onDelete();
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 text-red-600 flex items-center gap-2"
                            >
                                <Trash2 size={14} /> Delete
                            </button>
                        </li>
                        {/* 향후 'Save as Template' 기능 추가 위치 */}
                    </ul>
                </div>
            )}
        </div>
    );
};

export function PagesPanel() {
    const { reader, writer } = useLeftControllerFactory(LeftDomain.Pages);

    const project = reader.getProject();
    const [selectedPageIdForDetails, setSelectedPageIdForDetails] = useState<string | null>(
        project.pages.find((p: Page) => p.rootId === project.rootId)?.id ?? project.pages[0]?.id ?? null
    );

    useEffect(() => {
        const currentPage = project.pages.find((p: Page) => p.rootId === project.rootId);
        if (currentPage) {
            setSelectedPageIdForDetails(currentPage.id);
        }
    }, [project.rootId, project.pages]);

    const ui = reader.getUI();
    if (ui.mode !== 'Page') {
        return <div className="p-4 text-sm text-gray-500">Page management is available in Page Build Mode.</div>;
    }

    const selectedPage = project.pages.find((p: Page) => p.id === selectedPageIdForDetails);

    const createPage = () => {
        const newPageId = writer.addPage('Untitled Page');
        writer.selectPage(newPageId);
    };

    return (
        <div className="h-full flex flex-col">
            {/* 상단: 페이지 목록 */}
            <div className="flex-1 overflow-auto p-2">
                <div className="text-xs font-semibold text-gray-700 px-2 py-1">Pages</div>
                <ul className="space-y-1 mt-2">
                    {project.pages.map((p: Page) => (
                        <li key={p.id}>
                            <div
                                onClick={() => {
                                    writer.selectPage(p.id);
                                    setSelectedPageIdForDetails(p.id);
                                }}
                                className={`w-full flex items-center justify-between px-2 py-1.5 rounded border text-sm cursor-pointer ${
                                    selectedPageIdForDetails === p.id ? 'bg-blue-50 border-blue-400' : 'hover:bg-gray-50'
                                }`}
                            >
                                <span className="truncate">{p.name}</span>
                                <div className="flex items-center gap-2">
                                    {p.rootId === project.rootId && (
                                        <span className="text-xs text-blue-600 font-semibold bg-blue-100 px-2 py-0.5 rounded-full">
                                            OPEN
                                        </span>
                                    )}
                                    <PageActions
                                        page={p}
                                        onDuplicate={() => writer.duplicatePage(p.id)}
                                        onDelete={() => project.pages.length > 1 && writer.removePage(p.id)}
                                    />
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* 하단: 페이지 상세 정보 및 생성 */}
            <div className="border-t p-2 space-y-3">
                <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-700 px-1">Create New Page</div>
                    <div className="flex gap-2">
                        {/* 향후 페이지 템플릿 목록이 이곳에 채워집니다. */}
                        <select className="flex-1 border rounded px-2 py-1 text-sm bg-white">
                            <option value="blank">Blank Page</option>
                        </select>
                        <button
                            className="text-xs px-3 py-1 border rounded bg-blue-600 text-white hover:bg-blue-700"
                            onClick={createPage}
                        >
                            + Create
                        </button>
                    </div>
                </div>

                <div className="border-t pt-3 space-y-2">
                    {/* <div className="text-xs font-semibold text-gray-700 px-1">Page Details</div> */}
                    {selectedPage ? (
                        <div className="space-y-2">
                            <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">Page Name</label>
                                <input
                                    className="w-full border rounded px-2 py-1 text-sm"
                                    value={selectedPage.name}
                                    onChange={(e) =>
                                        writer.update((s: EditorState) => {
                                            s.project.pages.find((p: Page) => p.id === selectedPageIdForDetails)!.name =
                                                e.target.value;
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
                                <textarea
                                    className="w-full border rounded px-2 py-1 text-sm h-16 resize-none"
                                    value={selectedPage.description ?? ''}
                                    onChange={(e) =>
                                        writer.update((s: EditorState) => {
                                            s.project.pages.find((p: Page) => p.id === selectedPageIdForDetails)!.description =
                                                e.target.value;
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">URL Slug</label>
                                <input
                                    className="w-full border rounded px-2 py-1 font-mono text-xs"
                                    value={selectedPage.slug ?? ''}
                                    onChange={(e) =>
                                        writer.update((s: EditorState) => {
                                            s.project.pages.find((p: Page) => p.id === selectedPageIdForDetails)!.slug =
                                                slugify(e.target.value);
                                        })
                                    }
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-gray-400 pt-2">Select a page to see its details.</div>
                    )}
                </div>
            </div>
        </div>
    );
}