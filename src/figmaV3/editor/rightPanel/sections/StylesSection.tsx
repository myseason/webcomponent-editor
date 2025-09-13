// src/figmaV3/editor/rightPanel/sections/StylesSection.tsx

'use client';

import React, { JSX, useMemo, useState } from 'react';
import type { CSSDict, Viewport } from '../../../core/types';
import { getEffectivePoliciesForNode } from '../../../runtime/capabilities';
import { useAllowed } from './styles/common';

// V3 그룹 UI (베이스 경로 유지)
import { LayoutGroup } from './styles/LayoutGroup';
import { TypographyGroup } from './styles/TypographyGroup';
import { PositionGroup } from './styles/PositionGroup';
import { SpacingGroup } from './styles/SpacingGroup';
import { BorderGroup } from './styles/BorderGroup';
import { BackgroundGroup } from './styles/BackgroundGroup';
import { EffectsGroup } from './styles/EffectsGroup';
import { CustomGroup } from './styles/CustomGroup';

import { RightDomain, useRightControllerFactory } from '@/figmaV3/controllers/right/RightControllerFactory';

// ──────────────────────────────────────────────────────────────────────────────
// 정책 메시지 패널
// ──────────────────────────────────────────────────────────────────────────────
function InspectorPolicyNotice({
                                   mode,
                                   expertMode,
                               }: {
    mode: 'Page' | 'Component';
    expertMode: boolean;
}) {
    let text = '';
    if (expertMode) {
        text = '고급 모드가 활성화되었습니다. 컴포넌트 정책은 무시되며, 모든 스타일을 편집할 수 있습니다.';
    } else if (mode === 'Page') {
        text = '페이지 개발 모드입니다. 컴포넌트에 정의된 정책에 따라 스타일이 제한됩니다.';
    } else {
        text = '컴포넌트 개발 모드입니다. 🔒을 눌러 페이지 모드에서 숨길 속성을 지정할 수 있습니다.';
    }

    return (
        <div className="mt-2 mb-2 -mx-2 px-3 py-2 rounded-md border-2 border-amber-400/80 bg-amber-50 text-amber-800 font-semibold text-[13px]">
            {text}
        </div>
    );
}

// ✅ 기존 패널 확장/축소 상태는 그대로 유지합니다.
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

export function StylesSection(): JSX.Element {
    const { reader, writer } = useRightControllerFactory(RightDomain.Inspector);

    const vm = reader.getInspectorVM();
    const { target, mode, expertMode } = vm;

    const project = reader.getProject();
    const ui = reader.getUI();
    const nodeId = target?.nodeId ?? reader.getRootNodeId();

    // ✅ 기존 로컬 상태 관리 로직을 그대로 유지합니다.
    const [open, setOpen] = useState<OpenState>({
        layout: true, typo: false, position: false, spacing: true,
        border: false, background: false, effects: false, custom: false,
    });
    const toggle = (k: keyof OpenState) => setOpen((prev) => ({ ...prev, [k]: !prev[k] }));

    // ✅ 기존 useAllowed 훅을 그대로 사용하여 정책 기반 렌더링을 수행합니다.
    const allow = useAllowed(nodeId);

    // ✅ 기존 GROUP_KEYS 정의를 그대로 유지합니다.
    const GROUP_KEYS: Record<keyof OpenState, string[]> = {
        layout: ['display', 'flexDirection', 'justifyContent', 'alignItems', 'gap', 'gridTemplateColumns', 'gridTemplateRows', 'width', 'height', 'overflow'],
        typo: ['fontFamily', 'fontSize', 'lineHeight', 'fontWeight', 'letterSpacing', 'textAlign', 'color'],
        position: ['position', 'top', 'left', 'right', 'bottom', 'zIndex'],
        spacing: ['margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'gap'],
        border: ['border', 'borderWidth', 'borderStyle', 'borderColor', 'borderRadius', 'outline', 'outlineColor', 'outlineWidth'],
        background: ['background', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundRepeat', 'backgroundPosition'],
        effects: ['boxShadow', 'filter', 'backdropFilter', 'opacity'],
        custom: [],
    };

    const hasAnyAllowed = (keys: string[]) => keys.some((k) => allow.has(k));

    // ✅ [오류 해결] getEffectivePoliciesForNode를 올바른 인자(2개)로 호출합니다.
    const policyInfo = useMemo(() => {
        if (!nodeId) return null;
        // `expertMode` 인자를 제거하여 타입 오류를 해결합니다.
        // `expertMode`에 따른 분기 로직은 `useAllowed` 훅 내부에서 처리됩니다. (기존 로직)
        return getEffectivePoliciesForNode(project, nodeId);
    }, [project, nodeId]);

    if (!target || !policyInfo) {
        return <div className="p-2 text-xs text-gray-500">Select a node to edit styles.</div>;
    }
    const { tag, tagPolicy, def, node } = policyInfo;

    const el = (reader.getEffectiveDecl(nodeId) ?? {}) as CSSDict;

    const activeViewport: Viewport = ui.canvas.activeViewport;
    const viewportMode = ui.canvas.viewportMode[activeViewport];

    const patch = (kv: CSSDict) =>
        writer.updateNodeStyles(
            nodeId,
            kv,
            viewportMode === 'Independent' ? activeViewport : undefined
        );

    // ✅ 기존 groupProps 구조를 유지하며, mode와 writer를 추가로 전달합니다.
    const groupProps = {
        el: el as any,
        patch,
        tag,
        tagPolicy,
        tf: project.inspectorFilters?.[node.componentId],
        map: project.tagPolicies,
        expert: expertMode,
        mode: mode,
        nodeId: nodeId,
        componentId: def.id,
        writer, // "잠금" 액션을 위해 writer 전달
    };

    return (
        <>
            <InspectorPolicyNotice mode={mode} expertMode={expertMode} />

            {/* ✅ 기존 hasAnyAllowed 로직을 그대로 사용하여 그룹 표시 여부를 결정합니다. */}
            {hasAnyAllowed(GROUP_KEYS.layout) && <LayoutGroup {...groupProps} open={open.layout} onToggle={() => toggle('layout')} />}
            {hasAnyAllowed(GROUP_KEYS.typo) && <TypographyGroup {...groupProps} open={open.typo} onToggle={() => toggle('typo')} />}
            {hasAnyAllowed(GROUP_KEYS.position) && <PositionGroup {...groupProps} open={open.position} onToggle={() => toggle('position')} />}
            {hasAnyAllowed(GROUP_KEYS.spacing) && <SpacingGroup {...groupProps} open={open.spacing} onToggle={() => toggle('spacing')} />}
            {hasAnyAllowed(GROUP_KEYS.border) && <BorderGroup {...groupProps} open={open.border} onToggle={() => toggle('border')} />}
            {hasAnyAllowed(GROUP_KEYS.background) && <BackgroundGroup {...groupProps} open={open.background} onToggle={() => toggle('background')} />}
            {hasAnyAllowed(GROUP_KEYS.effects) && <EffectsGroup {...groupProps} open={open.effects} onToggle={() => toggle('effects')} />}
            <CustomGroup {...groupProps} open={open.custom} onToggle={() => toggle('custom')} />
        </>
    );
}