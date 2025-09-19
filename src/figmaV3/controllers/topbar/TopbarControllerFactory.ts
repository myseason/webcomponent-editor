'use client';
import * as React from 'react';
import {EditorDomain, useEditorApi} from '../../engine/EditorApi';
import { useStoreTick } from '../adapters/useStoreTick';
import {makeSmartController, writerRerenderAspect} from '../makeSmartController';
import { withLog } from '../adapters/aspect';

import { useRerenderOnWrite } from '@/figmaV3/controllers/adapters/uiRerender';

export enum TopbarDomain {
    Topbar = 'Topbar',
}

/** 단 하나의 훅만 노출 */
export function useTopbarControllerFactory(domain?: TopbarDomain): { reader: any; writer: any } {
    // History + Nodes + Pages 도메인 동시 사용 (undo/redo/duplicate/group/ungroup/selectPage 등)
    const { reader: RE, writer: WE } = useEditorApi([EditorDomain.History]);
    //useStoreTick();
    useRerenderOnWrite();

    return React.useMemo(() => {
        switch (domain) {
            case TopbarDomain.Topbar:
            default:
                return createTopbarController(RE, WE);
        }
    }, [domain, RE, WE]);
}

/* ───────── 내부 구현 숨김 ───────── */
function createTopbarController(RE: any, WE: any) {
    const ctl = makeSmartController('Topbar', RE, WE, {
        writerWrap: {
            setEditorMode: withLog('setEditorMode'),
            selectPage: withLog('selectPage'),
            setNotification: withLog('setNotification'),

            // 추가: 핵심 편집 액션 로깅
            undo: withLog('undo'),
            redo: withLog('redo'),
            duplicateSelected: withLog('duplicateSelected'),
            groupSelected: withLog('groupSelected'),
            ungroupSelected: withLog('ungroupSelected'),
            toggleNodeLock: withLog('toggleNodeLock'),
            toggleNodeVisibility: withLog('toggleNodeVisibility'),
            setViewportMode: withLog('viewportMode called'),
        },
    });

    return ctl
        /*
        .pickReader('getUI', 'getProject', 'pages', 'getPast', 'getFuture')
        .pickWriter(
            'setEditorMode', 'setViewportMode', 'selectPage', 'setNotification',
            // 추가 노출
            'undo', 'redo',
            'duplicateSelected', 'groupSelected', 'ungroupSelected',
            'toggleNodeLock', 'toggleNodeVisibility',
        )
        */
        .exposeAll()
        .build();
}