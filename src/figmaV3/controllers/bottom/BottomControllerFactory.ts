'use client';

import * as React from 'react';
import { useEngine, EngineDomain } from '../../engine/Engine';
import { useStoreTick } from '../adapters/useStoreTick';
import { makeSmartController } from '../makeSmartController';
import { withLog } from '../adapters/aspect';

export enum BottomDomain {
    Dock = 'Dock',
    Flows = 'Flows',
    Data = 'Data',
    Actions = 'Actions',
    Fragments = 'Fragments',
}

/** 단 하나의 훅만 노출 */
export function useBottomControllerFactory(domain?: BottomDomain): { reader: any; writer: any } {
    const { reader: RE, writer: WE } = useEngine([
        EngineDomain.Flow,
        EngineDomain.Data,
        EngineDomain.Actions,
        EngineDomain.Selectors,
        EngineDomain.History,
    ]);
    useStoreTick();

    return React.useMemo(() => {
        switch (domain) {
            case BottomDomain.Flows:     return createFlowsController(RE, WE);
            case BottomDomain.Data:      return createDataController(RE, WE);
            case BottomDomain.Actions:   return createActionsController(RE, WE);
            case BottomDomain.Fragments: return createFragmentsController(RE, WE);
            case BottomDomain.Dock:
            default:                     return createDockController(RE, WE);
        }
    }, [domain, RE, WE]);
}

/* ───────── 내부 구현 숨김 ───────── */

function createDockController(RE: any, WE: any) {
    const ctl = makeSmartController('Bottom/Dock', RE, WE, {
        wrap: { toggleBottomDock: withLog('toggleBottomDock'), update: withLog('update') },
    });

    return ctl
        .pickReader('getUI', 'getProject', 'data', 'history', 'getEffectiveDecl', 'flowEdges')
        .pickWriter('toggleBottomDock', 'update')
        .build();
}

function createFlowsController(RE: any, WE: any) {
    const ctl = makeSmartController('Bottom/Flows', RE, WE, {
        wrap: {
            addFlowEdge: withLog('addFlowEdge'),
            updateFlowEdge: withLog('updateFlowEdge'),
            removeFlowEdge: withLog('removeFlowEdge'),
        },
    });

    return ctl
        .pickReader('getUI', 'getProject', 'getNodeById', 'flowEdges')
        .pickWriter('addFlowEdge', 'updateFlowEdge', 'removeFlowEdge')
        .build();
}

function createDataController(RE: any, WE: any) {
    const ctl = makeSmartController('Bottom/Data', RE, WE, {
        wrap: { update: withLog('update') },
    });

    return ctl
        .pickReader('data')
        .pickWriter('update')
        .build();
}

function createActionsController(RE: any, WE: any) {
    const ctl = makeSmartController('Bottom/Actions', RE, WE, {
        wrap: {
            setActionSteps: withLog('setActionSteps'),
            runActionSteps: withLog('runActionSteps'),
        },
    });

    return ctl
        .pickReader('selectedNodeId', 'getActionSteps', 'defaultNavigateTargetId', 'pages')
        .pickWriter('setActionSteps', 'runActionSteps')
        .build();
}

function createFragmentsController(RE: any, WE: any) {
    const ctl = makeSmartController('Bottom/Fragments', RE, WE, {
        wrap: {
            addFragment: withLog('addFragment'),
            removeFragment: withLog('removeFragment'),
            openFragment: withLog('openFragment'),
            closeFragment: withLog('closeFragment'),
        },
    });

    return ctl
        .pickReader('getUI', 'getProject', 'flowEdges', 'getNodeById', 'data')
        .pickWriter('addFragment', 'removeFragment', 'openFragment', 'closeFragment', 'update')
        .build();
}