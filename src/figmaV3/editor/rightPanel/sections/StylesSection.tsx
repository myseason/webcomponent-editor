'use client';

/**
 * StylesSection (그룹 조립)
 * - 표시 순서 (요청 반영):
 *   1) Layout → 2) Typography → 3) Position → 4) Spacing → 5) Border → 6) Background → 7) Effects → 8) Custom
 * - TagPolicy / 템플릿 필터(inspectorFilter) 반영
 * - Expert 모드: 템플릿 필터 무시(고급 컨트롤 노출)
 * - 훅 규칙: 모든 훅은 최상위에서만 호출
 */

import React from 'react';
import { useEditor } from '../../useEditor';
import type {
    CSSDict,
    NodeId,
    NodePropsWithMeta,
} from '../../../core/types';
import { getTagPolicy } from '../../../runtime/capabilities';

// 스타일 그룹들
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

    // 선택 노드(없으면 현재 페이지 루트)
    const nodeId: NodeId = state.ui.selectedId ?? state.project.rootId;
    const node = state.project.nodes[nodeId];

    // 태그/정책/템플릿 필터/전문가 모드
    const props = (node.props as NodePropsWithMeta) ?? {};
    const tag = (props.__tag as string) ?? 'div';
    const expert = Boolean(state.ui.expertMode);
    const tf = state.project.inspectorFilters?.[node.componentId]; // 템플릿/컴포넌트별 필터
    const tagPolicy = getTagPolicy(tag, state.project.tagPolicies);

    // 스타일 엘리먼트 + 패치 함수(얕은 병합)
    const el = (node.styles?.element ?? {}) as CSSDict;
    const patch = (kv: CSSDict) => state.updateNodeStyles(nodeId, { element: kv });

    // 펼침 상태(기본은 Layout만 open, 나머지 닫힘)
    const [open, setOpen] = React.useState({
        layout: true,
        typo: false,
        position: false,
        spacing: false,
        border: false,
        background: false,
        effects: false,
        custom: false,
    });

    return (
        <div className="flex flex-col gap-2">
            {/* 템플릿 필터 안내 (전문가 모드에서 무시됨) */}
            {!expert && tf?.styles && (
                <div className="rounded border border-amber-300 bg-amber-50 text-[11px] text-amber-800 px-2 py-1">
                    템플릿/컴포넌트 정책에 의해 일부 스타일이 숨겨져 있습니다. (Expert 모드에서 무시)
                </div>
            )}

            {/* 1) Layout */}
            <LayoutGroup
                el={el}
                tag={tag}
                tagPolicy={tagPolicy}
                tf={tf}
                map={state.project.tagPolicies}
                expert={expert}
                patch={patch}
                open={open.layout}
                onToggle={() => setOpen({ ...open, layout: !open.layout })}
            />

            {/* 2) Typography */}
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

            {/* 3) Position */}
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

            {/* 4) Spacing */}
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

            {/* 5) Border */}
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

            {/* 6) Background */}
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

            {/* 7) Effects */}
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

            {/* 8) Custom */}
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