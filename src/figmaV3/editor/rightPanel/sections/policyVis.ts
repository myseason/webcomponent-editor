'use client';

import type { EditorUI, NodeId, Project } from '@/figmaV3/core/types';
import {
    getAllowedStyleKeysForNode,
    isControlVisibleForNode,
} from '@/figmaV3/runtime/capabilities';

/**
 * 그룹 가시성: 해당 그룹의 대표(메인) 컨트롤 중 하나라도 보이면 true
 * - 메인 키 집합은 패널마다 다를 수 있어, 호출부에서 candidates를 넘기도록 했습니다.
 */
export function getGroupVisibilityByCandidates(
    project: Readonly<Project>,
    ui: Readonly<EditorUI>,
    nodeId: NodeId,
    controlPaths: string[]
): boolean {
    for (const cp of controlPaths) {
        if (isControlVisibleForNode(project, ui, nodeId, cp as any)) return true;
    }
    return false;
}

/** 개별 컨트롤 가시성 */
export function getControlVisibility(
    project: Readonly<Project>,
    ui: Readonly<EditorUI>,
    nodeId: NodeId,
    controlPath: string
): boolean {
    return isControlVisibleForNode(project, ui, nodeId, controlPath as any);
}

/** 허용 키 집합 */
export function getAllowedKeys(
    project: Readonly<Project>,
    ui: Readonly<EditorUI>,
    nodeId: NodeId
): Set<string> {
    return getAllowedStyleKeysForNode(project, nodeId, {
        expertMode: ui?.expertMode,
        withSizeAlias: true,
    });
}