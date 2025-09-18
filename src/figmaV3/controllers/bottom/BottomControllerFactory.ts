'use client';

import * as React from 'react';
import { useEditorApi, EditorDomain } from '../../engine/EditorApi';
import { useStoreTick } from '../adapters/useStoreTick';
import { useRerenderOnWrite } from '@/figmaV3/controllers/adapters/uiRerender';
import {makeSmartController, writerRerenderAspect} from '../makeSmartController';
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
    const { reader: RE, writer: WE } = useEditorApi([
        EditorDomain.Flow,
        EditorDomain.Data,
        EditorDomain.Actions,
        EditorDomain.Selectors,
        EditorDomain.History,
        EditorDomain.Fragment
    ]);
    //useStoreTick();
    useRerenderOnWrite();

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
        //writerAspect: writerRerenderAspect,
        writerWrap: { toggleBottomDock: withLog('toggleBottomDock'), update: withLog('update') },
    });
    return ctl
        .exposeAll()
        //.pickReader('getUI', 'getProject', 'data', 'history', 'getEffectiveDecl', 'flowEdges')
        //.pickWriter('toggleBottomDock', 'update')
        .build();
}

function createFlowsController(RE: any, WE: any) {
    const ctl = makeSmartController('Bottom/Flows', RE, WE, {
        //writerAspect: writerRerenderAspect,
        writerWrap: {
            addFlowEdge: withLog('addFlowEdge'),
            updateFlowEdge: withLog('updateFlowEdge'),
            removeFlowEdge: withLog('removeFlowEdge'),
        },
    });

    return ctl
        .exposeAll()
        //.pickReader('getUI', 'getProject', 'getNodeById', 'flowEdges')
        //.pickWriter('addFlowEdge', 'updateFlowEdge', 'removeFlowEdge')
        .build();
}

function createDataController(RE: any, WE: any) {
    const ctl = makeSmartController('Bottom/Data', RE, WE, {
        //writerAspect: writerRerenderAspect,
        writerWrap: { update: withLog('update') },
    });

    return ctl
        .exposeAll()
        //.pickReader('data')
        //.pickWriter('update')
        .build();
}

function createActionsController(RE: any, WE: any) {
    const ctl = makeSmartController('Bottom/Actions', RE, WE, {
        //writerAspect: writerRerenderAspect,
        writerWrap: {
            setActionSteps: withLog('setActionSteps'),
            runActionSteps: withLog('runActionSteps'),
        },
    });

    return ctl
        //.pickReader('selectedNodeId', 'getActionSteps', 'defaultNavigateTargetId', 'pages')
        //.pickWriter('setActionSteps', 'runActionSteps')
        .exposeAll()
        .build();
}

function createFragmentsController(RE: any, WE: any) {
    const ctl = makeSmartController('Bottom/Fragments', RE, WE, {
        writerWrap: {
            addFragment: withLog('addFragment'),
            removeFragment: withLog('removeFragment'),
            openFragment: withLog('openFragment'),
            closeFragment: withLog('closeFragment'),
        },
    });

    return ctl
        .exposeAll()
        //.pickReader('getUI', 'getProject', 'flowEdges', 'getNodeById', 'data')
        //.pickWriter('addFragment', 'removeFragment', 'openFragment', 'closeFragment', 'update')
        .build();
}