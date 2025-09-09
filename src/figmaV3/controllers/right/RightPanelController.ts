'use client';

import type { NodeId } from '../../core/types';
import { useMemo } from 'react';
import { useEditor, EditorDomain } from '../../engine/EditorApi';
import { useStoreTick } from '../adapters/useStoreTick';
import { makeSmartController } from '../makeSmartController';
import { withLog, withCommand } from '../adapters/aspect';

// 히스토리 push (엔진/스토어 구현 쪽에 맞춰 교체 가능)
function pushHistory(cmd: { undo(): void; redo(): void }) {
    try { (window as any).__editor?.history?.push(cmd); } catch {/* noop */}
}

// 확장 리더에 추가되는 메서드 타입
type InspectorTarget = { target : {nodeId: NodeId; componentId: string | null }};
type RightPanelReaderExtras = {
    getInspectorTarget: () => InspectorTarget | null;
    hasTarget: () => boolean;
    getTargetNode: () => any;
};

export function useRightPanelController() {
    // 1) 엔진에서 필요한 도메인만 로드
    const { reader: RE, writer: WE } = useEditor([
        EditorDomain.Policy,
        EditorDomain.Selectors,
    ]);
    // 2) 스토어 틱 바인딩 (리렌더 트리거)
    useStoreTick();

    // 3) writer 래핑 (로그/커맨드 등)
    const { reader: readerBase, writer } = makeSmartController('RightPanel', RE, WE, {
        wrap: {
            updateNodeStyles: (orig) =>
                withLog('updateNodeStyles')(
                    withCommand(
                        'updateNodeStyles',
                        (nodeId, patch, vp) => ({
                            undo() { /* TODO: 이전 스타일 복원 */ },
                            redo() { (orig as any)(nodeId, patch, vp); },
                        }),
                        pushHistory
                    )(orig)
                ),
            updateNodeProps: withLog('updateNodeProps'),
            setNotification: withLog('setNotification'),
            setExpertMode: withLog('setExpertMode'),
        },
    }).build();

    // 4) 확장 리더(= 엔진 리더 + 인스펙터 전용 헬퍼)
    type EngineReader = typeof RE; // ✅ 엔진이 준 reader의 정확한 타입 보존
    type RightPanelReader = EngineReader & RightPanelReaderExtras;

    const reader = useMemo<RightPanelReader>(() => {
        const getInspectorTarget = () => {
            const nodeId: NodeId | null = (readerBase as EngineReader).getCurrentNodeId?.() ?? null;
            if (!nodeId) return null;
            const compId: string | null =
                ((readerBase as EngineReader).getNode?.(nodeId)?.componentId as string | undefined) ?? null;
            return { target : { nodeId: nodeId, componentId: compId }};
        };

        return {
            ...(readerBase as EngineReader), // 🔑 엔진 리더의 모든 함수 유지 (getProject 등 포함)
            getInspectorTarget,
            hasTarget: () => getInspectorTarget() !== null,
            getTargetNode: () => {
                const t = getInspectorTarget();
                return t ? (readerBase as EngineReader).getNode?.(t.target.nodeId) ?? null : null;
            },
        } as RightPanelReader; // 🔒 타입을 “엔진 리더 & 확장”으로 고정
    }, [readerBase]);

    return { reader, writer } as const;
}

export default useRightPanelController;