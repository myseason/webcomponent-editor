'use client';
import { EditorEngineCore } from '../EditorEngineCore';
import type { Node, NodeId, Page, Project } from '../../core/types';

export function coreDomain() {
    const getProject = (): Project => EditorEngineCore.getState().project;
    const getPages = (): Page[] => getProject().pages ?? [];
    const getCurrentPage = (): Page | null => {
        const ui = EditorEngineCore.getState().ui;
        const pid = ui?.panels?.left?.lastActivePageId;
        return (getProject().pages ?? []).find(p => p.id === pid) ?? null;
    };

    const getNodeById = (id: string) => getProject()?.nodes?.[id];
    const getNode = (id: NodeId | null | undefined): Node | null =>
        id ? (getProject()?.nodes?.[id] ?? null) : null;
    const getNodes = (ids?: NodeId[] | null): Node[] => {
        const map = getProject()?.nodes ?? {};
        return Array.isArray(ids) ? (ids.map(id => map[id]).filter(Boolean) as Node[]) : [];
    };
    const getCurrentNode = (): Node | null => getNode(EditorEngineCore.getState().ui?.selectedId ?? null);

    return {
        // 기본 Reader만 제공 (Writer는 각 도메인에서 제공)
        getProject, getPages, getCurrentPage,
        getNodeById, getNode, getNodes, getCurrentNode,
    } as const;
}