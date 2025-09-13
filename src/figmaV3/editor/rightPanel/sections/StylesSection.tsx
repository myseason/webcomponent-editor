'use client';

import React, { JSX, useMemo, useState } from 'react';
import type { CSSDict, Viewport } from '../../../core/types';

// ✅ Phase 2: 단일 진입점으로 교체
import {
    getEffectivePoliciesForNode,
    getAllowedStyleKeysForNode,
    isGroupAllowed,
} from '../../../policy/EffectivePolicyService';
import { STYLE_GROUP_MAP } from '../../../policy/PolicyKeys';

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
        text = '고급 모드가 활성화되었습니다.\n컴포넌트 정책은 무시되며, 모든 스타일을 편집할 수 있습니다.';
    } else if (mode === 'Page') {
        text = '페이지 개발 모드입니다. 컴포넌트에 정의된 정책에 따라 스타일이 제한됩니다.';
    } else {
        text =
            '컴포넌트 개발 모드입니다. 🔒 아이콘을 눌러 "페이지 모드에서 숨길" 속성을 지정할 수 있습니다.';
    }
    return <div className="mb-2 text-xs text-[var(--mdt-color-muted)] whitespace-pre-line">{text}</div>;
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

    // ✅ 기존 로컬 상태 관리 로직 유지
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
    const toggle = (k: keyof OpenState) => setOpen((prev) => ({ ...prev, [k]: !prev[k] }));

    // ✅ 허용 키 계산: EffectivePolicyService를 사용
    const allow = useMemo(() => {
        if (!nodeId) return new Set<string>();
        const force = !!ui?.inspector?.forceTagPolicy; // 강제 공개 토글
        return getAllowedStyleKeysForNode(project, nodeId, { expertMode, force });
    }, [project, nodeId, expertMode, ui?.inspector?.forceTagPolicy]);

    // ✅ EffectivePolicy 정보 활용 (태그/정의 등)
    const policyInfo = useMemo(() => {
        if (!nodeId) return null;
        return getEffectivePoliciesForNode(project, nodeId);
    }, [project, nodeId]);

    if (!target || !policyInfo) {
        return <div className="text-xs text-[var(--mdt-color-muted)]">Select a node to edit styles.</div>;
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

    // ✅ 그룹 표시 여부: STYLE_GROUP_MAP 기반 대표키로 결정
    const showGroup = (group: keyof typeof STYLE_GROUP_MAP) =>
        isGroupAllowed(allow, STYLE_GROUP_MAP[group].representatives);

    // ✅ 그룹 컴포넌트 공통 props (기존과 동일)
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
        writer, // "잠금" 액션 위해 전달
    };

    return (
        <>
            <InspectorPolicyNotice mode={mode} expertMode={expertMode} />

            {/* layout */}
            {showGroup('layout') && (
                <LayoutGroup {...groupProps} open={open.layout} onToggle={() => toggle('layout')} />
            )}

            {/* typography */}
            {showGroup('typography') && (
                <TypographyGroup {...groupProps} open={open.typo} onToggle={() => toggle('typo')} />
            )}

            {/* position */}
            {showGroup('position') && (
                <PositionGroup {...groupProps} open={open.position} onToggle={() => toggle('position')} />
            )}

            {/* spacing */}
            {showGroup('spacing') && (
                <SpacingGroup {...groupProps} open={open.spacing} onToggle={() => toggle('spacing')} />
            )}

            {/* border */}
            {showGroup('border') && (
                <BorderGroup {...groupProps} open={open.border} onToggle={() => toggle('border')} />
            )}

            {/* background */}
            {showGroup('background') && (
                <BackgroundGroup
                    {...groupProps}
                    open={open.background}
                    onToggle={() => toggle('background')}
                />
            )}

            {/* effects */}
            {showGroup('effects') && (
                <EffectsGroup {...groupProps} open={open.effects} onToggle={() => toggle('effects')} />
            )}

            {/* custom */}
            <CustomGroup {...groupProps} open={open.custom} onToggle={() => toggle('custom')} />
        </>
    );
}