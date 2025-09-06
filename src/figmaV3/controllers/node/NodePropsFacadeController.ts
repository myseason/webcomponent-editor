'use client';

import { useRef, useSyncExternalStore } from 'react';
import { EditorEngine } from '@/figmaV3/engine/EditorEngine';

/**
 * CommonSection / PropsAutoSection 전용 최소 파사드
 * - View는 기존 useEditor()가 쓰던 필드/함수만 사용
 * - 구독형 + 스냅샷 캐시(getSnapshot 동일 참조)로 즉시 반응 & 경고 없음
 */

type Snap = {
    ui: any;
    project: {
        nodes: Record<string, any>;
        policies?: any;
        rootId?: string;
        inspectorFilters?: Record<string, any>;
    };
    token: string;
};

// 스냅샷 계산 (필요 조각만 추출)
function computeSnap(): Snap {
    const s = EditorEngine.getState() as any;
    const ui = s?.ui ?? {};
    const project = s?.project ?? {};
    const nodes = (project.nodes ?? {}) as Record<string, any>;
    const policies = project.policies ?? undefined;
    const rootId = project.rootId ?? undefined;
    const inspectorFilters = project.inspectorFilters ?? undefined;

    // 경량 토큰: 선택/노드수/버전만
    const token = `${ui?.selectedId ?? ''}|${Object.keys(nodes).length}|${s?.__version__ ?? ''}`;
    return { ui, project: { nodes, policies, rootId, inspectorFilters }, token };
}

export function useNodePropsFacade() {
    // 스냅샷 캐시
    const snapRef = useRef<Snap>(computeSnap());

    // 구독 (변경 시에만 onChange)
    const subscribe = (onChange: () => void) => {
        const unsub = EditorEngine.subscribe(() => {
            const next = computeSnap();
            if (next.token !== snapRef.current.token) {
                snapRef.current = next;
                onChange();
            }
        });
        return () => { if (typeof unsub === 'function') unsub(); };
    };

    // 동일 참조 반환
    const getSnapshot = () => snapRef.current;

    // 구독형 스냅샷
    const { ui, project } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    // Writer: updateNodeProps 호환
    const updateNodeProps = (nodeId: string, patch: Record<string, unknown>) => {
        // 엔진에 domain op 있으면 우선 사용
        const eng: any = EditorEngine as any;
        if (eng?.nodes?.updateNodeProps) {
            eng.nodes.updateNodeProps(nodeId, patch);
            return;
        }
        // 호환: 직접 병합
        EditorEngine.update((draft: any) => {
            const n = draft.project.nodes[nodeId];
            if (!n) return;
            n.props = { ...(n.props ?? {}), ...(patch ?? {}) };
        }, true);
    };

    // Writer: setNotification (있으면 호출, 없으면 no-op 기록)
    const setNotification = (msg: string) => {
        const eng: any = EditorEngine as any;
        if (eng?.ui?.setNotification) {
            eng.ui.setNotification(msg);
            return;
        }
        EditorEngine.update((draft: any) => {
            draft.ui = draft.ui ?? {};
            (draft.ui as any).__lastNotification = msg;
        }, true);
    };

    return {
        ui,
        project,
        updateNodeProps,
        setNotification,
    };
}