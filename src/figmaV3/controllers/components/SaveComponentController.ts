'use client';

import { EditorEngine } from '../../engine/EditorEngine';
import { editorStore } from '../../store/editStore';
import type { EditorStoreState } from '../../store/types';
import type { NodeId } from '../../core/types';

/**
 * SaveAsComponent 관련 파사드 컨트롤러
 * - 기존 store action(saveNodeAsComponent)을 우선 사용 (호환)
 * - 알림은 EditorEngine.ui.setNotification으로 통일
 */
export function useSaveComponentController() {
    function save(nodeId: NodeId, name: string, description: string, isPublic: boolean) {
        const S = editorStore.getState() as EditorStoreState & {
            saveNodeAsComponent?: (nid: NodeId, name: string, description: string, isPublic: boolean) => void;
        };
        if (typeof S.saveNodeAsComponent === 'function') {
            S.saveNodeAsComponent(nodeId, name, description, isPublic);
        } else {
            // Fallback (엔진 오퍼레이션 도입 전까지는 store action 의존)
            EditorEngine.update((draft) => {
                // 안전 fallback: 실제 저장 로직 미지원시 no-op
                // (실제 구현은 store slice에 있으므로 보통 이 경로로 오지 않습니다)
            }, true);
        }
    }

    function notify(message: string) {
        EditorEngine.ui.setNotification(message);
    }

    return {
        writer: () => ({ save, notify }),
    };
}