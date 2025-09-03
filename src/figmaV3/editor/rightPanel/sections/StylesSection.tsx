'use client';

import React, { useMemo, useState } from 'react';
import { useEditor } from '../../useEditor';
import type { CSSDict, Viewport } from '../../../core/types';
import { getEffectivePoliciesForNode } from '../../../runtime/capabilities';

// V3 그룹 UI (베이스 경로 유지)
import { LayoutGroup } from './styles/LayoutGroup';
import { TypographyGroup } from './styles/TypographyGroup';
import { PositionGroup } from './styles/PositionGroup';
import { SpacingGroup } from './styles/SpacingGroup';
import { BorderGroup } from './styles/BorderGroup';
import { BackgroundGroup } from './styles/BackgroundGroup';
import { EffectsGroup } from './styles/EffectsGroup';
import { CustomGroup } from './styles/CustomGroup';

type OpenState = {
    layout: boolean;
    typo: boolean;
    position: boolean;
    spacing: boolean;
    border: boolean;
    background: boolean;
    effects: boolean;
    custom: boolean;
};

export function StylesSection() {
    const state = useEditor();
    const expert = state.ui.expertMode;

    // 현재 선택 노드 (없으면 루트)
    const nodeId = state.ui.selectedId ?? state.project.rootId;
    const node = state.project.nodes[nodeId];

    // 정책/정의 정보 (베이스 유틸 사용)
    const policyInfo = useMemo(
        () => getEffectivePoliciesForNode(state.project, nodeId),
        [state.project, nodeId]
    );

    if (!node || !policyInfo) {
        return <div className="text-[12px] text-gray-500 px-2 py-2">Select a node to edit styles.</div>;
    }

    const { tag, tagPolicy, def } = policyInfo;

    // 뷰포트/스타일 병합 모드
    const activeViewport: Viewport = state.ui.canvas.activeViewport;
    const mode = state.ui.canvas.vpMode[activeViewport];

    // 템플릿/컴포넌트별 인스펙터 필터 (베이스 구조 유지)
    const tf = state.project.inspectorFilters?.[node.componentId];

    // 현재 유효 CSS 선언 (베이스의 getEffectiveDecl 사용)
    const el = useMemo(() => {
        return (state.getEffectiveDecl(nodeId) ?? {}) as CSSDict;
    }, [state, nodeId]);

    // 스타일 패치 (뷰포트 모드에 따라 대상 분기)
    const patch = (kv: CSSDict) =>
        state.updateNodeStyles(
            nodeId,
            kv,
            mode === 'Independent' ? activeViewport : undefined
        );

    // 그룹 오픈 상태 (베이스 기본값 유지, 필요 시 조정)
    const [open, setOpen] = useState<OpenState>({
        layout: true,
        typo: false,
        position: false,
        spacing: true,
        border: false,
        background: false,
        effects: false,
        custom: false,
    });
    const toggle = (k: keyof OpenState) => setOpen(prev => ({ ...prev, [k]: !prev[k] }));

    // 각 그룹에 공통 props 전달 (베이스와 동일)
    const groupProps = {
        el: el as any,
        patch,
        tag,
        tagPolicy,
        tf,
        map: state.project.tagPolicies, // (기존 호환을 위해 유지)
        expert,
        nodeId,
        componentId: def.id, // ✅ defId가 아니라 def.id 사용
    };

    return (
        // 상단 "Styles" 타이틀을 없애고, 좌우 패딩 상쇄(-mx-2)로 그룹 헤더의 좌측 기준을 맞춤
        <div className="mt-4">
            {mode === 'Independent' && (
                <div className="px-2 py-1 text-[11px] text-gray-600 bg-[var(--mdt-color-surface-1)] border-b border-[var(--mdt-color-border)]">
                    현재 뷰포트는 개별 스타일 모드입니다. Base 위에 이 뷰포트의 수정 항목만 덮어씁니다.
                </div>
            )}

            {/* Layout */}
            <LayoutGroup
                {...groupProps}
                open={open.layout}
                onToggle={() => toggle('layout')}
            />

            {/* Typography */}
            <TypographyGroup
                {...groupProps}
                open={open.typo}
                onToggle={() => toggle('typo')}
            />

            {/* Position */}
            <PositionGroup
                {...groupProps}
                open={open.position}
                onToggle={() => toggle('position')}
            />

            {/* Spacing */}
            <SpacingGroup
                {...groupProps}
                open={open.spacing}
                onToggle={() => toggle('spacing')}
            />

            {/* Border */}
            <BorderGroup
                {...groupProps}
                open={open.border}
                onToggle={() => toggle('border')}
            />

            {/* Background */}
            <BackgroundGroup
                {...groupProps}
                open={open.background}
                onToggle={() => toggle('background')}
            />

            {/* Effects */}
            <EffectsGroup
                {...groupProps}
                open={open.effects}
                onToggle={() => toggle('effects')}
            />

            {/* Custom */}
            <CustomGroup
                {...groupProps}
                open={open.custom}
                onToggle={() => toggle('custom')}
            />
        </div>
    );
}