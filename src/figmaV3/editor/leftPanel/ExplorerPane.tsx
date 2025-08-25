'use client';
/**
 * ExplorerPane
 * - Top: Pages / Components(Templates) 목록
 * - Bottom: 선택한 Page/Component 요약 + Page 액션(New/Open/Duplicate/Delete) + Name/Slug 편집
 *
 * 규칙:
 *  - any 금지
 *  - 훅은 최상위에서만 호출
 *  - 얕은 복사 업데이트(state.update)
 */

import React, {JSX} from 'react';

import { useEditor } from '../useEditor';
import { getDefinition } from '../../core/registry';
import type {
    EditorState,
    TemplateDefinition,
    Node,
    NodeId,
    Page,
    CSSDict,
} from '../../core/types';

/* ───────────────── 유틸 ───────────────── */

function slugify(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 64);
}

function genId(prefix: string): string {
    // 클라이언트 전용 ID (사용자 액션에서만 호출)
    const rand = Math.random().toString(36).slice(2, 8);
    const ts = Date.now().toString(36);
    return `${prefix}_${ts}${rand}`;
}

/** TemplateDefinition 타입 가드 */
function isTemplateDefinition(x: unknown): x is TemplateDefinition {
    if (!x || typeof x !== 'object') return false;
    const o = x as Record<string, unknown>;
    return typeof o.id === 'string' && typeof o.title === 'string' && typeof o.baseDefId === 'string';
}

/** settings.explorerPreview용 타입/가드 */
type ExplorerPreview = { kind: 'page' | 'component'; id: string };
function isExplorerPreview(x: unknown): x is ExplorerPreview {
    if (!x || typeof x !== 'object') return false;
    const o = x as Record<string, unknown>;
    return (o.kind === 'page' || o.kind === 'component') && typeof o.id === 'string';
}

/** 프로젝트/세팅에서 템플릿 목록 안전 추출 */
function getTemplates(
    projectTemplates: Record<string, TemplateDefinition> | undefined,
    settingsTemplates: unknown
): TemplateDefinition[] {
    if (projectTemplates && typeof projectTemplates === 'object') {
        return Object.values(projectTemplates).filter(isTemplateDefinition);
    }
    if (settingsTemplates && typeof settingsTemplates === 'object') {
        if (Array.isArray(settingsTemplates)) {
            return (settingsTemplates as unknown[]).filter(isTemplateDefinition);
        }
        const vals = Object.values(settingsTemplates as Record<string, unknown>);
        return vals.filter(isTemplateDefinition);
    }
    return [];
}

/** 페이지 루트부터 하위 트리 id 수집 */
function collectSubtreeIds(nodes: Record<NodeId, Node>, rootId: NodeId): Set<NodeId> {
    const seen = new Set<NodeId>();
    const stack: NodeId[] = [rootId];
    while (stack.length) {
        const id = stack.pop() as NodeId;
        if (seen.has(id)) continue;
        seen.add(id);
        const n = nodes[id];
        if (n?.children && n.children.length) {
            for (const cid of n.children) stack.push(cid);
        }
    }
    return seen;
}

/** 하위 트리 깊은 복제(새 id 부여) */
function cloneSubtree(
    nodes: Record<NodeId, Node>,
    srcRoot: NodeId
): { nodes: Record<NodeId, Node>; newRoot: NodeId } {
    const idMap = new Map<NodeId, NodeId>();
    const out: Record<NodeId, Node> = {};
    const queue: NodeId[] = [srcRoot];

    while (queue.length) {
        const oldId = queue.shift() as NodeId;
        const old = nodes[oldId];
        if (!old) continue;

        const newId = idMap.get(oldId) ?? genId('n');
        idMap.set(oldId, newId);

        const newChildren: NodeId[] | undefined =
            old.children && old.children.length
                ? old.children.map((cid) => {
                    const mapped = idMap.get(cid) ?? genId('n');
                    idMap.set(cid, mapped);
                    queue.push(cid);
                    return mapped;
                })
                : undefined;

        out[newId] = {
            id: newId,
            componentId: old.componentId,
            props: { ...old.props },
            styles: { ...old.styles, element: { ...(old.styles?.element as CSSDict) } },
            children: newChildren ? [...newChildren] : undefined,
            locked: old.locked,
        };
    }

    return { nodes: out, newRoot: idMap.get(srcRoot) as NodeId };
}

/* ───────────────── 상단 패널 ───────────────── */

