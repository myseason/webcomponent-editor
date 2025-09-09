'use client';

import * as React from 'react';
import { useEngine, EngineDomain } from '../../engine/Engine';
import { useStoreTick } from '../adapters/useStoreTick';
import { makeSmartController } from '../makeSmartController';
import { withLog } from '../adapters/aspect';

export enum RightDomain {
    Inspector = 'Inspector',
    Policy = 'Policy',
}

/** 단 하나의 훅만 노출 */
export function useRightControllerFactory(domain?: RightDomain): { reader: any; writer: any } {
    const { reader: RE, writer: WE } = useEngine([
        EngineDomain.Policy,
        EngineDomain.Components,
        EngineDomain.Selectors,
    ]);
    useStoreTick();

    return React.useMemo(() => {
        switch (domain) {
            case RightDomain.Policy:    return createPolicyController(RE, WE);
            case RightDomain.Inspector:
            default:                    return createInspectorController(RE, WE);
        }
    }, [domain, RE, WE]);
}

/* ───────── 내부 구현 숨김 ───────── */

function createInspectorController(RE: any, WE: any) {
    const ctl = makeSmartController('Right/Inspector', RE, WE, {
        wrap: {
            updateNodeStyles: withLog('updateNodeStyles'),
            updateNodeProps: withLog('updateNodeProps'),
            setNotification: withLog('setNotification'),
            updateComponentPolicy: withLog('updateComponentPolicy'),
        },
    });

    return ctl
        .pickReader('getProject', 'getUI', 'getNodeById', 'getEffectiveDecl')
        .pickWriter('updateNodeStyles', 'updateNodeProps', 'setNotification', 'updateComponentPolicy')
        .build();
}

function createPolicyController(RE: any, WE: any) {
    const ctl = makeSmartController('Right/Policy', RE, WE, {
        wrap: { updateComponentPolicy: withLog('updateComponentPolicy') },
    });

    return ctl
        .pickReader('getProject', 'getUI')
        .pickWriter('updateComponentPolicy')
        .build();
}