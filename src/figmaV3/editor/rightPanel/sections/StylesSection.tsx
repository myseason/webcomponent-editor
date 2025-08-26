'use client';

/**
 * StylesSection (그룹 조립)
 * - Layout / Typography / Position / Spacing / Border / Background / Effects / Custom
 * - TagPolicy/템플릿 필터 반영, 전문가 모드 시 고급 컨트롤 노출
 */

import React from 'react';
import { useEditor } from '../../useEditor';
import type { CSSDict, EditorState, NodeId, NodePropsWithMeta } from '../../../core/types';
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
    const tag = props.__tag ?? 'div';

    const expert = Boolean(state.ui.expertMode);
    const tf = state.project.inspectorFilters?.[node.componentId];
    const tagPolicy = getTagPolicy(tag, state.project.tagPolicies);

    const el = (node.styles?.element ?? {}) as CSSDict;
    const patch = (kv: CSSDict) => state.updateNodeStyles(nodeId, { element: kv });

    const [open, setOpen] = React.useState({
        layout: true,
        typo: true,
        position: true,
        spacing: true,
        border: false,
        background: true,
        effects: true,
        custom: false,
    });

    return (
        <div className="px-3 pb-6">
            {!expert && tf?.styles && (
                <div className="mb-2 text-[11px] text-amber-600">
                    템플릿 필터가 일부 스타일을 숨겼습니다. (Expert 모드에서 무시)
                </div>
            )}

            <LayoutGroup
                el={el}
                patch={patch}
                tag={tag}
                tagPolicy={tagPolicy}
                tf={tf}
                map={state.project.tagPolicies}
                expert={expert}
                open={open.layout}
                onToggle={() => setOpen({ ...open, layout: !open.layout })}
            />

            <TypographyGroup
                el={el}
                patch={patch}
                tag={tag}
                tagPolicy={tagPolicy}
                tf={tf}
                map={state.project.tagPolicies}
                expert={expert}
                open={open.typo}
                onToggle={() => setOpen({ ...open, typo: !open.typo })}
            />

            <PositionGroup
                el={el}
                patch={patch}
                tag={tag}
                tagPolicy={tagPolicy}
                tf={tf}
                map={state.project.tagPolicies}
                expert={expert}
                open={open.position}
                onToggle={() => setOpen({ ...open, position: !open.position })}
            />

            <SpacingGroup
                el={el}
                patch={patch}
                tag={tag}
                tagPolicy={tagPolicy}
                tf={tf}
                map={state.project.tagPolicies}
                expert={expert}
                open={open.spacing}
                onToggle={() => setOpen({ ...open, spacing: !open.spacing })}
            />

            <BorderGroup
                el={el}
                patch={patch}
                tag={tag}
                tagPolicy={tagPolicy}
                tf={tf}
                map={state.project.tagPolicies}
                expert={expert}
                open={open.border}
                onToggle={() => setOpen({ ...open, border: !open.border })}
            />

            <BackgroundGroup
                el={el}
                patch={patch}
                tag={tag}
                tagPolicy={tagPolicy}
                tf={tf}
                map={state.project.tagPolicies}
                expert={expert}
                open={open.background}
                onToggle={() => setOpen({ ...open, background: !open.background })}
            />

            <EffectsGroup
                el={el}
                patch={patch}
                tag={tag}
                tagPolicy={tagPolicy}
                tf={tf}
                map={state.project.tagPolicies}
                expert={expert}
                open={open.effects}
                onToggle={() => setOpen({ ...open, effects: !open.effects })}
            />

            <CustomGroup
                el={el}
                patch={patch}
                tag={tag}
                tagPolicy={tagPolicy}
                tf={tf}
                map={state.project.tagPolicies}
                expert={expert}
                open={open.custom}
                onToggle={() => setOpen({ ...open, custom: !open.custom })}
            />
        </div>
    );
}