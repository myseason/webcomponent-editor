'use client';

import { useRef, useSyncExternalStore } from 'react';
import { EditorEngine } from '@/figmaV3/engine/EditorEngine';
import type { EditorMode } from '@/figmaV3/core/types';

/**
 * LeftSidebar 전용 파사드 (구독형, 스냅샷 캐시)
 * - getSnapshot 은 항상 캐시된 동일 참조를 반환해야 함
 * - 스냅샷 갱신은 subscribe 경로에서만 수행
 */

type UIShape = {
    mode: EditorMode | any;
    panels: {
        left: {
            activeHubTab: string;
            isSplit: boolean;
            splitPercentage: number;
        };
    };
};

const DEFAULTS: UIShape = {
    mode: 'Page',
    panels: {
        left: {
            activeHubTab: 'Pages',
            isSplit: false,
            splitPercentage: 50,
        },
    },
};

// 현재 엔진 상태로부터 UIShape "값"을 계산 (참조는 여기서 만들지만,
// 실제 getSnapshot 은 항상 캐시(ref)를 반환한다)
function computeUISnapshot(): UIShape {
    const s = EditorEngine.getState() as any;
    const left = s?.ui?.panels?.left ?? {};
    return {
        mode: (s?.ui?.mode as EditorMode) ?? DEFAULTS.mode,
        panels: {
            left: {
                activeHubTab: (left.activeHubTab as string) ?? DEFAULTS.panels.left.activeHubTab,
                isSplit: !!left.isSplit,
                splitPercentage:
                    typeof left.splitPercentage === 'number'
                        ? left.splitPercentage
                        : DEFAULTS.panels.left.splitPercentage,
            },
        },
    };
}

// 가벼운 동등성 비교 (필요한 필드만 비교)
function equalUI(a: UIShape, b: UIShape): boolean {
    return (
        a.mode === b.mode &&
        a.panels.left.activeHubTab === b.panels.left.activeHubTab &&
        a.panels.left.isSplit === b.panels.left.isSplit &&
        a.panels.left.splitPercentage === b.panels.left.splitPercentage
    );
}

export function useLeftSidebarFacade() {
    // 스냅샷 캐시
    const snapRef = useRef<UIShape>(computeUISnapshot());

    // 구독: 엔진 상태가 바뀔 때만 스냅샷 재계산 + 변경 시에만 onStoreChange 호출
    const subscribe = (onStoreChange: () => void) => {
        const unsub = EditorEngine.subscribe(() => {
            const next = computeUISnapshot();
            const curr = snapRef.current;
            if (!equalUI(curr, next)) {
                snapRef.current = next;
                onStoreChange();
            }
        });
        return () => {
            if (typeof unsub === 'function') unsub();
        };
    };

    // getSnapshot: 항상 "캐시된 동일 참조"를 반환
    const getSnapshot = () => snapRef.current;

    // SSR fallback도 동일
    const getServerSnapshot = getSnapshot;

    // 구독형 스냅샷
    const ui = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    // ---- Writer 들: 이름/시그니처는 기준 LeftSidebar.tsx와 동일 ----

    const setEditorMode = (newMode: EditorMode) => {
        const eng: any = EditorEngine as any;
        if (eng?.ui?.setEditorMode) {
            eng.ui.setEditorMode(newMode);
            return;
        }
        EditorEngine.update((draft: any) => {
            draft.ui = draft.ui ?? {};
            draft.ui.mode = newMode;
        }, true);
    };

    const setActiveHubTab = (tab: string) => {
        const eng: any = EditorEngine as any;
        if (eng?.ui?.setActiveHubTab) {
            eng.ui.setActiveHubTab(tab);
            return;
        }
        EditorEngine.update((draft: any) => {
            draft.ui = draft.ui ?? {};
            draft.ui.panels = draft.ui.panels ?? {};
            draft.ui.panels.left = draft.ui.panels.left ?? {};
            draft.ui.panels.left.activeHubTab = tab;
        }, true);
    };

    const setNotification = (message: string) => {
        const eng: any = EditorEngine as any;
        if (eng?.ui?.setNotification) {
            eng.ui.setNotification(message);
            return;
        }
        // 호환: 간단 기록(실제 토스트 시스템이 있으면 그 API로 대체)
        EditorEngine.update((draft: any) => {
            draft.ui = draft.ui ?? {};
            (draft.ui as any).__lastNotification = message;
        }, true);
    };

    const toggleLeftPanelSplit = () => {
        const s = EditorEngine.getState() as any;
        const prev = !!s?.ui?.panels?.left?.isSplit;
        const eng: any = EditorEngine as any;
        if (eng?.ui?.setLeftPanelSplit) {
            eng.ui.setLeftPanelSplit(!prev);
            return;
        }
        EditorEngine.update((draft: any) => {
            draft.ui = draft.ui ?? {};
            draft.ui.panels = draft.ui.panels ?? {};
            draft.ui.panels.left = draft.ui.panels.left ?? {};
            draft.ui.panels.left.isSplit = !prev;
        }, true);
    };

    const setLeftPanelSplitPercentage = (pct: number) => {
        const clamped = Math.max(20, Math.min(80, Math.floor(pct)));
        const eng: any = EditorEngine as any;
        if (eng?.ui?.setLeftPanelSplitPercentage) {
            eng.ui.setLeftPanelSplitPercentage(clamped);
            return;
        }
        EditorEngine.update((draft: any) => {
            draft.ui = draft.ui ?? {};
            draft.ui.panels = draft.ui.panels ?? {};
            draft.ui.panels.left = draft.ui.panels.left ?? {};
            draft.ui.panels.left.splitPercentage = clamped;
        }, true);
    };

    // LeftSidebar가 기대하는 동일 모양으로 반환
    return {
        ui,
        setEditorMode,
        setActiveHubTab,
        setNotification,
        toggleLeftPanelSplit,
        setLeftPanelSplitPercentage,
    };
}