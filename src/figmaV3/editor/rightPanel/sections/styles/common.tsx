'use client';

import * as React from 'react';
import { Lock } from 'lucide-react';

import type {
    EditorUI,
    NodeId,
    Project,
} from '@/figmaV3/core/types';

import { EditorCore } from '@/figmaV3/engine/EditorCore';
import {
    getAllowedStyleKeysForNode,
    isControlVisibleForNode,
} from '@/figmaV3/runtime/capabilities';
import {JSX} from "react";

/* ─────────────────────────────────────────
 * Types
 * ───────────────────────────────────────── */
export type DisallowReason =
    | 'policy'        // 정책(Style/Tag/ComponentPolicy)에 의해 비허용
    | 'expertOnly'    // 전문가 모드 전용
    | 'unsupported'   // 정의/태그 상 미지원
    | 'template'      // 템플릿/잠금 상태 등
    | 'unknown';

/* ─────────────────────────────────────────
 * Store helpers (컨트롤러 미사용)
 * ───────────────────────────────────────── */
function useProjectUI(): { project: Project; ui: EditorUI } {
    const state = EditorCore.store.getState();
    return { project: state.project, ui: state.ui };
}

/* ─────────────────────────────────────────
 * Visibility / Allowed wrappers
 * ───────────────────────────────────────── */

/** 패널들이 기대하는 훅: nodeId 기준 허용 키 집합 */
export function useAllowed(nodeId: NodeId): Set<string> {
    const { project, ui } = useProjectUI();
    try {
        return getAllowedStyleKeysForNode(project, nodeId, {
            expertMode: ui?.expertMode,
            withSizeAlias: true,
        });
    } catch {
        // 폴백: 최대한 안전한 기본 허용 집합
        return new Set<string>([
            'display','size','width','height','overflow',
            'backgroundColor','backgroundImage','backgroundSize','backgroundRepeat','backgroundPosition',
            'borderColor','borderWidth','borderRadius',
            'boxShadow','opacity',
            'position','top','right','bottom','left','zIndex',
            'margin','padding',
            'fontFamily','fontWeight','fontSize','lineHeight','color','textAlign',
        ]);
    }
}

/**
 * ⬅️ 변경 핵심: 반환 타입을 넌널(DisallowReason)로 고정.
 *  - 허용되지 않으면 'policy'
 *  - 그 외(허용이거나 판단불가)에는 'unknown' 반환
 *    (패널 쪽에서는 보통 실제 비활성 분기에서만 이 값을 사용하므로 UI 영향 없음)
 */
export function reasonForKey(
    project: Readonly<Project>,
    ui: Readonly<EditorUI>,
    nodeId: NodeId,
    key: string,
    _expert: boolean
): DisallowReason {
    try {
        const allowed = getAllowedStyleKeysForNode(project, nodeId, {
            expertMode: ui?.expertMode,
            withSizeAlias: true,
        });
        if (!allowed.has(key)) return 'policy';
        return 'unknown';
    } catch {
        return 'unknown';
    }
}

/** 개별 컨트롤 가시성 질의(옵션) */
export function isControlVisible(
    project: Readonly<Project>,
    ui: Readonly<EditorUI>,
    nodeId: NodeId,
    controlPath: string
): boolean {
    try {
        return isControlVisibleForNode(project, ui, nodeId, controlPath as any);
    } catch {
        return true;
    }
}

/* ─────────────────────────────────────────
 * UI helpers
 * ───────────────────────────────────────── */
/** 잠금 사유 힌트 */
export function DisabledHint(props: { reason: DisallowReason }) {
    const label =
        props.reason === 'policy' ? 'Locked by policy'
            : props.reason === 'expertOnly' ? 'Expert only'
                : props.reason === 'unsupported' ? 'Not supported'
                    : props.reason === 'template' ? 'Locked in template'
                        : 'Unavailable';
    return <span className="text-[11px] text-gray-500 ml-2">{label}</span>;
}

/** 메인 1차 속성용 Lock 버튼(UI-only). onClick은 호출부에서 필요 시 주입 */
export function PermissionLock(props: {
    controlKey: string;     // 예: 'styles:layout.display' 또는 'props:name'
    componentId: string;
    disabled?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            className="inline-flex items-center justify-center w-[18px] h-[18px] border rounded-sm text-gray-600 hover:bg-gray-50"
            onClick={props.onClick}
            disabled={props.disabled}
            type="button"
            title="Lock (hide in Page mode)"
            aria-label="Lock"
        >
            <Lock size={12} />
        </button>
    );
}

/**
 * 기존 패턴 호환용 보조:
 *   renderStyleLock(ui, componentId, controlKey)
 * - 실제 정책 반영은 PermissionLock을 직접 쓰면서 onClick 주입 권장.
 */
export function renderStyleLock(
    ui: EditorUI,
    componentId: string,
    controlKey: string
): JSX.Element | null {
    const disabled = ui.expertMode || !!ui?.inspector?.forceTagPolicy;
    return (
        <PermissionLock
            controlKey={`styles:${controlKey}`}
            componentId={componentId}
            disabled={disabled}
        />
    );
}

/** 간단 색상 입력(레거시 호환) */
export const ColorField: React.FC<{
    value?: string;
    onChange?: (v: string) => void;
    placeholder?: string;
    title?: string;
}> = ({ value = '', onChange, placeholder, title }) => {
    return (
        <input
            type="text"
            className="w-full h-[22px] px-[6px] text-[12px] border rounded outline-none"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            title={title}
        />
    );
};