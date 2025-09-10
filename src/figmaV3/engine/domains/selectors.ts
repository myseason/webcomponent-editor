import { EditorCore } from '../EditorCore';
import type { EditorState, CSSDict, NodeId, Page, Fragment } from '../../core/types';

/**
 * selectorsDomain — 순수 Reader
 * - 상태 변경 없음 (writer 비움)
 * - 기존 패턴 유지
 */
export function selectorsDomain() {
    // --- Pure Selector Functions (파일 내부 전용) ---
    const selectOutline = (state: EditorState) => {
        const nodes = state.project.nodes ?? {};
        return Object.values(nodes).map(n => ({
            id: n.id,
            name: (n.props as any)?.__name ?? n.componentId ?? n.id,
        }));
    };

    const selectEffectiveDecl = (state: EditorState, nodeId: string): CSSDict | null => {
        const node = state.project.nodes[nodeId];
        if (!node) return null;

        const el = node.styles?.element ?? {};
        const baseVp = state.ui.canvas.baseViewport;
        const activeVp = state.ui.canvas.activeViewport;
        const mode = state.ui.canvas.vpMode[activeVp];

        const baseDecl = (el as any)[baseVp] ?? {};
        if (mode === 'Independent' && activeVp !== baseVp) {
            const overrideDecl = (el as any)[activeVp] ?? {};
            return { ...baseDecl, ...overrideDecl };
        }
        return { ...baseDecl };
    };

    // 추가: 부모 찾기
    const selectParentId = (state: EditorState, targetId: NodeId): NodeId | null => {
        const nodes = state.project.nodes;
        for (const id in nodes) {
            const n = nodes[id]!;
            if (n.children?.includes(targetId)) return n.id;
        }
        return null;
    };

    // 추가: 서브트리 수집
    const selectSubtreeIds = (state: EditorState, rootId: NodeId): NodeId[] => {
        const nodes = state.project.nodes;
        const acc: NodeId[] = [];
        (function dfs(id: NodeId) {
            if (!nodes[id]) return;
            acc.push(id);
            for (const cid of nodes[id]!.children ?? []) dfs(cid);
        })(rootId);
        return acc;
    };

    // 추가: 현재 편집 프래그먼트
    const selectEditingFragment = (state: EditorState): Fragment | undefined => {
        const fid = state.ui.editingFragmentId;
        return fid ? state.project.fragments.find(f => f.id === fid) : undefined;
    };

    // --- Reader API ---
    const R = {
        /** Layers 패널용 노드 개요 */
        getOutline() {
            return selectOutline(EditorCore.getState());
        },
        /** Inspector용 최종 스타일 */
        getEffectiveDecl(nodeId: string) {
            return selectEffectiveDecl(EditorCore.getState(), nodeId);
        },
        /** 부모 찾기 */
        getParentId(nodeId: NodeId) {
            return selectParentId(EditorCore.getState(), nodeId);
        },
        /** 서브트리 수집 */
        getSubtreeIds(rootId: NodeId) {
            return selectSubtreeIds(EditorCore.getState(), rootId);
        },
        /** 현재 편집 중 프래그먼트 */
        getEditingFragment() {
            return selectEditingFragment(EditorCore.getState());
        },
    };

    // selectors 도메인은 상태를 변경하지 않으므로 writer는 비어있습니다.
    const W = {};

    return { reader: R, writer: W } as const;
}