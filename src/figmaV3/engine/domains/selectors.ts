import { EditorCore } from '../EditorCore';
import type { EditorState, CSSDict } from '../../core/types';

export function selectorsDomain() {
    // --- Pure Selector Functions ---
    // 이 함수들은 외부에 노출되지 않고 Reader API를 통해 사용됩니다.
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

    // --- Reader ---
    // Controller가 사용할 API입니다.
    const R = {
        /** 프로젝트 노드 개요를 가져옵니다. (for Layers panel) */
        getOutline() {
            return selectOutline(EditorCore.getState());
        },

        /** 특정 노드에 적용된 최종 스타일을 가져옵니다. (for Inspector) */
        getEffectiveDecl(nodeId: string) {
            return selectEffectiveDecl(EditorCore.getState(), nodeId);
        },
    };

    // selectors 도메인은 상태를 변경하지 않으므로 writer는 비어있습니다.
    const W = {};

    return { reader: R, writer: W } as const;
}