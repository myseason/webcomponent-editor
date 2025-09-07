'use client';

import { useEngine, EngineDomain } from '../../engine/Engine';
import { useStoreTick } from '../adapters/useStoreTick';
import { makeSmartController } from '../makeSmartController';
import { withLog } from '../adapters/aspect';

export function useTopbarController() {
    // Topbar에 필요한 도메인만 주입 — 기본(Core/Pages/Nodes)은 엔진이 이미 포함
    const { reader: RE, writer: WE } = useEngine([
        EngineDomain.UI,
        EngineDomain.Pages,
        EngineDomain.History,
    ]);

    // 리렌더 구독
    useStoreTick();

    // 기본은 전면 노출, 아래 3개만 로깅 래핑 예시
    const { reader, writer } = makeSmartController('Topbar', RE, WE, {
        wrap: {
            setCanvasZoom: withLog('setCanvasZoom'),
            setViewportMode: withLog('setViewportMode'),
            toggleCanvasOrientation: withLog('toggleCanvasOrientation'),
        }
    });

    return { reader, writer } as const;
}
export default useTopbarController;