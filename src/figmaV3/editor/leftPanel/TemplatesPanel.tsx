'use client';
/**
 * TemplatesPanel
 * - Project Templates(또는 settings.templates) 관리/삽입
 * - query로 id/title/defId 매칭 필터링
 *
 * 규칙
 * - any 금지
 * - 훅 최상위
 * - 얕은 복사 update()
 */

import React from 'react';
import { listDefinitions, getDefinition } from '../../core/registry';
import { useEditor } from '../useEditor';
import type { CSSDict, EditorState } from '../../core/types';

type TemplateLite = {
    id: string;
    defId: string;
    title: string;
    props?: Record<string, unknown>;
    styles?: { element?: CSSDict };
};

function isTemplateLite(x: unknown): x is TemplateLite {
    if (!x || typeof x !== 'object') return false;
    const o = x as Record<string, unknown>;
    return typeof o.id === 'string' && typeof o.defId === 'string' && typeof o.title === 'string';
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-[11px] text-gray-500 mb-1">{children}</div>
    );
}

export function TemplatesPanel({ query = '' }: { query?: string }) {
    const state = useEditor();

    const defs = listDefinitions();

    const projectTemplates = state.project.templates
        ? Object.values(state.project.templates).map((t) => ({
            id: t.id,
            defId: t.baseDefId,
            title: t.title,
            props: (t.defaults?.props as Record<string, unknown> | undefined) ?? undefined,
            styles: t.defaults?.styles ? { element: t.defaults.styles as CSSDict } : undefined,
        }))
        : [];

    const settingsTemplates = React.useMemo<TemplateLite[]>(() => {
        const raw = state.settings['templates'];
        if (!raw || typeof raw !== 'object') return [];
        if (Array.isArray(raw)) return (raw as unknown[]).filter(isTemplateLite);
        return Object.values(raw as Record<string, unknown>).filter(isTemplateLite);
    }, [state.settings]);

    const templates: TemplateLite[] = (projectTemplates.length ? projectTemplates : settingsTemplates).filter((t) => {
        if (!query.trim()) return true;
        const q = query.trim().toLowerCase();
        return (
            t.id.toLowerCase().includes(q) ||
            t.title.toLowerCase().includes(q) ||
            t.defId.toLowerCase().includes(q)
        );
    });

    const insertTemplate = (tpl: TemplateLite) => {
        const parent = state.ui.selectedId ?? state.project.rootId;
        const nodeId = state.addByDef(tpl.defId, parent);
        if (tpl.props && Object.keys(tpl.props).length) {
            state.updateNodeProps(nodeId, { ...tpl.props });
        }
        if (tpl.styles?.element && Object.keys(tpl.styles.element).length) {
            // ✅ [수정] updateNodeStyles 호출 시 세 번째 인자로 'base' 뷰포트를 전달합니다.
            state.updateNodeStyles(nodeId, { ...tpl.styles.element }, 'base');
        }
    };

    const [openNew, setOpenNew] = React.useState(false);
    const [baseDef, setBaseDef] = React.useState('');
    const [title, setTitle] = React.useState('');
    const [captureFromNode, setCaptureFromNode] = React.useState(true);

    const captureSnapshot = (): { props?: Record<string, unknown>; styles?: { element?: CSSDict } } => {
        if (!captureFromNode) return {};
        const nid = state.ui.selectedId;
        if (!nid) return {};
        const node = state.project.nodes[nid];
        if (!node) return {};
        if (node.componentId !== baseDef) return {};
        // ✅ [수정] 반응형 구조에 맞게 'base' 뷰포트의 스타일을 캡처합니다.
        return {
            props: { ...node.props },
            styles: node.styles?.element?.base ? { element: { ...(node.styles.element.base as CSSDict) } } : undefined,
        };
    };

    const createTemplate = () => {
        if (!baseDef) {
            alert('Base component를 선택해 주세요.');
            return;
        }
        const def = getDefinition(baseDef);
        const name = (title || def?.title || baseDef).trim();
        const id = `tpl_${baseDef}_${Date.now().toString(36)}`;
        const snap = captureSnapshot();

        state.update((s: EditorState) => {
            const prev = (s.settings['templates'] as Record<string, TemplateLite> | undefined) ?? {};
            s.settings['templates'] = {
                ...prev,
                [id]: {
                    id,
                    defId: baseDef,
                    title: name,
                    ...(snap.props ? { props: snap.props } : {}),
                    ...(snap.styles ? { styles: snap.styles } : {}),
                },
            };
        });

        setOpenNew(false);
        setBaseDef('');
        setTitle('');
    };

    const removeTemplate = (tplId: string) => {
        state.update((s: EditorState) => {
            const prev = (s.settings['templates'] as Record<string, TemplateLite> | undefined) ?? {};
            const next = { ...prev };
            delete next[tplId];
            s.settings['templates'] = next;
        });
    };

    const renameTemplate = (tplId: string, nextTitle: string) => {
        state.update((s: EditorState) => {
            const prev = (s.settings['templates'] as Record<string, TemplateLite> | undefined) ?? {};
            const cur = prev[tplId];
            if (!cur) return;
            s.settings['templates'] = {
                ...prev,
                [tplId]: { ...cur, title: nextTitle },
            };
        });
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <SectionTitle>Templates</SectionTitle>
                <button
                    type="button"
                    className="text-[12px] px-2 py-1 border rounded"
                    onClick={() => setOpenNew((v) => !v)}
                >
                    {openNew ? 'Close' : '+ New Template'}
                </button>
            </div>

            {openNew && (
                <div className="border rounded p-2 space-y-2">
                    <div>
                        <div className="text-[12px] text-gray-600 mb-1">Base Component</div>
                        <select
                            className="w-full border rounded px-2 py-1 text-sm bg-white"
                            value={baseDef}
                            onChange={(e) => setBaseDef(e.target.value)}
                        >
                            <option value="">Select...</option>
                            {defs.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.title} ({d.id})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <div className="text-[12px] text-gray-600 mb-1">Title</div>
                        <input
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Template title"
                        />
                    </div>

                    <label className="text-[12px] flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={captureFromNode}
                            onChange={(e) => setCaptureFromNode(e.target.checked)}
                        />
                        Capture props/styles from selected node
                    </label>

                    <div>
                        <button type="button" className="text-[12px] px-2 py-1 border rounded" onClick={createTemplate}>
                            Create
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <SectionTitle>Project Templates</SectionTitle>
                {templates.length === 0 ? (
                    <div className="text-[12px] text-gray-500">No templates</div>
                ) : (
                    <ul className="space-y-1">
                        {templates.map((t) => (
                            <li key={t.id} className="border rounded p-2">
                                <div className="flex items-center justify-between gap-2">
                                    <input
                                        className="flex-1 border rounded px-2 py-1 text-sm"
                                        value={t.title}
                                        onChange={(e) => renameTemplate(t.id, e.target.value)}
                                        title={t.id}
                                    />
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="text-[12px] px-2 py-1 border rounded"
                                            onClick={() => insertTemplate(t)}
                                            title="Insert into current page"
                                        >
                                            Insert
                                        </button>
                                        <button
                                            type="button"
                                            className="text-[12px] px-2 py-1 border rounded text-red-600"
                                            onClick={() => removeTemplate(t.id)}
                                            title="Delete template"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-1 text-[11px] text-gray-500">
                                    base: {t.defId}
                                    {t.props && Object.keys(t.props).length ? ' · props' : ''}
                                    {t.styles?.element && Object.keys(t.styles.element).length ? ' · styles' : ''}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}