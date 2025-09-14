'use client';

import React from 'react';
import type { ComponentPolicy, EditorUI, NodeId, Project } from '../../../../core/types';

// Phase 2: 단일 진입점 사용
import {
    getAllowedStyleKeysForNode,
    getEffectivePoliciesForNode,
} from '../../../../policy/EffectivePolicyService';

import { GLOBAL_STYLE_POLICY } from '../../../../policy/globalStylePolicy';
import { Lock } from 'lucide-react';
import styles from '../../../ui/theme.module.css';
import { RightDomain, useRightControllerFactory } from '@/figmaV3/controllers/right/RightControllerFactory';

/**
 * 모든 스타일 패널에서 잠금 버튼을 동일 규칙으로 렌더링하기 위한 공통 함수.
 * - 컴포넌트 개발 모드에서만 노출
 * - controlKey는 "styles:" prefix를 보장
 * - componentId가 없거나 expertMode면 버튼 비활성/비표시 처리
 */
export function renderStyleLock(
    ui: { mode: string; expertMode: boolean },   // 최소 속성만 요구
    componentId: string | undefined,
    controlKey: string,
): React.ReactNode {
    if (!ui || ui.mode !== 'Component') return null; // 컴포넌트 개발 모드에서만
    if (!componentId) return null;                   // 대상 없으면 노출 X
    const ck = controlKey.startsWith('styles:') ? controlKey : `styles:${controlKey}`;
    return (
        <PermissionLock
            controlKey={ck}
            componentId={componentId}
            disabled={ui.expertMode} // 전문가 모드에서는 버튼 비활성
        />
    );
}

/* ────────────────────────────────────────────────────
 * 공통 레이아웃 컴포넌트
 * ──────────────────────────────────────────────────── */
export const Section: React.FC<{
    title: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}> = ({ title, open, onToggle, children }) => (
    <div className="mb-2 border rounded-lg border-[var(--mdt-color-border)]">
        <div
            className="px-2 py-1 text-xs bg-[var(--mdt-color-panel-header)] cursor-pointer select-none"
            onClick={onToggle}
        >
            {open ? '▾' : '▸'} {title}
        </div>
        {open && <div className="p-2">{children}</div>}
    </div>
);

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="text-xs text-[var(--mdt-color-foreground)]">{children}</div>
);

/**
 * 라벨 + suffix 슬롯(오른쪽 고정) 컨테이너
 * - suffix는 absolute로 배치되어 컬럼/그리드를 소비하지 않음
 */
export const LabelRow: React.FC<{
    label: React.ReactNode;
    suffix?: React.ReactNode;
    className?: string;
}> = ({ label, suffix, className }) => (
    <div className={`relative ${className ?? ''}`}>
        <div className="pr-6 text-xs text-[var(--mdt-color-foreground)]">{label}</div>
        {suffix ? (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 inline-flex items-center">
                {suffix}
            </div>
        ) : null}
    </div>
);

export const DisabledHint: React.FC<{ reason: 'template' | 'tag' | 'component' }> = ({
                                                                                         reason,
                                                                                     }) => (
    <span className="ml-1 px-1 py-0.5 text-[10px] border rounded border-[var(--mdt-color-border)] text-[var(--mdt-color-muted)]">
    {reason === 'tag' ? 'TAG' : reason === 'component' ? 'COMP' : 'TPL'}
  </span>
);

/** 🔒 PermissionLock: 컴포넌트 개발 모드에서만 활성 */
export function PermissionLock(props: {
    controlKey: string;
    componentId: string;
    disabled?: boolean;
}) {
    const { writer } = useRightControllerFactory(RightDomain.Inspector);
    const onClick = () => {
        if (props.disabled) return;
        writer.lockStyleControl(props.componentId, props.controlKey);
    };
    return (
        <button
            className={`inline-flex items-center justify-center w-5 h-5 ml-1 rounded
        ${props.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[var(--mdt-color-hover)]'}`}
            title={
                props.disabled
                    ? '고급/강제 공개 모드에서는 편집할 수 없습니다.'
                    : '이 컨트롤을 페이지 모드에서 숨기기/해제'
            }
            onClick={onClick}
            disabled={props.disabled}
            aria-disabled={props.disabled}
            type="button"
        >
            <Lock size={12} />
        </button>
    );
}

/* ────────────────────────────────────────────────────
 * constraints 헬퍼
 * ──────────────────────────────────────────────────── */
type Constraint = { min?: number; max?: number; step?: number };
type ConstraintsTable = Record<string, Constraint>;

const CONSTRAINTS: ConstraintsTable = (GLOBAL_STYLE_POLICY as any)?.constraints ?? {};

/** 단일 키 constraint */
export function useConstraint(key: string): Constraint {
    return React.useMemo(() => CONSTRAINTS[key] ?? {}, [key]);
}

/** 여러 키를 한 번에 가져오기 */
export function useConstraints(keys: string[]): ConstraintsTable {
    return React.useMemo(() => {
        const out: ConstraintsTable = {};
        keys.forEach((k) => (out[k] = CONSTRAINTS[k] ?? {}));
        return out;
    }, [keys.join('|')]);
}

/* ────────────────────────────────────────────────────
 * 폼 위젯
 * ──────────────────────────────────────────────────── */
export const MiniInput: React.FC<{
    value: string | number | undefined;
    onChange: (v: string) => void;
    placeholder?: string;
    disabled?: boolean;
    title?: string;
    className?: string;
}> = ({ value, onChange, placeholder, disabled, title, className }) => (
    <input
        value={value as any}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        title={title}
        className={`${styles.mdt_v1_input} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${
            className ?? ''
        }`}
    />
);

