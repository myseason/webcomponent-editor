'use client';
import React from 'react';
import { useEditor } from '../../useEditor';
import { TemplatesPanel } from '../TemplatesPanel';
import { Palette } from '../Palette';
import type { Fragment } from '../../../core/types'; // ✨ [추가] Fragment 타입 import

/**
 * 컴포넌트 개발 모드에서 사용될 패널
 */
function ComponentDevelopmentPanel() {
    const state = useEditor();

    // ✨ [수정] state.project.fragments로 접근
    const { project, openComponentEditor, addFragment, removeFragment } = state;
    const { fragments } = project;

    return (
        <div className="p-2 space-y-2">
            <div className="flex justify-between items-center">
                <div className="text-xs font-semibold text-gray-700">Project Components</div>
                <button onClick={() => addFragment('New Component')} className="text-xs px-2 py-1 border rounded">+ New</button>
            </div>
            <ul className="space-y-1">
                {/* ✨ [수정] f 파라미터에 Fragment 타입 명시 */}
                {fragments.map((f: Fragment) => (
                    <li key={f.id} className="flex items-center gap-2 p-1 hover:bg-gray-50">
                        <button onClick={() => openComponentEditor(f.id)} className="flex-1 text-left text-sm truncate">
                            {f.name}
                        </button>
                        <button onClick={() => removeFragment(f.id)} className="text-xs text-red-500">Delete</button>
                    </li>
                ))}
            </ul>
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