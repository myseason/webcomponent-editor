'use client';

import React, { useState, useEffect } from 'react';
import { TemplatesPanel } from '../TemplatesPanel';
import { Palette } from '../Palette';
import type { Fragment } from '../../../core/types';
import { Trash2, UploadCloud } from 'lucide-react';
import { useComponentsFacadeController } from '../../../controllers/components/ComponentsFacadeController';

/**
 * ✅ UI/UX는 기준 소스와 동일합니다.
 * - useEditor() → useComponentsFacadeController() 치환만 수행
 * - 마크업/클래스/문구/동작 일치
 */

function ComponentEditorCard({ frag }: { frag: Fragment }) {
    const ctrl = useComponentsFacadeController();
    const R = ctrl.reader();
    const W = ctrl.writer();

    const [name, setName] = useState(frag.name);
    const [description, setDescription] = useState(frag.description ?? '');
    const isEditing = R.editingFragmentId() === frag.id;

    useEffect(() => {
        setName(frag.name);
        setDescription(frag.description ?? '');
    }, [frag]);

    const handleSave = () => {
        if (frag.name !== name || frag.description !== description) {
            W.updateFragment(frag.id, { name, description });
            W.setNotification('Component details auto-saved.');
        }
    };

    const handlePublish = () => {
        if (!isEditing) {
            W.openComponentEditor(frag.id);
        }
        if (window.confirm(`Are you sure you want to publish "${frag.name}" to the shared library? This action cannot be undone.`)) {
            W.publishComponent();
            W.setNotification(`Component "${frag.name}" published to library.`);
        }
    };

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete the component "${frag.name}"? This action cannot be undone.`)) {
            W.removeFragment(frag.id);
        }
    };

    return (
        // ✨ [수정] 카드 내부 상하 간격을 space-y-3에서 space-y-2로 줄였습니다.
        <li className="border rounded-md p-3 space-y-2 bg-white">
            <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">ID: {frag.id}</div>
                <div className="flex items-center gap-2">
                    <button
                        className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50"
                        onClick={() => !isEditing && W.openComponentEditor(frag.id)}
                        title="Open in Component Editor"
                    >
                        Edit
                    </button>
                    <button
                        className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50 flex items-center gap-1"
                        onClick={handlePublish}
                        title="Publish to Shared Library"
                    >
                        <UploadCloud size={14} />
                        Publish
                    </button>
                    <button
                        className="text-xs px-2 py-1 border rounded bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"
                        onClick={handleDelete}
                        title="Delete component"
                    >
                        <Trash2 size={14} />
                        Delete
                    </button>
                </div>
            </div>

            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="w-full text-sm font-semibold border rounded-md px-2 py-1.5"
                placeholder="Component Name"
            />

            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSave}
                placeholder="Component description..."
                className="w-full text-xs border rounded-md px-2 py-1.5 min-h-[60px]"
            />
        </li>
    );
}

function ComponentDevelopmentPanel() {
    const ctrl = useComponentsFacadeController();
    const R = ctrl.reader();
    const W = ctrl.writer();
    const fragments = R.fragments();

    return (
        <div className="h-full flex flex-col">
            <div className="p-2 space-y-3 border-b">
                <div className="flex justify-between items-center px-1">
                    <div className="text-xs font-semibold text-gray-700">Project Components</div>
                    <button
                        onClick={() => W.addFragment('New Component')}
                        className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50"
                    >
                        + New
                    </button>
                </div>

                {fragments.length === 0 ? (
                    <div className="text-xs text-gray-400 py-4 text-center">No components created yet.</div>
                ) : (
                    <ul className="space-y-2 max-h-[40vh] overflow-auto p-1">
                        {fragments.map((f: Fragment) => (
                            <ComponentEditorCard key={f.id} frag={f} />
                        ))}
                    </ul>
                )}
            </div>

            <div className="flex-1 p-2 overflow-auto">
                <div className="text-xs font-semibold text-gray-700 mb-2 px-1">Library (Drag to canvas)</div>
                <Palette />
            </div>
        </div>
    );
}

function PageBuildPanel() {
    return (
        <div className="h-full flex flex-col">
            <div className="p-2 border-b">
                <div className="text-xs font-semibold text-gray-700 mb-2 px-1">Project Components (Private)</div>
                <TemplatesPanel />
            </div>
            <div className="flex-1 p-2 overflow-auto">
                <Palette />
            </div>
        </div>
    );
}

export function ComponentsPanel() {
    const ctrl = useComponentsFacadeController();
    const R = ctrl.reader();
    return R.mode() === 'Component' ? <ComponentDevelopmentPanel /> : <PageBuildPanel />;
}