'use client';

import { useEditorApi, EditorDomain } from '../../engine/EditorApi';
import { useStoreTick } from '../adapters/useStoreTick';
import { makeSmartController } from '../makeSmartController';
import { withLog } from '../adapters/aspect';

export function useLeftPanelController() {
    const { reader: RE, writer: WE } = useEditorApi([
        EditorDomain.Fragment,
        EditorDomain.Assets,
        EditorDomain.Stylesheets,
        EditorDomain.Selectors, // ← ✅ 추가 (레이어 트리/검색 등 조회 전용)
    ]);
    useStoreTick();

    const { reader, writer } = makeSmartController('LeftPanel', RE, WE, {
        wrap: {
            // Node
            addNode: withLog('addNode'),
            removeNode: withLog('removeNode'),
            moveNode: withLog('moveNode'),
            // Pages
            addPage: withLog('addPage'),
            removePage: withLog('removePage'),
            duplicatePage: withLog('duplicatePage'),
            // Components
            addComponent: withLog('addComponent'),
            removeComponent: withLog('removeComponent'),
            // Assets
            addAsset: withLog('addAsset'),
            removeAsset: withLog('removeAsset'),
        },
    }).build();

    return { reader, writer } as const;
}
export default useLeftPanelController;