'use client';

import * as React from 'react';
import { useEditorApi, EditorDomain } from '../../engine/EditorApi';
import { useStoreTick } from '../adapters/useStoreTick';
import {makeSmartController, writerRerenderAspect} from '../makeSmartController';
import { withLog } from '../adapters/aspect';
import { getDefinition } from "@/figmaV3/core/registry";
import {NodeId} from "@/figmaV3/core/types";
import { useRerenderOnWrite } from '@/figmaV3/controllers/adapters/uiRerender';

export enum RightDomain {
    Inspector = 'Inspector',
    Policy = 'Policy',
}

/** 단 하나의 훅만 노출 */
export function useRightControllerFactory(domain?: RightDomain): { reader: any; writer: any } {
    const { reader: RE, writer: WE } = useEditorApi([
        EditorDomain.Policy,
        EditorDomain.Fragment,
        EditorDomain.Selectors,
    ]);
    //useStoreTick();
    useRerenderOnWrite();

    return React.useMemo(() => {
        switch (domain) {
            case RightDomain.Policy:    return createPolicyController(RE, WE);
            case RightDomain.Inspector:
            default:                    return createInspectorController(RE, WE);
        }
    }, [domain, RE, WE]);
}

/* ───────── 내부 구현 숨김 ───────── */
type InspectorVM = {
    target: null | { nodeId: NodeId; componentId: string | null };
};

function createInspectorController(RE: any, WE: any) {
    const ctl = makeSmartController('Right/Inspector', RE, WE, {
        writerAspect: writerRerenderAspect,
        wrap: {
            updateNodeStyles: withLog('updateNodeStyles'),
            updateNodeProps: withLog('updateNodeProps'),
            setNotification: withLog('setNotification'),
            updateComponentPolicy: withLog('updateComponentPolicy'),
        },
    });

    return ctl
        .attachReader("getInspectorVM", () => {
            const ui = RE.getUI?.();
            const project = RE.getProject?.();

            const nodeId: NodeId | null = (ui?.selectedId as NodeId | undefined) ?? null;
            const componentId: string | null =
                nodeId ? ((project?.nodes?.[nodeId]?.componentId as string | undefined) ?? null) : null;

            if (!nodeId) return { target: null };
            return { target: { nodeId, componentId } };
        })
        //.pickReader('getProject', 'getUI', 'getNodeById', 'getEffectiveDecl', 'getInspectorVM')
        //.pickWriter('updateNodeStyles', 'updateNodeProps', 'setNotification', 'updateComponentPolicy')
        .exposeAll()
        .build();
}

function createPolicyController(RE: any, WE: any) {
    const ctl = makeSmartController('Right/Policy', RE, WE, {
        wrap: { updateComponentPolicy: withLog('updateComponentPolicy') },
    });

    return ctl
        //.pickReader('getProject', 'getUI')
        //.pickWriter('updateComponentPolicy')
        .exposeAll()
        .build();
}