'use client';

import React, {useEffect, useState} from 'react';
import {TemplatesPanel} from '../TemplatesPanel';
import {Palette} from '../Palette';
import type {Fragment} from '../../../core/types';
import {Trash2, UploadCloud} from 'lucide-react';

import {LeftDomain, useLeftControllerFactory} from '../../../controllers/left/LeftControllerFactory';

function ComponentEditorCard({ frag }: { frag: Fragment }) {
    const { reader, writer } = useLeftControllerFactory(LeftDomain.Components);

    const ui = reader.getUI();
    const [name, setName] = useState(frag.name);
    const [description, setDescription] = useState(frag.description ?? '');
    const isEditing = ui.editingFragmentId === frag.id;

    const fragments = reader.getProject().fragments ?? [];
    const canDelete = fragments.length > 1; // ✅ 최소 2개부터 삭제 허용

    useEffect(() => {
        setName(frag.name);
        setDescription(frag.description ?? '');
    }, [frag]);

    const handleSave = () => {
        if (frag.name !== name || frag.description !== description) {
            writer.updateFragment(frag.id, { name, description });
            writer.setNotification('Component details auto-saved.');
        }
    };

    const handlePublish = () => {
        if (!isEditing) {
            writer.openComponentEditor(frag.id);
        }
        if (
            window.confirm(
                `Are you sure you want to publish "${frag.name}" to the shared library? This action cannot be undone.`
            )
        ) {
            writer.publishComponent();
            writer.setNotification(`Component "${frag.name}" published to library.`);
        }
    };

    const handleDelete = () => {
        if (
            window.confirm(
                `Are you sure you want to delete the component "${frag.name}"? This action cannot be undone.`
            )
        ) {
            writer.removeFragment(frag.id);
        }
    };

    return (
        // 카드 내부 상하 간격: 기존 의도 유지 (space-y-2)
        <li
            className={`border rounded-lg p-3 space-y-2 cursor-pointer ${
                isEditing ? 'border-blue-500 bg-blue-50' : 'bg-white hover:bg-gray-50'
            }`}
            onClick={() => !isEditing && writer.openComponentEditor(frag.id)}
        >
            <div className="flex items-start justify-between">
                <div className="text-[10px] text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded-full">
                    ID: {frag.id}
                </div>
                {/* ✅ 삭제 버튼: 최소 2개일 때만 노출(또는 disabled) */}
                {canDelete ? (
                <button
                    onClick={handleDelete}
                    className="p-1.5 rounded text-gray-400 hover:bg-red-100 hover:text-red-600"
                    title="Delete component"
                >
                    <Trash2 size={14} />
                </button>
                ) : null}
            </div>

            <div className="space-y-1.5">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    className="w-full text-sm font-semibold border rounded-md px-2 py-1.5"
                    placeholder="Component Name"
                />
                <textarea
                    className="w-full text-xs text-gray-600 border rounded-md px-2 py-1.5 h-16 resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleSave}
                    placeholder="Component description..."
                />
            </div>

            <button
                onClick={handlePublish}
                className="w-full p-2 rounded-md flex items-center justify-center gap-2 text-sm bg-green-600 text-white hover:bg-green-700"
                title="Publish to Shared Library"
            >
                <UploadCloud size={16} />
                <span>Publish to Library</span>
            </button>
        </li>
    );
}

function ComponentDevelopmentPanel() {
    const { reader, writer } = useLeftControllerFactory(LeftDomain.Components);
    const project = reader.getProject();
    const { fragments } = project;

    return (
        <div className="h-full flex flex-col">
            <div className="p-2 space-y-3 border-b">
                <div className="flex justify-between items-center px-1">
                    <div className="text-xs font-semibold text-gray-700">Project Components</div>
                    <button
                        onClick={() => writer.addFragment('New Component')}
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
    const { reader } = useLeftControllerFactory(LeftDomain.Components);
    return reader.getUI().mode === 'Component' ? <ComponentDevelopmentPanel /> : <PageBuildPanel />;
}