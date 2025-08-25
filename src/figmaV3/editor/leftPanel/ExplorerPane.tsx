'use client';
/**
 * ExplorerPane
 * - Top: Project Tree (Pages / Components)
 * - Bottom: 선택 항목 요약 (ui.explorerPreview 사용)
 */
import React from 'react';
import { useEditor } from '../useEditor';
import type { EditorState, ExplorerPreviewSel } from '../../core/types';

export const ExplorerPane = {
    Top() {
        const state = useEditor();

        const setPreview = (sel: ExplorerPreviewSel) =>
            state.update((s: EditorState) => { s.ui = { ...s.ui, explorerPreview: sel }; });

        const openPage = (pageId: string) => {
            state.update((s) => {
                const p = s.project.pages.find((x) => x.id === pageId);
                if (p) s.project = { ...s.project, rootId: p.rootId };
            });
        };

        const openComponentMode = () => {
            state.update((s: EditorState) => { s.ui = { ...s.ui, mode: 'Component' }; });
        };

        // 프로젝트 템플릿: project.templates 우선, 없으면 settings.templates fallback
        const templates = state.project.templates
            ? Object.values(state.project.templates)
            : (state.settings['templates'] ? Object.values(state.settings['templates'] as Record<string, unknown>) : []);

        return (
            <div className="p-2">
                <div className="text-xs font-semibold text-gray-600 mb-1">Project</div>

                {/* Pages */}
                <div className="mb-2">
                    <div className="text-[11px] text-gray-500 mb-1">Pages</div>
                    <div className="space-y-1">
                        {state.project.pages.map((p) => (
                            <div
                                key={p.id}
                                className="px-2 py-1 border rounded text-sm hover:bg-gray-50 cursor-pointer"
                                onClick={() => setPreview({ kind: 'page', id: p.id })}
                                onDoubleClick={() => openPage(p.id)}
                                title="Double-click to open"
                            >
                                {p.name}
                            </div>
                        ))}
                        {state.project.pages.length === 0 && <div className="text-[12px] text-gray-500">No pages</div>}
                    </div>
                </div>

                {/* Components (Project Templates) */}
                <div className="mb-2">
                    <div className="text-[11px] text-gray-500 mb-1">Components</div>
                    <div className="space-y-1">
                        {templates.map((t) => (
                            <div
                                key={String((t as any).id)}
                                className="px-2 py-1 border rounded text-sm hover:bg-gray-50 cursor-pointer"
                                onClick={() => setPreview({ kind: 'component', id: String((t as any).id) })}
                                onDoubleClick={openComponentMode}
                                title="Double-click to open in Component mode"
                            >
                                {String((t as any).title ?? (t as any).id)}
                            </div>
                        ))}
                        {templates.length === 0 && <div className="text-[12px] text-gray-500">No components</div>}
                    </div>
                </div>
            </div>
        );
    },

    Bottom() {
        const state = useEditor();
        const sel = state.ui.explorerPreview;
        if (!sel) return <div className="p-2 text-[12px] text-gray-500">Select a page or component above.</div>;

        if (sel.kind === 'page') {
            const p = state.project.pages.find((x) => x.id === sel.id);
            if (!p) return <div className="p-2 text-[12px] text-gray-500">Page not found.</div>;
            const nodeCount = Object.values(state.project.nodes).length;
            return (
                <div className="p-2 text-sm">
                    <div className="font-semibold mb-1">Page Info</div>
                    <div>ID: {p.id}</div>
                    <div>Name: {p.name}</div>
                    <div>Slug: {p.slug ?? '/'}</div>
                    <div className="text-[12px] text-gray-500 mt-1">Nodes (project total): {nodeCount}</div>
                </div>
            );
        }

        const tpl =
            state.project.templates?.[sel.id] ??
            ((state.settings['templates'] as Record<string, unknown> | undefined)?.[sel.id]);

        if (!tpl) return <div className="p-2 text-[12px] text-gray-500">Component not found.</div>;
        return (
            <div className="p-2 text-sm">
                <div className="font-semibold mb-1">Component Info</div>
                <div>ID: {String((tpl as any).id)}</div>
                <div>Base: {String((tpl as any).defId)}</div>
                <div>Title: {String((tpl as any).title)}</div>
                <div className="text-[12px] text-gray-500 mt-1">
                    {(tpl as any).props ? 'props' : ''} {(tpl as any).styles?.element ? 'styles' : ''}
                </div>
            </div>
        );
    },
};