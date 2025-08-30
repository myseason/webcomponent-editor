'use client';
import React, { useMemo, useState } from 'react';
import { useEditor } from '../../useEditor';
import type { CSSDict, NodeId, NodePropsWithMeta, Viewport } from '../../../core/types';
import { getTagPolicy } from '../../../runtime/capabilities';

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
    const nodeId: NodeId = state.ui.selectedId ?? state.project.rootId;
    const node = state.project.nodes[nodeId];

    const props = (node.props as NodePropsWithMeta) ?? {};
    const tag = (props.__tag as string) ?? 'div';
    const expert = state.ui.expertMode;

    const activeViewport: Viewport = state.ui.canvas.activeViewport;
    const mode = state.ui.canvas.vpMode[activeViewport]; // 'Unified' | 'Independent'
    const tf = state.project.inspectorFilters?.[node.componentId];
    const tagPolicy = getTagPolicy(tag, state.project.tagPolicies);

    // ✅ 렌더 선언: Unified면 base만, Independent면 base + activeViewport 오버라이드 머지
    const el = useMemo(() => {
        return (state.getEffectiveDecl(nodeId) ?? {}) as CSSDict;
    }, [state, nodeId, activeViewport, mode]);

    // ✅ 쓰기: Unified면 base에 기록, Independent면 activeViewport override에 기록
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
            {/* 템플릿 정책 안내 (기존) */}
            {!expert && tf?.styles && (
                <div className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    Template policies are hiding some styles. (Ignored in Expert Mode)
                </div>
            )}

            {/* Independent 안내 배너 + 패널 하이라이트 */}
            {mode === 'Independent' && (
                <div
                    className="mb-2 rounded border text-xs"
                    style={{
                        borderColor: '#fde047',
                        background: '#fffbeb',
                        color: '#92400e',
                        padding: '8px 10px',
                    }}
                >
                    Independent mode for <b>{activeViewport}</b>. Changes here override Base for this viewport only.
                </div>
            )}

            <div
                className="rounded"
                style={{
                    border: mode === 'Independent' ? '1px dashed #f59e0b' : '1px solid transparent',
                    padding: 8,
                }}
            >
                {/* V3 그룹 UI - prop 시그니처/경로는 레포 그대로 유지 */}
                <LayoutGroup el={el} tag={tag} tagPolicy={tagPolicy} tf={tf} map={(state.project as any).tagPolicies} expert={expert} patch={patch} open={open.layout} onToggle={()=>toggle('layout')} />
                <TypographyGroup el={el} tag={tag} tagPolicy={tagPolicy} tf={tf} map={(state.project as any).tagPolicies} expert={expert} patch={patch} open={open.typo} onToggle={()=>toggle('typo')} />
                <PositionGroup el={el} tag={tag} tagPolicy={tagPolicy} tf={tf} map={(state.project as any).tagPolicies} expert={expert} patch={patch} open={open.position} onToggle={()=>toggle('position')} />
                <SpacingGroup el={el} tag={tag} tagPolicy={tagPolicy} tf={tf} map={(state.project as any).tagPolicies} expert={expert} patch={patch} open={open.spacing} onToggle={()=>toggle('spacing')} />
                <BorderGroup el={el} tag={tag} tagPolicy={tagPolicy} tf={tf} map={(state.project as any).tagPolicies} expert={expert} patch={patch} open={open.border} onToggle={()=>toggle('border')} />
                <BackgroundGroup el={el} tag={tag} tagPolicy={tagPolicy} tf={tf} map={(state.project as any).tagPolicies} expert={expert} patch={patch} open={open.background} onToggle={()=>toggle('background')} />
                <EffectsGroup el={el} tag={tag} tagPolicy={tagPolicy} tf={tf} map={(state.project as any).tagPolicies} expert={expert} patch={patch} open={open.effects} onToggle={()=>toggle('effects')} />
                <CustomGroup el={el} tag={tag} tagPolicy={tagPolicy} tf={tf} map={(state.project as any).tagPolicies} expert={expert} patch={patch} open={open.custom} onToggle={()=>toggle('custom')} />
            </div>
        </div>
    );
}