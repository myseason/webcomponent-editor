'use client';

import * as React from 'react';
import {EditorDomain, useEditorApi} from '../../engine/EditorApi';
import {useStoreTick} from '../adapters/useStoreTick';
import {makeSmartController} from '../makeSmartController';
import {withLog} from '../adapters/aspect';

export enum TopbarDomain {
    Topbar = 'Topbar',
}

/** 단 하나의 훅만 노출 */
export function useTopbarControllerFactory(domain?: TopbarDomain): { reader: any; writer: any } {
    const { reader: RE, writer: WE } = useEditorApi([EditorDomain.History]);
    useStoreTick();

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
        wrap: {
            setEditorMode: withLog('setEditorMode'),
            selectPage: withLog('selectPage'),
            setNotification: withLog('setNotification'),
        },
    });

    return ctl
        .pickReader('getUI', 'getProject', 'pages', 'getPast', 'getFuture')
        .pickWriter('setEditorMode', 'setViewportMode', 'selectPage', 'setNotification', 'undo', 'redo')
        .build();
}