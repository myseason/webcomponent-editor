'use client';

import React from 'react';
import { useEditor } from '../../useEditor';
import type {
    CSSDict,
    NodeId,
    NodePropsWithMeta,
} from '../../../core/types';
import { getTagPolicy } from '../../../runtime/capabilities';
import { LayoutGroup } from './styles/LayoutGroup';
import { TypographyGroup } from './styles/TypographyGroup';
import { PositionGroup } from './styles/PositionGroup';
import { SpacingGroup } from './styles/SpacingGroup';
import { BorderGroup } from './styles/BorderGroup';
import { BackgroundGroup } from './styles/BackgroundGroup';
import { EffectsGroup } from './styles/EffectsGroup';
import { CustomGroup } from './styles/CustomGroup';

export function StylesSection() {
    const state = useEditor();

    const nodeId: NodeId = state.ui.selectedId ?? state.project.rootId;
    const node = state.project.nodes[nodeId];

    const props = (node.props as NodePropsWithMeta) ?? {};
    const tag = (props.__tag as string) ?? 'div';
    const expert = state.ui.expertMode;

    // ✅ [수정] 현재 활성화된 뷰포트를 참조합니다.
    const activeViewport = state.ui.canvas.activeViewport;

    const tf = state.project.inspectorFilters?.[node.componentId];
    const tagPolicy = getTagPolicy(tag, state.project.tagPolicies);

    // ✅ [수정] 현재 뷰포트의 스타일을 가져오도록 수정합니다.
    const el = (node.styles?.element?.[activeViewport] ?? {}) as CSSDict;

    // ✅ [수정] patch 함수가 세 번째 인자로 activeViewport를 전달하도록 수정합니다.
    const patch = (kv: CSSDict) => state.updateNodeStyles(nodeId, kv, activeViewport);

    const [open, setOpen] = React.useState({
        layout: true, typo: false, position: false, spacing: false,
        border: false, background: false, effects: false, custom: false,
    });

    const toggle = (key: keyof typeof open) => setOpen(prev => ({...prev, [key]: !prev[key]}));

    return (
        <div className="flex flex-col gap-2">
            {!expert && tf?.styles && (
                <div className="rounded border border-amber-300 bg-amber-50 text-[11px] text-amber-800 px-2 py-1">
                    Template policies are hiding some styles. (Ignored in Expert Mode)
                </div>
            )}

            <LayoutGroup el={el} tag={tag} tagPolicy={tagPolicy} tf={tf} map={state.project.tagPolicies} expert={expert} patch={patch} open={open.layout} onToggle={() => toggle('layout')} />
            <TypographyGroup el={el} patch={patch} tag={tag} tagPolicy={tagPolicy} tf={tf} map={state.project.tagPolicies} expert={expert} open={open.typo} onToggle={() => toggle('typo')} />
            <PositionGroup el={el} patch={patch} tag={tag} tagPolicy={tagPolicy} tf={tf} map={state.project.tagPolicies} expert={expert} open={open.position} onToggle={() => toggle('position')} />
            <SpacingGroup el={el} patch={patch} tag={tag} tagPolicy={tagPolicy} tf={tf} map={state.project.tagPolicies} expert={expert} open={open.spacing} onToggle={() => toggle('spacing')} />
            <BorderGroup el={el} patch={patch} tag={tag} tagPolicy={tagPolicy} tf={tf} map={state.project.tagPolicies} expert={expert} open={open.border} onToggle={() => toggle('border')} />
            <BackgroundGroup el={el} patch={patch} tag={tag} tagPolicy={tagPolicy} tf={tf} map={state.project.tagPolicies} expert={expert} open={open.background} onToggle={() => toggle('background')} />
            <EffectsGroup el={el} patch={patch} tag={tag} tagPolicy={tagPolicy} tf={tf} map={state.project.tagPolicies} expert={expert} open={open.effects} onToggle={() => toggle('effects')} />
            <CustomGroup el={el} patch={patch} tag={tag} tagPolicy={tagPolicy} tf={tf} map={state.project.tagPolicies} expert={expert} open={open.custom} onToggle={() => toggle('custom')} />
        </div>
    );
}