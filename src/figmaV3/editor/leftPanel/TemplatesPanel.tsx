'use client';
/**
 * TemplatesPanel
 * - Project Templates만 관리/삽입 (Common Components는 Palette에서만 노출 → 중복 제거)
 * - settings.templates에 저장(서버 연동 전까지 로컬)
 * 규약: 훅 최상위, any 금지, 얕은 복사 update()
 */
import React from 'react';
import { listDefinitions, getDefinition } from '../../core/registry';
import { useEditor } from '../useEditor';
import type { CSSDict } from '../../core/types';

type TemplateLite = {
    id: string;
    defId: string;
    title: string;
    props?: Record<string, unknown>;
    styles?: { element?: CSSDict };
};

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <div className="text-[11px] font-semibold text-gray-600 mb-1">{children}</div>;
}

export function TemplatesPanel() {
    const state = useEditor();

    // Base component 목록(새 템플릿 생성에만 사용)
    const defs = listDefinitions();

    // Project Templates
    const templates = (state.settings['templates'] as Record<string, TemplateLite> | undefined) ?? {};

    // 삽입: Template (props/styles 병합)
    const insertTemplate = (tpl: TemplateLite) => {
        const parent = state.ui.selectedId ?? state.project.rootId;
        const nodeId = state.addByDef(tpl.defId, parent);
        if (tpl.props && Object.keys(tpl.props).length) {
            state.updateNodeProps(nodeId, { ...tpl.props });
        }
        if (tpl.styles?.element && Object.keys(tpl.styles.element).length) {
            state.updateNodeStyles(nodeId, { element: { ...tpl.styles.element } });
        }
    };

    // 신규 작성 폼
    const [openNew, setOpenNew] = React.useState(false);
    const [baseDef, setBaseDef] = React.useState<string>('');
    const [title, setTitle] = React.useState<string>('');
    const [captureFromNode, setCaptureFromNode] = React.useState<boolean>(true);

    // 현재 선택 노드에서 props/styles 캡처(컴포넌트 동일 시)
    const captureSnapshot = (): { props?: Record<string, unknown>; styles?: { element?: CSSDict } } => {
        if (!captureFromNode) return {};
        const nid = state.ui.selectedId;
        if (!nid) return {};
        const node = state.project.nodes[nid];
        if (!node) return {};
        if (node.componentId !== baseDef) return {};
        return {
            props: { ...node.props },
            styles: node.styles?.element ? { element: { ...(node.styles.element as CSSDict) } } : undefined,
        };
    };

    // 템플릿 생성
    const createTemplate = () => {
        if (!baseDef) {
            alert('Base component를 선택해 주세요.');
            return;
        }
        const def = getDefinition(baseDef);
        const name = (title || def?.title || baseDef).trim();
        const id = `tpl_${baseDef}_${Date.now().toString(36)}`;

        const snap = captureSnapshot();

        state.update((s) => {
            const prev = (s.settings['templates'] as Record<string, TemplateLite> | undefined) ?? {};
            s.settings = {
                ...s.settings,
                templates: {
                    ...prev,
                    [id]: {
                        id,
                        defId: baseDef,
                        title: name,
                        ...(snap.props ? { props: snap.props } : {}),
                        ...(snap.styles ? { styles: snap.styles } : {}),
                    } as TemplateLite,
                },
            };
        });

        // 폼 리셋
        setOpenNew(false);
        setBaseDef('');
        setTitle('');
    };

    const removeTemplate = (tplId: string) => {
        state.update((s) => {
            const prev = (s.settings['templates'] as Record<string, TemplateLite> | undefined) ?? {};
            const next = { ...prev };
            delete next[tplId];
            s.settings = { ...s.settings, templates: next };
        });
    };

    const renameTemplate = (tplId: string, nextTitle: string) => {
        state.update((s) => {
            const prev = (s.settings['templates'] as Record<string, TemplateLite> | undefined) ?? {};
            const cur = prev[tplId];
            if (!cur) return;
            s.settings = {
                ...s.settings,
                templates: { ...prev, [tplId]: { ...cur, title: nextTitle } },
            };
        });
    };

    return (
        <div className="p-2 text-sm">
            <div className="font-semibold mb-2">Templates</div>

            {/* New Template Form 토글 */}
            <div className="mb-3">
                <button className="text-[12px] border rounded px-2 py-1" onClick={() => setOpenNew((v) => !v)}>
                    {openNew ? 'Close' : '+ New Template'}
                </button>
                {openNew && (
                    <div className="mt-2 border rounded p-2 space-y-2">
                        <div>
                            <SectionTitle>Base Component</SectionTitle>
                            <select
                                className="w-full border rounded px-2 py-1 text-sm bg-white"
                                value={baseDef}
                                onChange={(e) => setBaseDef(e.target.value)}
                            >
                                <option value="">선택...</option>
                                {defs.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.title} ({d.id})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <SectionTitle>Title</SectionTitle>
                            <input
                                className="w-full border rounded px-2 py-1 text-sm"
                                placeholder="Template title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <label className="flex items-center gap-2 text-[12px]">
                            <input
                                type="checkbox"
                                checked={captureFromNode}
                                onChange={(e) => setCaptureFromNode(e.target.checked)}
                            />
                            현재 선택 노드의 props/styles를 캡처(컴포넌트가 동일할 때만)
                        </label>

                        <div className="flex items-center justify-end">
                            <button className="text-[12px] border rounded px-2 py-1" onClick={createTemplate}>
                                Create
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Project Templates 목록 */}
            <SectionTitle>Project Templates</SectionTitle>
            {Object.keys(templates).length === 0 ? (
                <div className="text-[12px] text-gray-500 mb-3">아직 템플릿이 없습니다.</div>
            ) : (
                <div className="mb-3 space-y-2">
                    {Object.values(templates).map((t) => (
                        <div key={t.id} className="border rounded p-2">
                            <div className="flex items-center gap-2">
                                <input
                                    className="flex-1 border rounded px-2 py-1 text-sm"
                                    value={t.title}
                                    onChange={(e) => renameTemplate(t.id, e.target.value)}
                                />
                                <button className="text-[12px] border rounded px-2 py-1" onClick={() => insertTemplate(t)}>
                                    Insert
                                </button>
                                <button className="text-[12px] border rounded px-2 py-1" onClick={() => removeTemplate(t.id)}>
                                    Delete
                                </button>
                            </div>
                            <div className="mt-1 text-[11px] text-gray-500">
                                base: <b>{t.defId}</b>
                                {t.props && Object.keys(t.props).length ? ' · props' : ''}
                                {t.styles?.element && Object.keys(t.styles.element).length ? ' · styles' : ''}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}