export function ExplorerTop(): JSX.Element {
    const state = useEditor();

    const setPreview = (sel: ExplorerPreview) => state.setSetting('explorerPreview', sel);

    const openPage = (pageId: string) => {
        state.update((s: EditorState) => {
            const p = s.project.pages.find((x) => x.id === pageId);
            if (p) s.project = { ...s.project, rootId: p.rootId };
        });
    };

    const templates = React.useMemo(
        () => getTemplates(state.project.templates, state.settings['templates']),
        [state.project.templates, state.settings]
    );

    return (
        <div className="p-2 space-y-2">
            <div className="text-[12px] font-semibold text-gray-700 px-2 py-1 border-b bg-gray-50">Project</div>

            {/* Pages */}
            <div>
                <div className="text-[11px] text-gray-500 mb-1">Pages</div>
                <ul className="space-y-1">
                    {state.project.pages.map((p) => (
                        <li key={p.id}>
                            <button
                                type="button"
                                className="w-full text-left px-2 py-1 rounded border hover:border-gray-300"
                                onClick={() => setPreview({ kind: 'page', id: p.id })}
                                onDoubleClick={() => openPage(p.id)}
                                title="Double-click to open"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="truncate text-[12px]">{p.name}</span>
                                    {p.rootId === state.project.rootId && (
                                        <span className="text-[10px] text-blue-700 ml-2">OPEN</span>
                                    )}
                                </div>
                                <div className="text-[11px] text-gray-500 truncate">
                                    {p.slug ?? slugify(p.name)}
                                </div>
                            </button>
                        </li>
                    ))}
                    {state.project.pages.length === 0 && (
                        <li className="text-[12px] text-gray-500 px-2 py-1">No pages</li>
                    )}
                </ul>
            </div>

            {/* Components (Templates) */}
            <div>
                <div className="text-[11px] text-gray-500 mb-1">Components</div>
                <ul className="space-y-1">
                    {templates.map((t) => (
                        <li key={t.id}>
                            <button
                                type="button"
                                className="w-full text-left px-2 py-1 rounded border hover:border-gray-300"
                                onClick={() => state.setSetting('explorerPreview', { kind: 'component', id: t.id })}
                                title={t.baseDefId}
                            >
                                <span className="truncate text-[12px]">{t.title}</span>
                            </button>
                        </li>
                    ))}
                    {templates.length === 0 && (
                        <li className="text-[12px] text-gray-500 px-2 py-1">No components</li>
                    )}
                </ul>
            </div>
        </div>
    );
}

/* ───────────────── 하단 패널 ───────────────── */

