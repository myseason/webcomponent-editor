'use client';
import React, { useState, useEffect } from 'react';
import { useEditor } from '../../useEditor';
import { TemplatesPanel } from '../TemplatesPanel';
import { Palette } from '../Palette';
import type { Fragment } from '../../../core/types';
import { FilePenLine, Trash2, Check, ExternalLink } from 'lucide-react';

/**
 * ✨ [신규] 개별 컴포넌트 편집 카드 UI
 */
function ComponentEditorCard({ frag }: { frag: Fragment }) {
    const state = useEditor();
    const { updateFragment, removeFragment, openComponentEditor, ui } = state;

    const [name, setName] = useState(frag.name);
    const [description, setDescription] = useState(frag.description ?? '');
    const isEditing = ui.editingFragmentId === frag.id;

    useEffect(() => {
        setName(frag.name);
        setDescription(frag.description ?? '');
    }, [frag]);

    const handleSave = () => {
        updateFragment(frag.id, { name, description });
    };

    return (
        <li className={`border rounded-lg p-3 space-y-2 ${isEditing ? 'border-blue-500 bg-blue-50' : 'bg-white'}`}>
            <div className="flex items-center gap-2">
                <input
                    className="flex-1 text-sm font-semibold bg-transparent focus:bg-white rounded px-1 -mx-1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Component Name"
                />
                <button
                    onClick={handleSave}
                    className="p-1.5 rounded text-gray-500 hover:bg-gray-200"
                    title="Save changes"
                >
                    <Check size={16} />
                </button>
            </div>
            <textarea
                className="w-full text-xs text-gray-600 bg-transparent focus:bg-white rounded px-1 -mx-1 h-12 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Component description..."
            />
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-mono">ID: {frag.id}</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => removeFragment(frag.id)}
                        className="p-1.5 rounded text-red-500 hover:bg-red-100"
                        title="Delete component"
                    >
                        <Trash2 size={14} />
                    </button>
                    <button
                        onClick={() => openComponentEditor(frag.id)}
                        className={`p-1.5 rounded flex items-center gap-1 text-xs px-2 ${isEditing ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                        title="Edit component structure"
                    >
                        <FilePenLine size={14} />
                        <span>Edit</span>
                    </button>
                </div>
            </div>
        </li>
    );
}

/**
 * 컴포넌트 개발 모드에서 사용될 패널
 */
function ComponentDevelopmentPanel() {
    const state = useEditor();
    const { project, addFragment } = state;
    const { fragments } = project;

    return (
        <div className="h-full flex flex-col">
            <div className="p-2 space-y-3 border-b">
                <div className="flex justify-between items-center">
                    <div className="text-xs font-semibold text-gray-700">Project Components</div>
                    <button onClick={() => addFragment('New Component')} className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50">+ New</button>
                </div>
                {fragments.length === 0 ? (
                    <div className="text-xs text-gray-400 py-4 text-center">No components created yet.</div>
                ) : (
                    <ul className="space-y-2 max-h-64 overflow-auto">
                        {fragments.map((f: Fragment) => (
                            <ComponentEditorCard key={f.id} frag={f} />
                        ))}
                    </ul>
                )}
            </div>
            <div className="flex-1 p-2 overflow-auto">
                <div className="text-xs font-semibold text-gray-700 mb-2">Library (Drag to canvas)</div>
                <Palette />
            </div>
        </div>
    );
}

/**
 * 페이지 빌드 모드에서 사용될 패널
 */
function PageBuildPanel() {
    return (
        <div className="p-2 space-y-4">
            <div>
                <div className="text-xs font-semibold text-gray-700 mb-2 px-1">Project Components</div>
                <TemplatesPanel />
            </div>
            <div>
                <div className="text-xs font-semibold text-gray-700 mb-2 px-1">Library</div>
                <Palette />
            </div>
        </div>
    );
}


export function ComponentsPanel() {
    const { ui } = useEditor();

    return ui.mode === 'Component' ? <ComponentDevelopmentPanel /> : <PageBuildPanel />;
}