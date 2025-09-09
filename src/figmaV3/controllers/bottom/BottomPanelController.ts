'use client';

import {EditorDomain, useEditorApi} from '../../engine/EditorApi';
import {useStoreTick} from '../adapters/useStoreTick';
import {makeSmartController} from '../makeSmartController';
import {withLog} from '../adapters/aspect';

export function useBottomPanelController() {
    const { reader: RE, writer: WE } = useEditorApi([
        EditorDomain.Flow,
        EditorDomain.Data,
        EditorDomain.Actions,
    ]);
    useStoreTick();

    const { reader, writer } = makeSmartController('BottomPanel', RE, WE, {
        wrap: {
            addFlowEdge: withLog('addFlowEdge'),
            updateFlowEdge: withLog('updateFlowEdge'),
            removeFlowEdge: withLog('removeFlowEdge'),

            addDataSource: withLog('addDataSource'),
            updateDataSource: withLog('updateDataSource'),
            removeDataSource: withLog('removeDataSource'),

            addAction: withLog('addAction'),
            updateAction: withLog('updateAction'),
            removeAction: withLog('removeAction'),
        }
    }).build();

    return { reader, writer } as const;
}
export default useBottomPanelController;