export function ExplorerBottom(): JSX.Element {
    const state = useEditor();

    // settings에서 읽기(타입 가드)
    const preview = React.useMemo<ExplorerPreview | null>(() => {
        const raw = state.settings['explorerPreview'];
        return isExplorerPreview(raw) ? raw : null;
    }, [state.settings]);

    // 공통 액션: 새 페이지 생성
    const createPage = () => {
        const defId = 'Box';
        const def = getDefinition(defId);
        const rootId = genId('n');

        const rootNode: Node = {
            id: rootId,
            componentId: defId,
            props: { ...(def?.defaults.props ?? {}) },
            styles: { element: { ...(def?.defaults.styles?.element ?? {}) } },
            children: [],
        };

        const pageId = genId('pg');
        const page: Page = { id: pageId, name: 'Untitled Page', rootId, slug: 'untitled' };

        state.update((s: EditorState) => {
            s.project = {
                ...s.project,
                nodes: { ...s.project.nodes, [rootId]: rootNode },
                pages: [...s.project.pages, page],
                rootId,
            };
            s.ui = { ...s.ui, selectedId: rootId };
        });

        state.setSetting('explorerPreview', { kind: 'page', id: pageId });
    };

    if (!preview) {
        return (
            <div className="p-3 text-[12px] text-gray-500">
                Select a page or component above.
                <div className="mt-2">
                    <button type="button" className="text-[12px] px-2 py-1 border rounded" onClick={createPage}>
                        New Page
                    </button>
                </div>
            </div>
        );
    }

    if (preview.kind === 'page') {
        const p = state.project.pages.find((x) => x.id === preview.id);
        if (!p) {
            return (
                <div className="p-3 text-[12px] text-red-600">
                    Page not found.
                    <div className="mt-2">
                        <button type="button" className="text-[12px] px-2 py-1 border rounded" onClick={createPage}>
                            New Page
                        </button>
                    </div>
                </div>
            );
        }

        const openPage = () => {
            state.update((s: EditorState) => {
                s.project = { ...s.project, rootId: p.rootId };
                s.ui = { ...s.ui, selectedId: p.rootId };
            });
        };

        const renamePage = (name: string) => {
            state.update((s: EditorState) => {
                s.project = {
                    ...s.project,
                    pages: s.project.pages.map((x) => (x.id === p.id ? { ...x, name } : x)),
                };
            });
        };

        const changeSlug = (raw: string) => {
            const slug = slugify(raw);
            state.update((s: EditorState) => {
                s.project = {
                    ...s.project,
                    pages: s.project.pages.map((x) => (x.id === p.id ? { ...x, slug } : x)),
                };
            });
        };

        const duplicatePage = () => {
            const { nodes: clonedNodes, newRoot } = cloneSubtree(state.project.nodes, p.rootId);
            const page: Page = {
                id: genId('pg'),
                name: `${p.name} Copy`,
                rootId: newRoot,
                slug: slugify(`${p.slug ?? p.name}-copy`),
            };

            state.update((s: EditorState) => {
                s.project = {
                    ...s.project,
                    nodes: { ...s.project.nodes, ...clonedNodes },
                    pages: [...s.project.pages, page],
                    rootId: newRoot,
                };
                s.ui = { ...s.ui, selectedId: newRoot };
            });

            state.setSetting('explorerPreview', { kind: 'page', id: page.id });
        };

        const deletePage = () => {
            const pages = state.project.pages;
            if (pages.length <= 1) {
                alert('마지막 페이지는 삭제할 수 없습니다.');
                return;
            }
            const ids = collectSubtreeIds(state.project.nodes, p.rootId);
            state.update((s: EditorState) => {
                const nextPages = s.project.pages.filter((x) => x.id !== p.id);
                const nextNodes: Record<NodeId, Node> = {};
                for (const [id, n] of Object.entries(s.project.nodes)) {
                    if (!ids.has(id as NodeId)) nextNodes[id as NodeId] = n as Node;
                }
                const nextRoot = s.project.rootId === p.rootId ? nextPages[0].rootId : s.project.rootId;
                s.project = { ...s.project, pages: nextPages, nodes: nextNodes, rootId: nextRoot };
                s.ui = { ...s.ui, selectedId: nextRoot };
            });

            // 미리보기 교체
            const next = state.project.pages.find((x) => x.id !== p.id) ?? null;
            state.setSetting(
                'explorerPreview',
                next ? { kind: 'page', id: next.id } : null
            );
        };

        return (
            <div className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                    <button type="button" className="text-[12px] px-2 py-1 border rounded" onClick={createPage}>
                        New
                    </button>
                    <button type="button" className="text-[12px] px-2 py-1 border rounded" onClick={openPage}>
                        Open
                    </button>
                    <button type="button" className="text-[12px] px-2 py-1 border rounded" onClick={duplicatePage}>
                        Duplicate
                    </button>
                    <button type="button" className="text-[12px] px-2 py-1 border rounded" onClick={deletePage}>
                        Delete
                    </button>
                </div>

                <div>
                    <div className="text-[12px] text-gray-600 mb-1">Name</div>
                    <input
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={p.name}
                        onChange={(e) => renamePage(e.target.value)}
                        placeholder="Page name"
                    />
                </div>

                <div>
                    <div className="text-[12px] text-gray-600 mb-1">Slug</div>
                    <input
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={p.slug ?? ''}
                        onChange={(e) => changeSlug(e.target.value)}
                        placeholder="page-slug"
                    />
                </div>

                <div className="text-[11px] text-gray-500">
                    rootId: <code>{p.rootId}</code>
                </div>
            </div>
        );
    }

    // component preview
    const t =
        (state.project.templates && state.project.templates[preview.id]) ||
        ((): TemplateDefinition | null => {
            const raw = state.settings['templates'];
            if (!raw || typeof raw !== 'object') return null;
            if (Array.isArray(raw)) {
                const arr = (raw as unknown[]).filter(isTemplateDefinition);
                return arr.find((x) => x.id === preview.id) ?? null;
            }
            const rec = Object.values(raw as Record<string, unknown>).filter(isTemplateDefinition);
            return rec.find((x) => x.id === preview.id) ?? null;
        })();

    if (!t) {
        return <div className="p-3 text-[12px] text-red-600">Component not found.</div>;
    }

    return (
        <div className="p-3 space-y-1">
            <div className="text-[12px] font-semibold text-gray-700">Component Info</div>
            <div className="text-[12px]">ID: <code>{t.id}</code></div>
            <div className="text-[12px]">Base: {t.baseDefId}</div>
            <div className="text-[12px]">Title: {t.title}</div>
            <div className="text-[12px]">{t.defaults?.props ? 'props' : ''} {t.defaults?.styles ? 'styles' : ''}</div>
        </div>
    );
}

/** 네임스페이스 재노출: <ExplorerPane.Top /> / <ExplorerPane.Bottom /> */
export const ExplorerPane = {
    Top: ExplorerTop,
    Bottom: ExplorerBottom,
};