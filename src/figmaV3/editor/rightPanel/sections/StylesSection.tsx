'use client';
import React, { useMemo, useState } from 'react';
import { useEditor } from '../../useEditor';
import type { CSSDict, Viewport } from '../../../core/types';
import { getEffectivePoliciesForNode } from '../../../runtime/capabilities'; // ✨ [수정]

// V3 그룹 UI (레포 경로 그대로 유지)
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
    const nodeId = state.ui.selectedId ?? state.project.rootId;
    const node = state.project.nodes[nodeId];

    // ✨ [수정] 새로운 정책 엔진을 통해 정책 정보를 가져옵니다.
    const policyInfo = useMemo(() => getEffectivePoliciesForNode(state.project, nodeId), [state.project, nodeId]);

    if (!node || !policyInfo) {
        return <div className="p-3 text-sm text-gray-500">Select a node to edit styles.</div>;
    }

    const { tag, tagPolicy, def } = policyInfo;
    const activeViewport: Viewport = state.ui.canvas.activeViewport;
    const mode = state.ui.canvas.vpMode[activeViewport];
    const tf = state.project.inspectorFilters?.[node.componentId];

    const el = useMemo(() => {
        return (state.getEffectiveDecl(nodeId) ?? {}) as CSSDict;
    }, [state, nodeId]);

    const patch = (kv: CSSDict) =>
        state.updateNodeStyles(nodeId, kv, mode === 'Independent' ? activeViewport : undefined);

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

    // ✨ [수정] 각 그룹에 nodeId와 componentId를 전달합니다.
    const groupProps = {
        el: el as any,
        patch,
        tag,
        tagPolicy,
        tf,
        map: state.project.tagPolicies, // (기존 호환성을 위해 유지, 점진적으로 제거)
        expert,
        nodeId,
        componentId: def.id,
    };

    return (
        <div className="p-3">
            {mode === 'Independent' && (
                <div className="mb-2 text-xs rounded border border-amber-300 bg-amber-50 text-amber-800 px-2 py-1">
                    현재 뷰포트는 <b>개별 스타일</b> 모드입니다. Base 위에 이 뷰포트의 수정 항목만 덮어씁니다.
                </div>
            )}

            <div
                className="rounded"
                style={{
                    border: mode === 'Independent' ? '1px dashed #f59e0b' : '1px solid transparent',
                    padding: 8,
                }}
            >
                <LayoutGroup     {...groupProps} open={open.layout}     onToggle={() => toggle('layout')} />
                <TypographyGroup {...groupProps} open={open.typo}       onToggle={() => toggle('typo')} />
                <PositionGroup   {...groupProps} open={open.position}   onToggle={() => toggle('position')} />
                <SpacingGroup    {...groupProps} open={open.spacing}    onToggle={() => toggle('spacing')} />
                <BorderGroup     {...groupProps} open={open.border}     onToggle={() => toggle('border')} />
                <BackgroundGroup {...groupProps} open={open.background} onToggle={() => toggle('background')} />
                <EffectsGroup    {...groupProps} open={open.effects}    onToggle={() => toggle('effects')} />
                <CustomGroup     {...groupProps} open={open.custom}     onToggle={() => toggle('custom')} />
            </div>
        </div>
    );
}