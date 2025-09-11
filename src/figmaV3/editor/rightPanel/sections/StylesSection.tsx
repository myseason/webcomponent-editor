'use client';

import React, { JSX, useMemo, useState } from 'react';
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

import { RightDomain, useRightControllerFactory } from '@/figmaV3/controllers/right/RightControllerFactory';

// ──────────────────────────────────────────────────────────────────────────────
// 스타일 섹션 상단: 정책 메시지 패널(공통 표시 영역)
// - 페이지 모드: TagPolicy+ComponentPolicy 반영 시 “숨김 안내”
// - 페이지 모드 강제노출(Inspector 상단 토글): “컴포넌트 정책 무시 안내”
// - 컴포넌트 모드: “TagPolicy로 제한된 속성은 숨김/ 🔒로 페이지 모드 숨김 설정 가능”
// ──────────────────────────────────────────────────────────────────────────────
function InspectorPolicyNotice({
                                   mode,
                                   forceTagPolicy,
                               }: {
    mode: 'Page' | 'Component';
    forceTagPolicy?: boolean;
}) {
    let text = '';
    if (mode === 'Page') {
        text = forceTagPolicy
            ? 'TagPolicy 기준으로 스타일을 모두 표시합니다. (컴포넌트 정책은 무시됩니다)'
            : '정책에 의해 제한되는 속성은 표시되지 않습니다. (컴포넌트 정책 적용)';
    } else {
        text = '컴포넌트 개발 모드입니다. TagPolicy로 제한되는 속성은 숨겨지며, 🔒을 눌러 페이지 모드에서 숨길 속성을 지정할 수 있습니다.';
    }

    // Inspector 내부 강조: 테마를 해치지 않되 눈에 띄게
    return (
        <div className="mt-2 mb-2 -mx-2 px-3 py-2 rounded-md border-2 border-amber-400/80 bg-amber-50 text-amber-800 font-semibold text-[13px]">
            {text}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────────

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
    const project = reader.getProject();
    const ui = reader.getUI();
    const expert = ui.expertMode;

    // 현재 선택 노드 (없으면 루트)
    // const nodeId = reader.getCurrentNode().id ?? reader.getRootNodeId();
    const currentNode = reader.getCurrentNode();
    const nodeId = currentNode ? currentNode.id : reader.getRootNodeId();
    const node = project.nodes[nodeId];

    // 정책/정의 정보
    const policyInfo = useMemo(
        () => getEffectivePoliciesForNode(project, nodeId),
        [project, nodeId]
    );
    if (!node || !policyInfo) {
        return <>Select a node to edit styles.</>;
    }
    const { tag, tagPolicy, def } = policyInfo;

    // 뷰포트/스타일 병합 모드
    const activeViewport: Viewport = ui.canvas.activeViewport;
    const mode = ui.canvas.vpMode[activeViewport];

    // 템플릿/컴포넌트별 인스펙터 필터
    // forceTagPolicy가 켜진 경우 componentPolicy 무시
    const tf = ui.mode === 'Page' && !!ui.inspector?.forceTagPolicy
        ? undefined
        : project.inspectorFilters?.[node.componentId];

    // 현재 유효 CSS 선언
    const el = useMemo(() => {
        return (reader.getEffectiveDecl(nodeId) ?? {}) as CSSDict;
    }, [reader, nodeId]);

    // 스타일 패치 (뷰포트 모드에 따라 대상 분기)
    const patch = (kv: CSSDict) =>
        writer.updateNodeStyles(
            nodeId,
            kv,
            mode === 'Independent' ? activeViewport : undefined
        );

    // 그룹 오픈 상태 (베이스 기본값 유지)
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

    // 각 그룹에 공통 props 전달 (베이스와 동일)
    const groupProps = {
        el: el as any,
        patch,
        tag,
        tagPolicy,
        tf,
        map: project.tagPolicies, // (기존 호환을 위해 유지)
        expert,
        nodeId,
        componentId: def.id, // ✅ defId가 아니라 def.id 사용
    };

    return (
        <>
            {/* 뷰포트 개별 스타일 모드 안내 */}
            {mode === 'Independent' && (
                <div className="mb-2 text-[12px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                    현재 뷰포트는 개별 스타일 모드입니다. Base 위에 이 뷰포트의 수정 항목만 덮어씁니다.
                </div>
            )}

            {/* 정책 메시지 패널(공통) */}
            <InspectorPolicyNotice
                mode={ui.mode as 'Page' | 'Component'}
                forceTagPolicy={!!ui.inspector?.forceTagPolicy}
            />

            {/* Layout */}
            <LayoutGroup {...groupProps} open={open.layout} onToggle={() => toggle('layout')} />

            {/* Typography */}
            <TypographyGroup {...groupProps} open={open.typo} onToggle={() => toggle('typo')} />

            {/* Position */}
            <PositionGroup {...groupProps} open={open.position} onToggle={() => toggle('position')} />

            {/* Spacing */}
            <SpacingGroup {...groupProps} open={open.spacing} onToggle={() => toggle('spacing')} />

            {/* Border */}
            <BorderGroup {...groupProps} open={open.border} onToggle={() => toggle('border')} />

            {/* Background */}
            <BackgroundGroup {...groupProps} open={open.background} onToggle={() => toggle('background')} />

            {/* Effects */}
            <EffectsGroup {...groupProps} open={open.effects} onToggle={() => toggle('effects')} />

            {/* Custom */}
            <CustomGroup {...groupProps} open={open.custom} onToggle={() => toggle('custom')} />
        </>
    );
}