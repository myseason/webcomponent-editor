'use client';

import { useRef, useSyncExternalStore, useMemo } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';
import {
    DEFAULT_STYLE_POLICY,
    type StylePolicy,
} from '../../policy/stylePresets';

// 얕은 병합: 제공된 경로만 덮어쓰기
function mergePolicy(base: StylePolicy, override?: Partial<StylePolicy>): StylePolicy {
    if (!override) return base;
    return {
        gradient: {
            maxStops: override.gradient?.maxStops ?? base.gradient.maxStops,
            anglePresets: override.gradient?.anglePresets ?? base.gradient.anglePresets,
        },
        shadows: {
            presets: override.shadows?.presets ?? base.shadows.presets,
        },
        filters: {
            presets: override.filters?.presets ?? base.filters.presets,
        },
        typography: {
            fontFamilies: override.typography?.fontFamilies ?? base.typography.fontFamilies,
            weightOptions: override.typography?.weightOptions ?? base.typography.weightOptions,
            alignOptions: override.typography?.alignOptions ?? base.typography.alignOptions,
            transformOptions: override.typography?.transformOptions ?? base.typography.transformOptions,
        },
        background: {
            sizeOptions: override.background?.sizeOptions ?? base.background.sizeOptions,
            repeatOptions: override.background?.repeatOptions ?? base.background.repeatOptions,
            positionOptions: override.background?.positionOptions ?? base.background.positionOptions,
            attachmentOptions: override.background?.attachmentOptions ?? base.background.attachmentOptions,
        },
        border: {
            styleOptions: override.border?.styleOptions ?? base.border.styleOptions,
            radiusPresets: override.border?.radiusPresets ?? base.border.radiusPresets,
        },
        colors: {
            palette: override.colors?.palette ?? base.colors?.palette,
        },
    };
}

function readStylePolicySnapshot(): { policy: StylePolicy; token: string } {
    const s: any = EditorEngine.getState();
    // 프로젝트 정책 위치 자동 탐색 (실제 구조에 맞게 2곳 탐색)
    const proj = s?.project ?? {};
    const maybe = proj?.policy?.styles ?? s?.policy?.styles ?? undefined;

    const policy: StylePolicy = mergePolicy(DEFAULT_STYLE_POLICY, maybe);

    // 변경감지용 토큰
    const token = [
        policy.gradient.maxStops,
        (policy.gradient.anglePresets || []).join(','),
        (policy.shadows.presets || []).map((p) => p.label).join(','),
        (policy.filters.presets || []).map((p) => p.label).join(','),
        (policy.typography.weightOptions || []).join(','),
        (policy.typography.alignOptions || []).join(','),
        (policy.typography.transformOptions || []).join(','),
        (policy.background.sizeOptions || []).join(','),
        (policy.background.repeatOptions || []).join(','),
        (policy.background.positionOptions || []).join(','),
        (policy.background.attachmentOptions || []).join(','),
        (policy.border.styleOptions || []).join(','),
        (policy.colors?.palette || []).join(','),
    ].join('|');

    return { policy, token };
}

export function useStylePolicyController() {
    const ref = useRef(readStylePolicySnapshot());

    const subscribe = (onChange: () => void) => {
        const unsub = EditorEngine.subscribe(() => {
            const next = readStylePolicySnapshot();
            if (next.token !== ref.current.token) {
                ref.current = next;
                onChange();
            }
        });
        return () => { if (typeof unsub === 'function') unsub(); };
    };

    const getSnapshot = () => ref.current;
    const { policy } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    function useStylePolicy() {
        return useMemo(() => policy, [policy]);
    }

    return {
        reader: { useStylePolicy },
    };
}