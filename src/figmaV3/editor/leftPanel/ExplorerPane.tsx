'use client';

import React, {JSX} from 'react';
import { useEditor } from '../useEditor';
import { getDefinition } from '../../core/registry';
import type {
    EditorState,
    TemplateDefinition,
    Node,
    NodeId,
    Page,
    ExplorerPreviewSel,
    CSSDict,
} from '../../core/types';
import { ProjectStylesheets } from './ProjectStylesheets';

// --- 유틸리티 함수 ---

function slugify(s: string): string {
    return s.trim().toLowerCase().replace(/[\s_]+/g, '-').slice(0, 64);
}

function genId(prefix: string): string {
    const rand = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${Date.now().toString(36)}${rand}`;
}

function isTemplateDefinition(x: unknown): x is TemplateDefinition {
    return !!x && typeof x === 'object' && 'id' in x && 'baseDefId' in x && 'title' in x;
}

function getTemplates(
    projectTemplates: Record<string, TemplateDefinition> | undefined,
    settingsTemplates: unknown
): TemplateDefinition[] {
    if (projectTemplates) return Object.values(projectTemplates).filter(isTemplateDefinition);
    if (Array.isArray(settingsTemplates)) return settingsTemplates.filter(isTemplateDefinition);
    if (typeof settingsTemplates === 'object' && settingsTemplates !== null) {
        return Object.values(settingsTemplates).filter(isTemplateDefinition);
    }
    return [];
}

function collectSubtreeIds(nodes: Record<NodeId, Node>, rootId: NodeId): Set<NodeId> {
    const ids = new Set<NodeId>();
    const queue: NodeId[] = [rootId];
    while (queue.length > 0) {
        const id = queue.shift()!;
        if (!ids.has(id)) {
            ids.add(id);
            const node = nodes[id];
            if (node?.children) {
                queue.push(...node.children);
            }
        }
    }
    return ids;
}

function cloneSubtree(nodes: Record<NodeId, Node>, srcRootId: NodeId): { nodes: Record<NodeId, Node>; newRootId: NodeId } {
    const newNodes: Record<NodeId, Node> = {};
    const idMap = new Map<NodeId, NodeId>();

    const cloneNode = (id: NodeId): NodeId => {
        if (idMap.has(id)) return idMap.get(id)!;

        const oldNode = nodes[id];
        if (!oldNode) throw new Error(`Node not found: ${id}`);

        const newId = genId('n');
        idMap.set(id, newId);

        const newChildren = oldNode.children?.map(cloneNode) ?? [];

        newNodes[newId] = {
            ...JSON.parse(JSON.stringify(oldNode)), // Deep clone for safety
            id: newId,
            children: newChildren,
        };
        return newId;
    };

    const newRootId = cloneNode(srcRootId);
    return { nodes: newNodes, newRootId };
}


// --- 컴포넌트 ---

export function ExplorerTop(): JSX.Element {
    const state = useEditor();

    const setPreview = (sel: ExplorerPreviewSel) => state.update((s: EditorState) => { s.ui.panels.left.explorerPreview = sel; });
    const openPage = (pageId: string) => state.selectPage(pageId);
    const templates = getTemplates(state.project.templates, state.settings['templates']);

    return (
        <div className="p-2 space-y-3 text-gray-800">
            <div className="text-xs font-semibold text-gray-700 px-2 py-1 border-b bg-gray-50">Project Explorer</div>

            {/* Pages Section */}
            <div>
                <div className="text-[11px] text-gray-500 mb-1 px-1 font-medium">Pages</div>
                <ul className="space-y-1">
                    {state.project.pages.map((p) => (
                        <li key={p.id}>
                            <button
                                type="button"
                                className="w-full text-left px-2 py-1.5 rounded border hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onClick={() => setPreview({ kind: 'page', id: p.id })}
                                onDoubleClick={() => openPage(p.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="truncate text-sm">{p.name}</span>
                                    {p.rootId === state.project.rootId && (
                                        <span className="text-xs text-blue-600 font-semibold ml-2 bg-blue-100 px-2 py-0.5 rounded-full">OPEN</span>
                                    )}
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Components (Templates) Section */}
            <div>
                <div className="text-[11px] text-gray-500 mb-1 px-1 font-medium">Components (Templates)</div>
                {templates.length > 0 ? (
                    <ul className="space-y-1">
                        {templates.map((t) => (
                            <li key={t.id}>
                                <button
                                    type="button"
                                    className="w-full text-left px-2 py-1.5 rounded border hover:border-gray-300 hover:bg-gray-50"
                                    onClick={() => setPreview({ kind: 'component', id: t.id })}
                                >
                                    <span className="truncate text-sm">{t.title}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : <div className="text-xs text-gray-400 px-2 py-1">No project components found.</div>}
            </div>

            <ProjectStylesheets />
        </div>
    );
}

export function ExplorerBottom(): JSX.Element {
    const state = useEditor();
    const preview = state.ui.panels.left.explorerPreview;
    const { addPage, update, setSetting } = state;

    const createPage = () => {
        const newPageId = addPage('Untitled Page');
        setSetting('explorerPreview', { kind: 'page', id: newPageId });
    };

    if (!preview) {
        return (
            <div className="p-3">
                <div className="text-xs text-gray-500 mb-2">Select a page or component to see details.</div>
                <button className="text-sm px-3 py-1.5 border rounded bg-gray-100 hover:bg-gray-200" onClick={createPage}>
                    + New Page
                </button>
            </div>
        );
    }

    if (preview.kind === 'page') {
        const page = state.project.pages.find(p => p.id === preview.id);
        if (!page) return <div className="p-3 text-sm text-red-500">Error: Page not found.</div>;

        const renamePage = (name: string) => update(s => {
            const p = s.project.pages.find(x => x.id === page.id);
            if(p) p.name = name;
        });

        const changeSlug = (slug: string) => update(s => {
            const p = s.project.pages.find(x => x.id === page.id);
            if(p) p.slug = slugify(slug);
        });

        const duplicatePage = () => {
            update(s => {
                const { nodes: clonedNodes, newRootId } = cloneSubtree(s.project.nodes, page.rootId);
                const newPage: Page = {
                    id: genId('pg'),
                    name: `${page.name} Copy`,
                    rootId: newRootId,
                    slug: `${page.slug}-copy`,
                };
                s.project.nodes = { ...s.project.nodes, ...clonedNodes };
                s.project.pages.push(newPage);
                s.ui.panels.left.explorerPreview = { kind: 'page', id: newPage.id };
            });
        };

        const deletePage = () => {
            if (state.project.pages.length <= 1) {
                alert("Cannot delete the last page.");
                return;
            }
            update(s => {
                const idsToDelete = collectSubtreeIds(s.project.nodes, page.rootId);
                s.project.pages = s.project.pages.filter(p => p.id !== page.id);
                idsToDelete.forEach(id => delete s.project.nodes[id]);
                if (s.project.rootId === page.rootId) {
                    s.project.rootId = s.project.pages[0].rootId;
                }
                s.ui.panels.left.explorerPreview = null;
            });
        };

        return (
            <div className="p-3 space-y-4 text-sm">
                <div className="space-x-2">
                    <button className="px-2 py-1 border rounded" onClick={createPage}>New</button>
                    <button className="px-2 py-1 border rounded" onClick={() => state.selectPage(page.id)}>Open</button>
                    <button className="px-2 py-1 border rounded" onClick={duplicatePage}>Duplicate</button>
                    <button className="px-2 py-1 border rounded text-red-600 hover:bg-red-50" onClick={deletePage}>Delete</button>
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Page Name</label>
                    <input className="w-full border rounded px-2 py-1" value={page.name} onChange={e => renamePage(e.target.value)} />
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">URL Slug</label>
                    <input className="w-full border rounded px-2 py-1 font-mono text-xs" value={page.slug} onChange={e => changeSlug(e.target.value)} />
                </div>
            </div>
        );
    }

    const template = getTemplates(state.project.templates, state.settings['templates']).find(t => t.id === preview.id);
    if (!template) return <div className="p-3 text-sm text-red-500">Error: Component not found.</div>;

    return (
        <div className="p-3 space-y-1 text-sm">
            <div className="font-semibold">{template.title}</div>
            <div className="text-xs text-gray-500">ID: <code>{template.id}</code></div>
            <div className="text-xs text-gray-500">Base: <code>{template.baseDefId}</code></div>
        </div>
    );
}

export const ExplorerPane = {
    Top: ExplorerTop,
    Bottom: ExplorerBottom,
};