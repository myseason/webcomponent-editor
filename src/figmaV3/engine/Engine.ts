'use client';

import type { EditorState, NodeId } from '../core/types';
import { useEditor as useEditorLike } from '../editor/useEditor';

/**
 * Engine: View에 노출하지 않을 내부 파사드.
 * - 현재는 useEditor 를 래핑해서 project/ui/update/notify 만 제공합니다.
 * - 추후 CommandBus/Undo/Policy/Validation/EventBus 추가 시에도 표면은 유지됩니다.
 */
export interface Engine {
    readonly project: EditorState['project'];
    readonly ui: EditorState['ui'];
    /** 상태 변경 (immer draft mutator 패턴과 호환) */
    update(mutator: (draft: any) => void): void;
    /** 사용자 알림 */
    notify(message: string): void;
    /** 선택 편의 (존재 시 사용) */
    selectNode?(id: NodeId): void;
}

export function useEngine(): Engine {
    const s = useEditorLike() as any;

    const update =
        typeof s.update === 'function' ? (fn: (d: any) => void) => s.update(fn) : (_fn: (d: any) => void) => {};

    const notify =
        typeof s.setNotification === 'function' ? (msg: string) => s.setNotification(msg) : (_msg: string) => {};

    const selectNode =
        typeof s.selectNode === 'function' ? (id: NodeId) => s.selectNode(id) : undefined;

    return {
        project: s.project,
        ui: s.ui,
        update,
        notify,
        selectNode,
    };
}