'use client';

import * as React from 'react';

import { useEditorApi, EditorDomain } from '../../engine/EditorApi';
import { makeSmartController } from '../makeSmartController';
import { withLog } from '../adapters/aspect';
import { useRerenderOnWrite } from '@/figmaV3/controllers/adapters/uiRerender';

import type { NodeId } from '@/figmaV3/core/types';
import { isControlVisibleForNode } from '@/figmaV3/runtime/capabilities';

export enum RightDomain {
    Inspector = 'Inspector',
    Policy = 'Policy',
}

/** 단 하나의 훅만 노출 (현 패턴 유지) */
export function useRightControllerFactory(
    domain?: RightDomain
): { reader: any; writer: any } {
    const { reader: RE, writer: WE } = useEditorApi([
        EditorDomain.Policy,
        EditorDomain.Fragment,
    ]);

    // re render
    useRerenderOnWrite();

    return React.useMemo(() => {
        switch (domain) {
            case RightDomain.Policy:
                return createPolicyController(RE, WE);
            case RightDomain.Inspector:
            default:
                return createInspectorController(RE, WE);
        }
    }, [domain, RE, WE]);
}

type InspectorVM = {
    target: null | { nodeId: NodeId; componentId: string | null };
    mode?: 'page' | 'component';
    expertMode?: boolean;
};

function createInspectorController(RE: any, WE: any) {
    const ctl = makeSmartController('Right/Inspector', RE, WE, {
        // writerAspect: writerRerenderAspect,
        wrap: {
            updateNodeStyles: withLog('updateNodeStyles'),
            updateNodeProps: withLog('updateNodeProps'),
            setNotification: withLog('setNotification'),
            updateComponentPolicy: withLog('updateComponentPolicy'),
            // 아래 두 라이터는 본 컨트롤러에서만 래핑 (정책 변경 로그용)
            setStyleGroupVisibility: withLog('setStyleGroupVisibility'),
            setControlVisibility: withLog('setControlVisibility'),
        },
    });

    return ctl
        .attachReader('getInspectorVM', (): InspectorVM => {
            const ui = RE.getUI?.();
            const nodeId: NodeId | null = ui?.selectedId ?? null;
            if (!nodeId) return { target: null };

            const node = RE.getNode(nodeId);
            if (!node) return { target: null };

            return {
                target: { nodeId, componentId: node.componentId ?? null },
                mode: ui.mode,
                expertMode: ui.expertMode,
            };
        })
        // 개별 컨트롤 가시성 — 오버레이/5번째 인자 제거(4-인자 시그니처)
        .attachReader('isControlVisible', () => (nodeId: NodeId, controlPath: string) => {
            const project = RE.getProject();
            const ui = RE.getUI();
            return isControlVisibleForNode(project as any, ui as any, nodeId, controlPath as any);
        })
        // 그룹(StyleGroup) 가시성 — 정책 도메인 리더로 위임 (현 패턴: RE/WE 사용)
        .attachReader('isStyleGroupVisible', () => (nodeId: NodeId, groupKey: any) => {
            // policyDomain.reader.isStyleGroupVisible가 RE에 병합되어 있음
            return RE.isStyleGroupVisible?.(nodeId, groupKey) ?? false;
        })
        // 그룹 내 허용 키(Set) — 정책 도메인 리더로 위임
        .attachReader('getAllowedStyleKeysByGroup', () => (nodeId: NodeId, groupKey: any) => {
            return RE.getAllowedStyleKeysByGroup?.(nodeId, groupKey) ?? new Set<string>();
        })
        // 기존 보조 리더 유지
        .attachReader('isFlexParent', (orig) => () => {
            const ui = RE.getUI?.();
            const nodeId = ui?.selectedId;
            if (!nodeId) return false;
            return RE.isFlexParent(nodeId);
        })
        .attachReader('isContainer', (orig) => () => {
            const ui = RE.getUI?.();
            const nodeId = ui?.selectedId;
            if (!nodeId) return false;
            return RE.isContainerNode(nodeId);
        })
        .attachReader('getComponentGroupVisibility', () => (componentId: string, groupKey: any) => {
            // policyDomain.reader.getComponentGroupVisibility 를 RE에 병합해두었다는 가정
            // 만약 없다면 project에서 직접 읽어도 됩니다:
            // const comp = RE.getProject()?.policies?.components?.[componentId];
            // return comp?.inspector?.[groupKey]?.visible ?? true;
            return RE.getComponentGroupVisibility?.(componentId, groupKey) ?? true;
        })
        // 개별 컨트롤 가시성 정책 저장 — 정책 도메인 라이터에 위임
        .attachWriter('setControlVisibility', () => (componentId: string, controlPath: string, visible: boolean) => {
            WE.upsertComponentControlVisibility(componentId, controlPath, visible);
        })
        // 그룹(StyleGroup) 가시성 정책 저장 — 정책 도메인 라이터에 위임
        .attachWriter('setStyleGroupVisibility', () => (componentId: string, groupKey: any, visible: boolean) => {
            WE.upsertComponentGroupVisibility(componentId, groupKey, visible);
        })
        //.pickReader('getProject', 'getUI', 'getNodeById', 'getEffectiveDecl', 'getInspectorVM')
        //.pickWriter('updateNodeStyles', 'updateNodeProps', 'setNotification', 'updateComponentPolicy')
        .exposeAll()
        .build();
}

function createPolicyController(RE: any, WE: any) {
    const ctl = makeSmartController('Right/Policy', RE, WE, {
        wrap: {
            updateComponentPolicy: withLog('updateComponentPolicy'),
        },
    });

    return ctl
        //.pickReader('getProject', 'getUI')
        //.pickWriter('updateComponentPolicy')
        .exposeAll()
        .build();
}