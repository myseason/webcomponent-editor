'use client';

import * as React from 'react';
// 아이콘 (SectionFrame용)
import { Layout as LayoutIcon, Type as TypeIcon, Palette, Sparkles, Hand } from 'lucide-react';

// SSOT 타입
import type { NodeId, StyleGroupKey } from '@/figmaV3/core/types';
// 공용 유틸
import { shallowEqual } from '@/figmaV3/core/utils';
// 섹션 UI (presentational)
import LayoutSection from './sections/LayoutSection';
import TypographySection from './sections/TypographySection';
import AppearanceSection from './sections/AppearanceSection';
import EffectsSection from './sections/EffectsSection';
import InteractivitySection from './sections/InteractivitySection';
import AdvancedSection from './sections/AdvancedSection';

// 프레임/공용 UI (섹션 접힘 컨테이너)
import { SectionFrame } from './util/ui';
// 컨트롤러 (파사드)
import { useRightControllerFactory, RightDomain } from '@/figmaV3/controllers/right/RightControllerFactory';

type Values = Record<string, any>;

type Props = {
    nodeId: NodeId;
    componentId?: string | null;
    /** 섹션 패널 너비(px). 기본 360 */
    width?: number;
};

export default function StyleInspector({ nodeId, componentId, width = 360 }: Props) {

    const { reader, writer } = useRightControllerFactory(RightDomain.Inspector);

    // === VM: 모드/고급 여부 ===
    const vm = reader.getInspectorVM?.() as {
        mode?: 'page' | 'component';
        expertMode?: boolean;
        target?: { nodeId: NodeId; componentId: string | null } | null;
    };
    const mode = vm?.mode ?? 'page';
    const expertMode = !!vm?.expertMode;
    const isComponentMode = mode === 'component';

    // === 값 동기화 (무한 루프 방지: reader를 deps에 넣지 않음 + shallowEqual) ===
    const [values, setValues] = React.useState<Values>({});

    React.useEffect(() => {
        const decl =
            reader.getEffectiveDecl?.(nodeId) ??
            reader.getNodeStyles?.(nodeId) ??
            (reader.getNode?.(nodeId)?.styles ?? {});
        const parentDisplay =
            reader.getParentComputedStyle?.(nodeId, 'display') ??
            reader.getParentDisplay?.(nodeId) ??
            null;

        setValues((prev) => {
            const next = { ...prev, ...decl, __parentDisplay: parentDisplay };
            return shallowEqual(prev, next) ? prev : next;
        });
    }, [nodeId]);

    // === 값 쓰기: 엔진 도메인으로 위임 ===
    const setValue = React.useCallback(
        (key: string, val: any) => {
            // 로컬 즉시 반영(깜빡임 예방). 필요 없으면 주석처리 가능
            setValues((p) => ({ ...p, [key]: val }));
            writer.updateNodeStyles?.(nodeId, { [key]: val });
        },
        [nodeId, writer]
    );

    // === 그룹 가시성 (정책/모드 내부 반영) ===
    const isGroupVisible = React.useCallback(
        (g: StyleGroupKey) => reader.isStyleGroupVisible?.(nodeId, g) ?? false,
        [reader, nodeId]
    );

    // === 잠금 표시(페이지 기본에서만 “숨김=잠김처럼 보이기”) ===
    const locks = React.useMemo(() => {
        if (isComponentMode || expertMode) {
            // 컴포넌트 모드/페이지 고급: 잠금 개념 표시하지 않음
            return {
                'layout.display': false,
                'layout.position': false,
                'layout.sizing': false,
                'layout.spacing': false,
                'layout.typography': false,
                'layout.appearance': false,
                'layout.effects': false,
                'layout.interactivity': false,
                'layout.advanced': false,
            };
        }
        // 페이지 기본: CP가 숨긴 섹션은 잠김처럼 표시
        return {
            'layout.display': !isGroupVisible('displayFlow'),
            'layout.position': !isGroupVisible('position'),
            'layout.sizing': !isGroupVisible('sizing'),
            'layout.spacing': !isGroupVisible('spacing'),
            'layout.typography': !isGroupVisible('typography'),
            'layout.appearance': !isGroupVisible('background'), // Appearance가 background/border 묶음일 경우
            'layout.effects': !isGroupVisible('effects'),
            'layout.interactivity': !isGroupVisible('interactivity'),
            'layout.advanced': !isGroupVisible('advanced'),
        };
    }, [isComponentMode, expertMode, isGroupVisible]);

    // === 컴포넌트 모드에서만 lock 버튼 노출 ===
    const canLock = isComponentMode && !!componentId;

    // CP 가시성 읽기(아이콘/툴팁 표시에 사용하고 싶을 때)
    const getCpVisible = React.useCallback(
        (g: StyleGroupKey) => {
            if (!canLock) return undefined;

            // 1) 컨트롤러 리더가 있으면 우선 사용
            const viaReader = reader.getComponentGroupVisibility?.(componentId as string, g);
            if (typeof viaReader === 'boolean') return viaReader;

            // 2) 폴백: 프로젝트에서 직접 읽기 (스키마: policies.components[compId].inspector.groups[g].visible)
            try {
                const proj = reader.getProject?.();
                const grp = proj?.policies?.components?.[componentId as string]?.inspector?.groups?.[g as any];
                if (grp && typeof grp.visible === 'boolean') return grp.visible;
            } catch {}

            // 기본값: 표시는 true(= 페이지 기본에서 보임)
            return true;
        },
        [canLock, componentId, reader]
    );

    // === lock 토글: CP 저장 + 토스트 ===
    const onToggleLock = React.useCallback(
        (lockKey: string) => {
            if (!canLock) return;

            const map: Record<string, StyleGroupKey> = {
                'layout.display': 'displayFlow',
                'layout.position': 'position',
                'layout.sizing': 'sizing',
                'layout.spacing': 'spacing',
                'layout.typography': 'typography',
                'layout.appearance': 'background',
                'layout.effects': 'effects',
                'layout.interactivity': 'interactivity',
                'layout.advanced': 'advanced',
            };
            const gk = map[lockKey];
            if (!gk) return;

            const currentVisible = getCpVisible(gk);
            const nextVisible = !(currentVisible ?? true);

            // 1) 표준 경로: 컨트롤러 writer 존재 시
            if (writer.setStyleGroupVisibility) {
                writer.setStyleGroupVisibility(componentId as string, gk, nextVisible);
            }
            // 2) 폴백: updateComponentPolicy deep-merge 지원 시
            else if (writer.updateComponentPolicy) {
                writer.updateComponentPolicy(componentId as string, {
                    inspector: {
                        groups: {
                            [gk]: { visible: nextVisible },
                        },
                    } as any,
                });
            } else {
                console.warn('[StyleInspector] No writer to set group visibility');
            }

            writer.setNotification?.({
                type: 'info',
                message: '페이지 개발 모드에서 해당 속성을 변경할 수 없습니다.',
            });
        },
        [canLock, componentId, writer, getCpVisible]
    );

    // === 섹션 접힘/디테일 상태 (로컬) ===
    const [collapsed, setCollapsed] = React.useState<Record<
        'Layout' | 'Typography' | 'Appearance' | 'Effects' | 'Interactivity' | 'Advanced',
        boolean
    >>({
        Layout: false,
        Typography: false,
        Appearance: false,
        Effects: false,
        Interactivity: false,
        Advanced: false,
    });

    const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
    const openDetail = React.useCallback((detailKey: string, seed?: () => void) => {
        setExpanded((prev) => {
            const opening = !prev[detailKey];
            if (opening && seed) {
                try { seed(); } catch {}
            }
            return { ...prev, [detailKey]: !prev[detailKey] };
        });
    }, []);

    // === 렌더 ===
    return (
        <>
            {/* Layout */}
            {isGroupVisible('displayFlow') && (
                <SectionFrame
                    title="Layout"
                    Icon={LayoutIcon}
                    collapsed={collapsed.Layout}
                    onToggle={() => setCollapsed((p) => ({ ...p, Layout: !p.Layout }))}
                >
                    <LayoutSection
                        values={values}
                        setValue={setValue}
                        locks={locks}
                        onToggleLock={onToggleLock}
                        expanded={expanded}
                        openDetail={openDetail}
                        canLock={canLock}
                        getCpVisible={getCpVisible}
                    />
                </SectionFrame>
            )}

            {/* Typography */}
            {isGroupVisible('typography') && (
                <SectionFrame
                    title="Typography"
                    Icon={TypeIcon}
                    collapsed={collapsed.Typography}
                    onToggle={() => setCollapsed((p) => ({ ...p, Typography: !p.Typography }))}
                >
                    <TypographySection
                        values={values}
                        setValue={setValue}
                        locks={locks}
                        onToggleLock={onToggleLock}
                        expanded={expanded}
                        openDetail={openDetail}
                        canLock={canLock}
                        getCpVisible={getCpVisible}
                    />
                </SectionFrame>
            )}

            {/* Appearance (배경/보더 등 묶음) */}
            {isGroupVisible('background') && (
                <SectionFrame
                    title="Appearance"
                    Icon={Palette}
                    collapsed={collapsed.Appearance}
                    onToggle={() => setCollapsed((p) => ({ ...p, Appearance: !p.Appearance }))}
                >
                    <AppearanceSection
                        values={values}
                        setValue={setValue}
                        locks={locks}
                        onToggleLock={onToggleLock}
                        expanded={expanded}
                        openDetail={openDetail}
                        canLock={canLock}
                        getCpVisible={getCpVisible}
                    />
                </SectionFrame>
            )}

            {/* Effects */}
            {isGroupVisible('effects') && (
                <SectionFrame
                    title="Effects"
                    Icon={Sparkles}
                    collapsed={collapsed.Effects}
                    onToggle={() => setCollapsed((p) => ({ ...p, Effects: !p.Effects }))}
                >
                    <EffectsSection
                        values={values}
                        setValue={setValue}
                        locks={locks}
                        onToggleLock={onToggleLock}
                        expanded={expanded}
                        openDetail={openDetail}
                        canLock={canLock}
                        getCpVisible={getCpVisible}
                    />
                </SectionFrame>
            )}

            {/* Interactivity */}
            {isGroupVisible('interactivity') && (
                <SectionFrame
                    title="Interactivity"
                    Icon={Hand}
                    collapsed={collapsed.Interactivity}
                    onToggle={() => setCollapsed((p) => ({ ...p, Interactivity: !p.Interactivity }))}
                >
                    <InteractivitySection
                        values={values}
                        setValue={setValue}
                        locks={locks}
                        onToggleLock={onToggleLock}
                        expanded={expanded}
                        openDetail={openDetail}
                        canLock={canLock}
                        getCpVisible={getCpVisible}
                    />
                </SectionFrame>
            )}

            {/* Advanced */}
            {isGroupVisible('advanced') && (
                <SectionFrame
                    title="Advanced"
                    Icon={Sparkles}
                    collapsed={collapsed.Advanced}
                    onToggle={() => setCollapsed((p) => ({ ...p, Advanced: !p.Advanced }))}
                >
                    <AdvancedSection
                        values={values}
                        setValue={setValue}
                        locks={locks}
                        onToggleLock={onToggleLock}
                        expanded={expanded}
                        openDetail={openDetail}
                        canLock={canLock}
                        getCpVisible={getCpVisible}
                    />
                </SectionFrame>
            )}
        </>
    );
}