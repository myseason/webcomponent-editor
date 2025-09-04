'use client';

/**
 * useEditorLike (완전 호환 모드)
 *
 * 목적:
 * - v1.3의 useEditor()가 반환하던 모든 필드/유틸을 그대로 유지
 * - 단, 우리가 컨트롤러로 제공하려는 "쓰기 액션"만 덮어써서 경로를 헥사고날로 유도
 *
 * 적용 방법:
 * - 기존 파일에서 import 한 줄만 교체하면 (useEditor → useEditorLike as useEditor) 그대로 동작
 * - 누락된 유틸이 있으면 아래에서 "base"의 것을 그냥 통과시켜 주므로 깨지지 않음
 * - 점진적으로, 덮어쓸 액션을 늘려 가면서 헥사고날/도메인 서비스 비중을 높이면 됨
 */

import type { NodeId, Viewport, EditorState } from '../../core/types';
import { useInspectorController } from '../InspectorController';
import { useEditor as useEditorV3 } from '../../editor/useEditor';

type Updater = (draft: EditorState) => void;

export function useEditorLike() {
    // 1) v1.3 원본 훅 (모든 기존 필드/유틸 보유)
    const base = useEditorV3();

    // 2) 우리 컨트롤러 (헥사고날 경로)
    const ctl = useInspectorController();

    // --- 덮어쓸(override) 항목들만 정의 ---
    // update: 기본은 base.update 유지. 다만 없을 경우 대비 안전망 제공.
    const update: (fn: Updater) => void =
        typeof base.update === 'function'
            ? base.update
            : (fn) => {
                try {
                    const draft = { ui: { ...base.ui }, project: { ...base.project } } as unknown as EditorState;
                    fn(draft);
                    if ((draft.ui as any)?.expertMode !== base.ui?.expertMode) {
                        ctl.setExpertMode(!!(draft.ui as any)?.expertMode);
                    }
                    // 필요 시 패턴별 분기 추가 가능
                } catch {
                    /* no-op */
                }
            };

    // 쓰기 경로는 컨트롤러로 유도
    const updateNodeProps = (nodeId: NodeId, patch: Record<string, unknown>) =>
        ctl.updateNodeProps(nodeId, patch);

    const updateNodeStyles = (
        nodeId: NodeId,
        patch: Record<string, unknown>,
        viewport?: Viewport
    ) => ctl.updateNodeStyles(nodeId, patch, viewport);

    const setNotification = (msg: string) =>
        (typeof base.setNotification === 'function' ? base.setNotification(msg) : ctl.notify(msg));

    // 읽기 유틸은 base 것 유지(호환성 ↑). 컨트롤러 것도 함께 노출.
    const getEffectiveDecl = base.getEffectiveDecl ?? ctl.getEffectiveDecl;

    // mode/target/viewport는 컨트롤러 기준(정규화)
    const mode = ctl.mode;
    const target = ctl.target;
    const viewport = ctl.viewport;

    // 최종 반환: base를 먼저 펼치고(완전 호환), 컨트롤러 기반 액션만 덮어쓰기
    return {
        ...base,                // ← v1.3 모든 필드/유틸 보존
        // 읽기(컨트롤러 우선 노출)
        mode,
        target,
        viewport,
        getEffectiveDecl,

        // 쓰기(컨트롤러 경로로 덮어쓰기)
        update,
        updateNodeProps,
        updateNodeStyles,
        setNotification,

        // 컨트롤러 전용 액션도 함께 노출(선택적으로 사용할 수 있도록)
        changeTag: ctl.changeTag,
        setExpertMode: ctl.setExpertMode,
        notify: ctl.notify,
    };
}