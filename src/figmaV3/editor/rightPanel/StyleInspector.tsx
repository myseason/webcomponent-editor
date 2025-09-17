'use client';

import * as React from 'react';

// 섹션 프레임 & 공용 UI
import { SectionFrame } from './util/ui';

// 단일 컨트롤 렌더에서 쓰는 타입과 값 세터
import type { StyleValues, SetStyleValue } from './util/types';

// 각 섹션
import LayoutSection from './sections/LayoutSection';
import TypographySection from './sections/TypographySection';
import AppearanceSection from './sections/AppearanceSection';
import EffectsSection from './sections/EffectsSection';
import InteractivitySection from './sections/InteractivitySection';
import AdvancedSection from './sections/AdvancedSection';

// 초기값 (기존 파일 유지)
import { INITIAL_STYLE_DEFAULTS } from './sections/defaultStyles';

// 아이콘 (SectionFrame 아이콘용 — 기존과 동일)
import {
    Layout as LayoutIcon,
    Type as TypeIcon,
    Palette,
    Sparkles,
    Hand,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────
export default function StyleInspector({
                                           nodeId,
                                           defId,
                                           width = 360,
                                       }: {
    nodeId: string;
    defId: string;
    width?: number;
}) {
    // 스타일 값 상태: 기존 초기값 + Advanced/부모표시 보조 키
    const [values, setValues] = React.useState<StyleValues>({
        ...INITIAL_STYLE_DEFAULTS,
        __ovrMode: 'merge',
        __ovrClass: '',
        __ovrRawCss: '',
        __ovrCssVars: '',
        __ovrAttrs: '',
        __parentDisplay: undefined as any, // 상위 편집기에서 주입
    });
    const setValue: SetStyleValue = (k, v) =>
        setValues((prev) => ({ ...prev, [k]: v }));

    // 섹션 접힘 상태 (UI/UX 동일)
    const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({
        Layout: false,
        Typography: false,
        Appearance: false,
        Effects: false,
        Interactivity: false,
        Advanced: false,
    });

    // 그룹 잠금 상태
    const [locks, setLocks] = React.useState<Record<string, boolean>>({});
    const toggleLock = (k: string) => setLocks((p) => ({ ...p, [k]: !p[k] }));

    // 상세(Detail) 확장 상태 + 열릴 때 시드 함수 실행
    const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
    const openDetail = React.useCallback(
        (detailKey: string, seed?: () => void) => {
            setExpanded((prev) => {
                const opening = !prev[detailKey];
                if (opening && seed) seed();
                return { ...prev, [detailKey]: !prev[detailKey] };
            });
        },
        []
    );

    return (
        <div style={{ width }} className="text-[11px] text-neutral-800 overflow-x-hidden">
            {/* Layout */}
            <SectionFrame
                title="Layout"
                Icon={LayoutIcon}
                collapsed={!!collapsed.Layout}
                onToggle={() => setCollapsed((p) => ({ ...p, Layout: !p.Layout }))}
            >
                <LayoutSection
                    values={values}
                    setValue={setValue}
                    locks={locks}
                    onToggleLock={toggleLock}
                    expanded={expanded}
                    openDetail={openDetail}
                />
            </SectionFrame>

            {/* Typography */}
            <SectionFrame
                title="Typography"
                Icon={TypeIcon}
                collapsed={!!collapsed.Typography}
                onToggle={() =>
                    setCollapsed((p) => ({ ...p, Typography: !p.Typography }))
                }
            >
                <TypographySection
                    values={values}
                    setValue={setValue}
                    locks={locks}
                    onToggleLock={toggleLock}
                />
            </SectionFrame>

            {/* Appearance */}
            <SectionFrame
                title="Appearance"
                Icon={Palette}
                collapsed={!!collapsed.Appearance}
                onToggle={() =>
                    setCollapsed((p) => ({ ...p, Appearance: !p.Appearance }))
                }
            >
                <AppearanceSection
                    values={values}
                    setValue={setValue}
                    locks={locks}
                    onToggleLock={toggleLock}
                    expanded={expanded}
                    openDetail={openDetail}
                />
            </SectionFrame>

            {/* Effects */}
            <SectionFrame
                title="Effects"
                Icon={Sparkles}
                collapsed={!!collapsed.Effects}
                onToggle={() => setCollapsed((p) => ({ ...p, Effects: !p.Effects }))}
            >
                <EffectsSection
                    values={values}
                    setValue={setValue}
                    locks={locks}
                    onToggleLock={toggleLock}
                    expanded={expanded}
                    openDetail={openDetail}
                />
            </SectionFrame>

            {/* Interactivity */}
            <SectionFrame
                title="Interactivity"
                Icon={Hand}
                collapsed={!!collapsed.Interactivity}
                onToggle={() =>
                    setCollapsed((p) => ({ ...p, Interactivity: !p.Interactivity }))
                }
            >
                <InteractivitySection
                    values={values}
                    setValue={setValue}
                    locks={locks}
                    onToggleLock={toggleLock}
                />
            </SectionFrame>

            {/* Advanced */}
            <SectionFrame
                title="Advanced"
                Icon={Sparkles}
                collapsed={!!collapsed.Advanced}
                onToggle={() =>
                    setCollapsed((p) => ({ ...p, Advanced: !p.Advanced }))
                }
            >
                <AdvancedSection
                    values={values}
                    setValue={setValue}
                    locks={locks}
                    onToggleLock={toggleLock}
                />
            </SectionFrame>
        </div>
    );
}