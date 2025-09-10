'use client';

import * as React from 'react';
import { useEditorApi, EditorDomain } from '../../engine/EditorApi';
import { useStoreTick } from '../adapters/useStoreTick';
import { makeSmartController } from '../makeSmartController';
import { withLog } from '../adapters/aspect';
import { getDefinition } from "@/figmaV3/core/registry";

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

    const getViewModel = () => {
        //const selectedId = RE.getCurrentNode().id;
        const node = RE.getCurrentNode();
        if (!node)
            return null;

        const definition = getDefinition(node.componentId);
        const policy = RE.getGlobalStylePolicy(); // 혹은 컴포넌트별 정책
        const effectiveStyles = RE.getEffectiveDecl(node.id);
        const schemaOverrides = RE.getSchemaOverrides()?.[node.componentId];

        return {
            key: node.id,
            node,
            definition,
            policy,
            effectiveStyles,
            schemaOverrides,
        };
    };

    return ctl
        .pickReader('getProject', 'getUI', 'getNodeById', 'getEffectiveDecl', 'getInspectorTarget')
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