export const NumberInput: React.FC<{
    value: number | undefined;
    onChange: (v: number) => void;
    /** constraints가 있다면 자동 주입됨 */
    step?: number;
    min?: number;
    max?: number;
    className?: string;
    disabled?: boolean;
    title?: string;
}> = ({ value, onChange, step, min, max, className, disabled, title }) => (
    <input
        type="number"
        value={typeof value === 'number' ? value : ('' as any)}
        step={step as any}
        min={min as any}
        max={max as any}
        onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (Number.isNaN(n)) return onChange(NaN as any);
            let v = n;
            if (typeof min === 'number') v = Math.max(min, v);
            if (typeof max === 'number') v = Math.min(max, v);
            onChange(v);
        }}
        disabled={disabled}
        title={title}
        className={`${styles.mdt_v1_input} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${
            className ?? ''
        }`}
    />
);

export const MiniSelect: React.FC<{
    value: string | undefined;
    options: string[];
    onChange: (v: string) => void;
    disabled?: boolean;
    title?: string;
    className?: string;
}> = ({ value, options, onChange, disabled, title, className }) => (
    <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        title={title}
        className={`${styles.mdt_v1_select} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${
            className ?? ''
        }`}
    >
        {value === undefined && <option value="">{'(unset)'}</option>}
        {options.map((op) => (
            <option key={op} value={op}>
                {op}
            </option>
        ))}
    </select>
);

export const ChipBtn: React.FC<{
    active?: boolean;
    disabled?: boolean;
    title: string;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ active, disabled, title, onClick, children }) => (
    <button
        className={`px-2 py-1 text-[10px] rounded border ${
            active ? 'bg-[var(--mdt-color-accent)] text-white' : 'bg-transparent'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={title}
        onClick={onClick}
        disabled={disabled}
        type="button"
    >
        {children}
    </button>
);

export const IconBtn: React.FC<{
    active?: boolean;
    title: string;
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
}> = ({ active, title, onClick, children, disabled }) => (
    <button
        className={`w-6 h-6 inline-flex items-center justify-center rounded border ${
            active ? 'bg-[var(--mdt-color-accent)] text-white' : 'bg-transparent'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={title}
        onClick={onClick}
        disabled={disabled}
        type="button"
    >
        {children}
    </button>
);

export const ColorField: React.FC<{
    value: string | undefined;
    onChange: (v: string) => void;
    disabled?: boolean;
    title?: string;
}> = ({ value, onChange, disabled, title }) => {
    const isHex = typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
    const safeHex = isHex ? value : '#000000';
    return (
        <input
            type="color"
            value={safeHex}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            title={title}
            className="w-6 h-6 border rounded-md border-[var(--mdt-color-border)] cursor-pointer"
            style={{ backgroundColor: 'transparent' }}
        />
    );
};

/** [ADD] 강제 공개 표식 */
export const PolicyBadge: React.FC<{ show?: boolean; title?: string }> = ({ show, title }) => {
    if (!show) return null;
    return (
        <span
            className="ml-2 text-[10px] px-1 py-0.5 rounded border border-[var(--mdt-color-border)] text-[var(--mdt-color-muted)]"
            title={title ?? 'ComponentPolicy 무시(강제 공개)'}
        >
      override
    </span>
    );
};

/* ────────────────────────────────────────────────────
 * 허용/제한 판단 유틸 (Phase 2 치환)
 * ──────────────────────────────────────────────────── */

export type DisallowReason = 'template' | 'tag' | 'component' | null;

/** ✅ 허용 키 집합: EffectivePolicyService를 통해 계산 */
export function useAllowed(nodeId: NodeId): Set<string> {
    const { reader } = useRightControllerFactory(RightDomain.Policy);

    const project = reader.getProject();
    const ui = reader.getUI();
    const { mode, expertMode } = ui;

    return React.useMemo(() => {
        if (!nodeId)
            return new Set<string>();
        const force = !!ui?.inspector?.forceTagPolicy;
        return getAllowedStyleKeysForNode(project, nodeId, { expertMode, force });
    }, [project, nodeId, mode, expertMode, ui?.inspector?.forceTagPolicy]);
}

export function reasonForKey(
    project: Project,
    ui: EditorUI,
    nodeId: NodeId,
    key: string,
    expert: boolean
): DisallowReason {
    const policyInfo = getEffectivePoliciesForNode(project, nodeId);
    if (!policyInfo) return null;

    const { tagPolicy, componentPolicy } = policyInfo;

    // ComponentPolicy에 의해 숨김(페이지 모드 & 비-Expert)
    if (ui.mode === 'Page' && !expert && componentPolicy?.inspector?.controls?.[key]?.visible === false) {
        return 'component';
    }

    // TagPolicy에 의해 제한
    if (tagPolicy?.styles) {
        const deny = tagPolicy.styles.deny ?? [];
        if (deny.includes(key)) return 'tag';

        // allow가 *가 아니고, 명시 포함도 아닐 때
        const allow = tagPolicy.styles.allow;
        if (allow && !allow.includes('*') && !allow.includes(key)) return 'tag';
    }

    return null;
}

// 개발 모드에 따른 상단 보더 색상 클래스 (공통 유틸)
export function modeBorderClass(mode?: string) {
    return mode === 'Page' ? 'border-t-blue-500' : 'border-t-purple-500';
}