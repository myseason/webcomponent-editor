// src/figmaV3/controllers/hooks.ts
import { useMemo } from 'react';
import { useEditor } from '../editor/useEditor';
import { EditorEngine } from '../engine/EditorEngine';
import { InspectorController } from './InspectorController';
import type { NodeId } from '../core/types';
import { computeInspectorTargetNodeId } from '../engine/selectors/inspector';

export type InspectorVM = {
    target: null | { nodeId: NodeId; componentId: string | null };
};

/**
 * useInspectorViewModel
 * - Top-level에서 useEditor()를 호출하고,
 *   그 state를 주입해 EditorEngine 인스턴스를 생성합니다.
 * - Hook 안에서 Hook을 다시 호출하지 않습니다. (Rules of Hooks 준수)
 */
export function useInspectorViewModel(): InspectorVM {
    // ✅ Hook은 커스텀 훅의 "바깥 레벨"에서 호출
    const editorState = useEditor();

    // POJO 엔진 인스턴스 (Hook 호출 없음)
    const engine = useMemo(() => new EditorEngine(editorState), [editorState]);

    // 최소 스켈레톤: Controller 없이 바로 target 계산 (원하시면 Controller 유지해도 OK)
    const nodeId = computeInspectorTargetNodeId(engine);
    const componentId = nodeId ? engine.getComponentIdOf(nodeId) : null;

    return useMemo<InspectorVM>(() => {
        if (!nodeId) return { target: null };
        return { target: { nodeId, componentId } };
    }, [nodeId, componentId]);
}

/**
 * (선택 사항) Controller 버전을 쓰고 싶다면 아래처럼도 가능
 *
 * export function useInspectorViewModel(): InspectorVM {
 *   const editorState = useEditor();
 *   const engine = useMemo(() => new EditorEngine(editorState), [editorState]);
 *   const controller = useMemo(() => new InspectorController(engine), [engine]);
 *   return controller.computeViewModel();
 * }
 */