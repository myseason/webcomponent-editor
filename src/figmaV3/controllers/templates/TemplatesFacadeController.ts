'use client';

import { useMemo, useRef, useSyncExternalStore } from 'react';
import { EditorEngine } from '@/figmaV3/engine/EditorEngine';
import type { Fragment } from '@/figmaV3/core/types';

/**
 * TemplatesFacadeController (구독형)
 * - Reader는 엔진을 구독하여 templates/편집중ID 변경을 반영
 * - getSnapshot 은 캐시(ref)를 반환하여 무한 루프 경고 방지
 */

export interface TemplatesReader {
    templates(): ReadonlyArray<Fragment>;            // isPublic !== true 만
    editingFragmentId(): string | null;
    token(): string;                                 // 경량 리렌더 토큰
}

export interface TemplatesWriter {
    addTemplate(name?: string): string;              // 새 템플릿 추가(비공개)
    renameTemplate(fragmentId: string, name: string): void;
    removeTemplate(fragmentId: string): void;
    insertTemplate(fragmentId: string, parentId?: string): string | null; // 캔버스에 삽입
    openTemplate(fragmentId: string): void;          // 템플릿 편집 화면으로 전환
}

export interface TemplatesFacadeController {
    reader(): TemplatesReader;
    writer(): TemplatesWriter;
}

/* ---------- 스냅샷 계산/비교 ---------- */

type Snap = {
    templates: ReadonlyArray<Fragment>;
    editingFragmentId: string | null;
    token: string;
};

function computeSnap(): Snap {
    const s = EditorEngine.getState() as any;
    const frags: Fragment[] = (s.project?.fragments ?? []) as Fragment[];
    const templates = frags.filter((f) => !f.isPublic);
    const eid = (s.ui?.editingFragmentId ?? null) as string | null;
    const ver = String(s.__version__ ?? '');
    const token = `${templates.length}|${eid ?? ''}|${ver}`;
    return { templates, editingFragmentId: eid, token };
}

function snapEquals(a: Snap, b: Snap) {
    // 가벼운 비교: 길이/편집ID/버전만 사용
    return a.token === b.token;
}

/* ---------- Hook 본체 ---------- */

export function useTemplatesFacadeController(): TemplatesFacadeController {
    // 스냅샷 캐시(ref)
    const snapRef = useRef<Snap>(computeSnap());

    // 구독: 상태 변경 시 스냅샷 갱신, 변경 시에만 notify
    const subscribe = (onChange: () => void) => {
        const unsub = EditorEngine.subscribe(() => {
            const next = computeSnap();
            const curr = snapRef.current;
            if (!snapEquals(curr, next)) {
                snapRef.current = next;
                onChange();
            }
        });
        return () => { if (typeof unsub === 'function') unsub(); };
    };

    const getSnapshot = () => snapRef.current;
    const getServerSnapshot = getSnapshot;

    // 현재 스냅샷 (reactive)
    const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    /* ---------- Reader ---------- */
    const reader = useMemo<TemplatesReader>(() => {
        return {
            templates: () => snap.templates,
            editingFragmentId: () => snap.editingFragmentId,
            token: () => snap.token,
        };
    }, [snap]);

    /* ---------- Writer ---------- */
    const writer = useMemo<TemplatesWriter>(() => {
        return {
            addTemplate(name?: string) {
                let createdId = '';
                EditorEngine.update((draft: any) => {
                    const id = `tmpl_${Math.random().toString(36).slice(2, 8)}`;
                    const rootId = `node_${Math.random().toString(36).slice(2, 8)}`;

                    draft.project.nodes[rootId] = {
                        id: rootId,
                        componentId: 'Box',
                        props: {},
                        styles: {},
                        children: [],
                    };

                    draft.project.fragments = [
                        ...(draft.project.fragments ?? []),
                        { id, name: name?.trim() || 'New Template', rootId, isPublic: false } as Fragment,
                    ];

                    createdId = id;
                }, true);
                return createdId;
            },

            renameTemplate(fragmentId: string, name: string) {
                EditorEngine.update((draft: any) => {
                    draft.project.fragments = (draft.project.fragments ?? []).map((f: Fragment) =>
                        f.id === fragmentId ? { ...f, name } : f
                    );
                }, true);
            },

            removeTemplate(fragmentId: string) {
                EditorEngine.update((draft: any) => {
                    const frag = (draft.project.fragments ?? []).find((f: Fragment) => f.id === fragmentId);
                    if (!frag) return;

                    // 루트 서브트리 삭제
                    const toDelete: string[] = [];
                    (function walk(id: string) {
                        toDelete.push(id);
                        const node = draft.project.nodes[id];
                        for (const cid of node?.children ?? []) walk(cid);
                    })(frag.rootId);
                    toDelete.forEach((nid) => delete draft.project.nodes[nid]);

                    draft.project.fragments = (draft.project.fragments ?? []).filter(
                        (f: Fragment) => f.id !== fragmentId
                    );

                    if (draft.ui.editingFragmentId === fragmentId) {
                        const next = (draft.project.fragments ?? []).find((f: Fragment) => !f.isPublic);
                        draft.ui.editingFragmentId = next?.id ?? null;
                        draft.ui.selectedId = next?.rootId ?? draft.project.rootId ?? null;
                    }
                }, true);
            },

            insertTemplate(fragmentId: string, parentId?: string) {
                let insertedRoot: string | null = null;
                EditorEngine.update((draft: any) => {
                    const project = draft.project;
                    const fragment: Fragment | undefined = project.fragments.find((f: Fragment) => f.id === fragmentId);
                    if (!fragment) return;

                    // 서브트리 복제
                    const cloned: Record<string, any> = {};
                    const clone = (id: string): string => {
                        const nid = `node_${Math.random().toString(36).slice(2, 8)}`;
                        const src = project.nodes[id] ?? { id, children: [] };
                        const kids = (src.children ?? []).map((k: string) => clone(k));
                        cloned[nid] = { ...src, id: nid, children: kids };
                        return nid;
                    };
                    const newRootId = clone(fragment.rootId);
                    project.nodes = { ...project.nodes, ...cloned };

                    // 부모 결정: 전달값 > 선택값 > 루트
                    const desiredParentId: string =
                        (parentId ?? (draft.ui.selectedId as string | null) ?? (project.rootId as string)) as string;

                    const p = project.nodes[desiredParentId] || project.nodes[project.rootId];
                    p.children = (p.children ?? []).slice();
                    p.children.push(newRootId);

                    draft.ui.selectedId = newRootId;
                    insertedRoot = newRootId;
                }, true);
                return insertedRoot;
            },

            openTemplate(fragmentId: string) {
                EditorEngine.update((draft: any) => {
                    const frag = (draft.project.fragments ?? []).find((f: Fragment) => f.id === fragmentId);
                    if (!frag) return;
                    draft.ui.mode = 'Component';  // 템플릿 편집은 컴포넌트 에디터에서
                    draft.ui.editingFragmentId = fragmentId;
                    draft.ui.selectedId = frag.rootId;
                }, true);
            },
        };
    }, []);

    return useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}