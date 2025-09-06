'use client';

import { useMemo } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';
import { listDefinitions } from '../../core/registry';
import type { ComponentDefinition, Fragment, NodeId } from '../../core/types';
import { buildNodeWithDefaults, chooseValidParentId, cloneSubtree, collectSubtreeIds } from '../../store/utils';

/**
 * Palette 전용 컨트롤러
 * - View(UI)는 오직 본 컨트롤러의 reader()/writer()에만 의존
 * - EditorEngine 파사드 우선 사용, 부재 기능은 호환 경로로 구현
 *
 * 기준 Palette.tsx가 사용하던 값/함수들을 동일 의미로 제공:
 *   Reader:
 *     - coreDefs(): ComponentDefinition[]
 *     - sharedComponents(): Fragment[] (isPublic=true)
 *     - selectedId(): NodeId | null
 *     - rootId(): NodeId
 *     - isAdmin(): boolean        // 현재는 임시 플래그(기준 useEditor와 동일 동작)
 *
 *   Writer:
 *     - addByDef(defId: string, parentId?: NodeId): NodeId
 *     - insertComponent(fragmentId: string, parentId?: NodeId): NodeId | null
 *     - removeFragment(fragmentId: string): void
 */

export interface LibraryReader {
    coreDefs(): ReadonlyArray<ComponentDefinition>;
    sharedComponents(): ReadonlyArray<Fragment>;
    selectedId(): NodeId | null;
    rootId(): NodeId;
    isAdmin(): boolean;
}

export interface LibraryWriter {
    addByDef(defId: string, parentId?: NodeId): NodeId;
    insertComponent(fragmentId: string, parentId?: NodeId): NodeId | null;
    removeFragment(fragmentId: string): void;
}

export interface LibraryController {
    reader(): LibraryReader;
    writer(): LibraryWriter;
}

/* =========================
 * Reader 구현
 * ========================= */
function buildReader(): LibraryReader {
    return {
        coreDefs() {
            // SSOT: core/registry 의 등록 목록
            return listDefinitions();
        },
        sharedComponents() {
            const s = EditorEngine.getState() as any;
            const frags: Fragment[] = (s?.project?.fragments ?? []) as Fragment[];
            return frags.filter((f) => !!f.isPublic);
        },
        selectedId() {
            return EditorEngine.nodes.getSelectedNodeId();
        },
        rootId() {
            const s = EditorEngine.getState() as any;
            return s?.project?.rootId as NodeId;
        },
        isAdmin() {
            // 기준 useEditor.ts의 MOCK_USER.isAdmin 과 동일 동작(추후 인증 연동시 대체)
            return true;
        },
    };
}

/* =========================
 * Writer 구현
 * ========================= */
function buildWriter(): LibraryWriter {
    return {
        addByDef(defId, parentId) {
            // Engine 파사드에 addByDef가 없으므로, 호환 경로로 안전 구현
            let createdId: NodeId = '' as NodeId;
            EditorEngine.update((draft: any) => {
                const project = draft.project;
                const desiredParentId: NodeId = (parentId ??
                    (draft.ui.selectedId as NodeId | null) ??
                    (project.rootId as NodeId)) as NodeId;

                const finalParentId: NodeId = chooseValidParentId(project, desiredParentId);
                const newId: NodeId = (project.nodes && 'node_' + Math.random().toString(36).slice(2, 8)) as NodeId;

                // 노드 생성 (defaults 반영)
                project.nodes[newId] = buildNodeWithDefaults(defId, newId);
                // 부모 children에 삽입
                const parent = project.nodes[finalParentId]!;
                parent.children = (parent.children ?? []).slice();
                parent.children.push(newId);
                // 선택 갱신
                draft.ui.selectedId = newId;
                createdId = newId;
            }, true);
            return createdId;
        },

        insertComponent(fragmentId, parentId) {
            let insertedRoot: NodeId | null = null;
            EditorEngine.update((draft: any) => {
                const project = draft.project;
                const fragment: Fragment | undefined = project.fragments.find((f: Fragment) => f.id === fragmentId);
                if (!fragment) return;

                const { nodes: cloned, newRootId } = cloneSubtree(project.nodes, fragment.rootId);
                // 병합
                project.nodes = { ...project.nodes, ...cloned };

                const desiredParentId: NodeId = (parentId ??
                    (draft.ui.selectedId as NodeId | null) ??
                    (project.rootId as NodeId)) as NodeId;

                const finalParentId: NodeId = chooseValidParentId(project, desiredParentId);
                const parent = project.nodes[finalParentId]!;
                parent.children = (parent.children ?? []).slice();
                parent.children.push(newRootId);

                draft.ui.selectedId = newRootId;
                insertedRoot = newRootId;
            }, true);
            return insertedRoot;
        },

        removeFragment(fragmentId) {
            // fragmentSlice.removeFragment 와 동일 의미
            EditorEngine.update((draft: any) => {
                const frag: Fragment | undefined = draft.project.fragments.find((f: Fragment) => f.id === fragmentId);
                if (!frag) return;

                const toDel = collectSubtreeIds(draft.project.nodes, frag.rootId);
                const nextNodes = { ...draft.project.nodes };
                toDel.forEach((nid) => delete nextNodes[nid]);
                draft.project.nodes = nextNodes;

                draft.project.fragments = draft.project.fragments.filter((f: Fragment) => f.id !== fragmentId);

                if (draft.ui.editingFragmentId === fragmentId) {
                    const next = draft.project.fragments[0];
                    draft.ui.editingFragmentId = next?.id ?? null;
                    draft.ui.selectedId = next?.rootId ?? draft.project.rootId ?? null;
                }
            }, true);
        },
    };
}

/* =========================
 * 엔트리
 * ========================= */
export function useLibraryController(): LibraryController {
    const R = useMemo(() => buildReader(), []);
    const W = useMemo(() => buildWriter(), []);
    return useMemo(() => ({ reader: () => R, writer: () => W }), [R, W]);
}