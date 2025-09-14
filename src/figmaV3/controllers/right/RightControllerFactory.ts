'use client';

import * as React from 'react';
import { useEditorApi, EditorDomain } from '../../engine/EditorApi';
import { useStoreTick } from '../adapters/useStoreTick';
import {makeSmartController, writerRerenderAspect} from '../makeSmartController';
import { withLog } from '../adapters/aspect';
import { getDefinition } from "@/figmaV3/core/registry";
import {NodeId, StylePolicy} from "@/figmaV3/core/types";

import { useRerenderOnWrite } from '@/figmaV3/controllers/adapters/uiRerender';
import {
    buildOverlayFromComponentPolicy,
    getAllowedStyleKeysForNode,
    isControlVisibleForNode
} from "@/figmaV3/runtime/capabilities";

export enum RightDomain {
    Inspector = 'Inspector',
    Policy = 'Policy',
}

/** 단 하나의 훅만 노출 */
export function useRightControllerFactory(domain?: RightDomain): { reader: any; writer: any } {
    const { reader: RE, writer: WE } = useEditorApi([
        EditorDomain.Policy,
        EditorDomain.Fragment
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
        //writerAspect: writerRerenderAspect,
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
            const nodeId: NodeId | null = ui?.selectedId ?? null;
            if (!nodeId) return { target: null };

            const node = RE.getNode(nodeId);
            if (!node) return { target: null };

            return {
                target: { nodeId, componentId: node.componentId },
                mode: ui.mode,
                expertMode: ui.expertMode,
            };
        })
        .attachReader('isControlVisible', () => (nodeId: NodeId, controlPath: string) => {
            const project = RE.getProject();
            const ui = RE.getUI();
            const comp = RE.getComponentPolicyForNode(nodeId);
            const overlay = buildOverlayFromComponentPolicy(comp);
            return isControlVisibleForNode(project, ui, nodeId, controlPath as any, {
                componentOverlay: overlay,
            });
        })
        .attachReader('isFlexParent', (orig) => () => {
            const ui = RE.getUI?.();
            const nodeId = ui?.selectedId;
            if (!nodeId)
                return false;
            return RE.isFlexParent(nodeId);
        })
        .attachReader('isContainer', (orig) => () => {
            const ui = RE.getUI?.();
            const nodeId = ui?.selectedId;
            if (!nodeId)
                return false;
            return RE.isContainerNode(nodeId)})
        .attachWriter('setControlVisibility', () => (componentId: string, controlPath: string, visible: boolean) => {
            WE.upsertComponentControlVisibility(componentId, controlPath, visible);
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