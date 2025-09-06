'use client';

import { useMemo, useRef, useSyncExternalStore } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';
import type { NodeId } from '../../core/types';
import {
    selectNodeStyles as coreSelectNodeStyles,
    isFlex as coreIsFlex,
} from '../../engine/selectors/styles';

type Snap = {
    ui: any;
    // ✅ 전체 project를 그대로 노출 (pages 등 포함)
    project: any;
    token: string;
};

function computeSnap(): Snap {
    const s = EditorEngine.getState() as any;
    const ui = s?.ui ?? {};
    const project = s?.project ?? {};

    // 스타일/선택/모드 변경을 포착하기 위한 경량 토큰
    const token = [
        ui?.mode ?? '',
        ui?.selectedId ?? '',
        ui?.editingFragmentId ?? '',
        // 노드 수 + 버전 기반 경량 변경 감지
        Object.keys(project?.nodes ?? {}).length,
        s?.__version__ ?? '',
    ].join('|');

    return { ui, project, token };
}

export function useNodeStylesController() {
    const ref = useRef<Snap>(computeSnap());

    const subscribe = (onChange: () => void) => {
        const unsub = EditorEngine.subscribe(() => {
            const next = computeSnap();
            if (next.token !== ref.current.token) {
                ref.current = next;
                onChange();
            }
        });
        return () => { if (typeof unsub === 'function') unsub(); };
    };

    const getSnapshot = () => ref.current;
    const { ui, project } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    /** Writer: 도메인 오퍼레이션 */
    const updateNodeStyles = (nodeId: string, patch: Record<string, unknown>) => {
        const eng: any = EditorEngine as any;
        if (eng?.nodes?.updateNodeStyles) {
            eng.nodes.updateNodeStyles(nodeId, patch);
            return;
        }
        EditorEngine.update((draft: any) => {
            const n = draft.project.nodes[nodeId];
            if (!n) return;
            n.styles = { ...(n.styles ?? {}), ...(patch ?? {}) };
        }, true);
    };

    /** Reader 훅: UI 어댑터 역할(구독 + 엔진 셀렉터 호출 + writer 바인딩) */
    function useStyles(nodeId: NodeId) {
        const styles = useMemo(
            () => coreSelectNodeStyles({ ui, project }, nodeId),
            [ui, project, nodeId]
        );
        const isFlex = useMemo(
            () => coreIsFlex({ ui, project }, nodeId),
            [ui, project, nodeId]
        );

        const setStyle  = (key: string, value: unknown) => updateNodeStyles(nodeId, { [key]: value });
        const setStyles = (patch: Record<string, unknown>) => updateNodeStyles(nodeId, patch);
        const toggleStyle = (key: string, truthy: unknown, falsy: unknown = '') => {
            const cur = styles[key];
            updateNodeStyles(nodeId, { [key]: cur === truthy ? falsy : truthy });
        };
        const removeStyle = (key: string) => updateNodeStyles(nodeId, { [key]: undefined });

        return { styles, isFlex, setStyle, setStyles, toggleStyle, removeStyle };
    }

    /** 현재 Styles 타깃 노드 계산(기존 로직 그대로) */
    const currentTargetNodeId = (): NodeId | null => {
        const mode: string = ui?.mode ?? 'Page';
        if (mode === 'Page') {
            return ((ui?.selectedId as string | undefined) ??
                (project?.rootId as string | undefined) ??
                null) as NodeId | null;
        }
        const fid: string | undefined = ui?.editingFragmentId;
        if (!fid) return null;
        const frag = (project?.fragments ?? []).find((f: any) => f.id === fid);
        return (frag?.rootId as NodeId | undefined) ?? null;
    };

    return {
        ui,
        project,
        reader: { useStyles, currentTargetNodeId },
        writer: { updateNodeStyles },
    };
}