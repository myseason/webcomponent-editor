'use client';
import React, { useMemo, useState } from 'react';
import { useEditor } from '../../useEditor';
import type { CSSDict, Viewport } from '../../../core/types';
import { effectiveTag, getTagPolicy } from '../../../runtime/capabilities';

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

    if (!node) {
        return <div className="p-3 text-sm text-gray-500">Select a node to edit styles.</div>;
    }

    const tag = effectiveTag(node); // __tag → defaultTag → 'div'
    const activeViewport: Viewport = state.ui.canvas.activeViewport;
    const mode = state.ui.canvas.vpMode[activeViewport]; // 'Unified' | 'Independent'
    const tf = state.project.inspectorFilters?.[node.componentId];
    const tagPolicy = getTagPolicy(tag, state.project.tagPolicies);

    // 읽기: Base + (Independent일 때만 Active) 병합
    const el = useMemo(() => {
        return (state.getEffectiveDecl(nodeId) ?? {}) as CSSDict;
    }, [state.project, state.ui.canvas, nodeId]);

    // 쓰기: Unified→Base, Independent→Active
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
                {/* V3 그룹 UI - 기존 prop 시그니처 존중 */}
                <LayoutGroup     el={el as any} patch={patch} tag={tag} tagPolicy={tagPolicy} tf={tf} map={state.project.tagPolicies} expert={expert} open={open.layout} onToggle={() => toggle('layout')} />
                <TypographyGroup el={el as any} patch={patch} tag={tag} tagPolicy={tagPolicy} tf={tf} map={state.project.tagPolicies} expert={expert} open={open.typo} onToggle={() => toggle('typo')} />
                <PositionGroup   el={el as any} patch={patch} tag={tag} tagPolicy={tagPolicy} tf={tf} map={state.project.tagPolicies} expert={expert} open={open.position} onToggle={() => toggle('position')} />
                <SpacingGroup    el={el as any} patch={patch} tag={tag} tagPolicy={tagPolicy} tf={tf} map={state.project.tagPolicies} expert={expert} open={open.spacing} onToggle={() => toggle('spacing')} />
                <BorderGroup     el={el as any} patch={patch} tag={tag} tagPolicy={tagPolicy} tf={tf} map={state.project.tagPolicies} expert={expert} open={open.border} onToggle={() => toggle('border')} />
                <BackgroundGroup el={el as any} patch={patch} tag={tag} tagPolicy={tagPolicy} tf={tf} map={state.project.tagPolicies} expert={expert} open={open.background} onToggle={() => toggle('background')} />
                <EffectsGroup    el={el as any} patch={patch} tag={tag} tagPolicy={tagPolicy} tf={tf} map={state.project.tagPolicies} expert={expert} open={open.effects} onToggle={() => toggle('effects')} />
                <CustomGroup     el={el as any} patch={patch} tag={tag} tagPolicy={tagPolicy} tf={tf} map={state.project.tagPolicies} expert={expert} open={open.custom} onToggle={() => toggle('custom')} />
            </div>
        </div>
    );
}