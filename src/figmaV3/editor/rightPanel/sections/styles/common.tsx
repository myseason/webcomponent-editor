'use client';

import React from 'react';
import type {ComponentPolicy, EditorUI, NodeId, Project,} from '../../../../core/types';
import {getAllowedStyleKeysForNode, getEffectivePoliciesForNode} from '../../../../runtime/capabilities';
import {Lock, Unlock} from 'lucide-react';
import styles from '../../../ui/theme.module.css';
import {RightDomain, useRightControllerFactory} from '@/figmaV3/controllers/right/RightControllerFactory';

/* ────────────────────────────────────────────────────
 * 공통 레이아웃 컴포넌트
 * ──────────────────────────────────────────────────── */

export const Section: React.FC<{
    title: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}> = ({ title, open, onToggle, children }) => (
    <section className="mt-3">
        <div
            className="flex items-center justify-between text-sm font-semibold text-[var(--mdt-color-text-primary)] cursor-pointer select-none py-1"
            onClick={onToggle}
        >
            <span>{open ? '▾' : '▸'} {title}</span>
        </div>
        {open && <div className="mt-1 space-y-3">{children}</div>}
    </section>
);

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className={`${styles.mdt_v1_label} w-24 select-none shrink-0`}>{children}</span>
);

export const DisabledHint: React.FC<{ reason: 'template' | 'tag' | 'component' }> = ({ reason }) => (
    <span
        className="text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--mdt-color-border)] text-[var(--mdt-color-text-secondary)]"
        title={
            reason === 'tag' ? 'TagPolicy에 의해 제한됨' :
                reason === 'component' ? 'ComponentPolicy에 의해 제한됨' :
                    'Template 필터에 의해 제한됨'
        }
    >
        {reason === 'tag' ? 'TAG' : reason === 'component' ? 'COMP' : 'TPL'}
    </span>
);

export const PermissionLock: React.FC<{
    componentId: string;
    controlKey: string;
}> = ({ componentId, controlKey }) => {
    const { reader, writer } = useRightControllerFactory(RightDomain.Inspector);
    const R = reader; const W = writer;

    const project = R.getProject();
    const updateComponentPolicy = W.updateComponentPolicy;
    const isVisible =
        project.policies?.components?.[componentId]?.inspector?.controls?.[controlKey]?.visible !== false;

    const toggleVisibility = () => {
        const patch: Partial<ComponentPolicy> = {
            inspector: {
                controls: { [controlKey]: { visible: !isVisible } },
            },
        };
        updateComponentPolicy(componentId, patch);
    };

    return (
        <button
            onClick={toggleVisibility}
            className="p-1 rounded text-[var(--mdt-color-text-secondary)] hover:bg-[var(--mdt-color-panel-secondary)] hover:text-[var(--mdt-color-text-primary)]"
            title={isVisible ? '페이지 빌더에게 이 컨트롤 숨기기' : '페이지 빌더에게 이 컨트롤 보이기'}
        >
            {isVisible ? <Unlock size={12} /> : <Lock size={12} />}
        </button>
    );
};

/* ────────────────────────────────────────────────────
 * 폼 위젯 (Webflow Style)
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
        type="text"
        value={value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        title={title}
        className={`${styles.mdt_v1_input} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className ?? ''}`}
    />
);

export const NumberInput: React.FC<{
    value: number | undefined;
    onChange: (v: number) => void;
    step?: number;
    min?: number;
    max?: number;
    className?: string;
    disabled?: boolean;
    title?: string;
}> = ({ value, onChange, step = 1, min, max, className, disabled, title }) => (
    <input
        type="number"
        step={step}
        value={Number.isFinite(value ?? NaN) ? (value as number) : ''}
        onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (Number.isNaN(n)) return onChange(NaN);
            let v = n;
            if (typeof min === 'number') v = Math.max(min, v);
            if (typeof max === 'number') v = Math.min(max, v);
            onChange(v);
        }}
        disabled={disabled}
        title={title}
        className={`${styles.mdt_v1_input} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className ?? ''}`}
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
        className={`${styles.mdt_v1_select} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className ?? ''}`}
    >
        {value === undefined && <option value="">{'(unset)'}</option>}
        {options.map((op) => (
            <option key={op} value={op}>{op}</option>
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
        type="button"
        title={title}
        onClick={onClick}
        disabled={disabled}
        className={`${styles.mdt_v1_button} ${active ? styles.mdt_v1_button_accent : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        type="button"
        title={title}
        onClick={onClick}
        disabled={disabled}
        className={`${styles.mdt_v1_button} h-8 w-8 p-1.5 ${active ? styles.mdt_v1_button_accent : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        <div className="flex items-center gap-2">
            <input
                type="color"
                value={safeHex}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                title={title}
                className="w-6 h-6 border rounded-md border-[var(--mdt-color-border)] cursor-pointer"
                style={{ backgroundColor: 'transparent' }}
            />
            <MiniInput
                value={value ?? ''}
                onChange={onChange}
                placeholder="#000000 or var(--name)"
                disabled={disabled}
                title={title}
                className="w-20"
            />
        </div>
    );
};

/* ────────────────────────────────────────────────────
 * 허용/제한 판단 유틸 (변경 없음)
 * ──────────────────────────────────────────────────── */
export type DisallowReason = 'template' | 'tag' | 'component' | null;

export function useAllowed(nodeId: NodeId): Set<string> {
    const { reader } = useRightControllerFactory(RightDomain.Policy);
    const R = reader;

    const project = R.getProject();
    const ui = R.getUI();
    const { mode, expertMode } = ui;

    return React.useMemo(() => {
        const policyInfo = getEffectivePoliciesForNode(project, nodeId);
        if (!policyInfo) return new Set();

        const baseAllowed = getAllowedStyleKeysForNode(project, nodeId, expertMode);

        if (mode === 'Page' && !expertMode) {
            const { componentPolicy } = policyInfo;
            if (componentPolicy?.inspector?.controls) {
                Object.entries(componentPolicy.inspector.controls).forEach(([key, control]) => {
                    if (control.visible === false) {
                        baseAllowed.delete(key);
                    }
                });
            }
        }
        return baseAllowed;
    }, [project, nodeId, mode, expertMode]);
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

    if (ui.mode === 'Page' && !expert && componentPolicy?.inspector?.controls?.[`styles:${key}`]?.visible === false) {
        return 'component';
    }

    if (tagPolicy?.styles) {
        if (tagPolicy.styles.deny?.includes(key)) return 'tag';
        if (tagPolicy.styles.allow && !tagPolicy.styles.allow.includes('*') && !tagPolicy.styles.allow.includes(key)) return 'tag';
    }

    return null;
}

// 🔹 개발 모드에 따른 상단 보더 색상 클래스 (공통 유틸)
export function modeBorderClass(mode?: string) {
    return mode === 'Page' ? 'border-t-blue-500' : 'border-t-purple-500';
}