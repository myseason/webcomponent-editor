'use client';

import React from 'react';
import type {
    InspectorFilter,
    TagPolicy,
    TagPolicyMap,
    CSSDict,
    ComponentPolicy,
    NodeId,
    Project, // ✨ [추가]
    EditorUI, // ✨ [추가]
} from '../../../../core/types';
import { getAllowedStyleKeysForNode, getEffectivePoliciesForNode } from '../../../../runtime/capabilities';
import { Lock, Unlock } from 'lucide-react';
import { useEditor } from '../../../useEditor';

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
            className="flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer select-none"
            onClick={onToggle}
        >
            <span>{open ? '▾' : '▸'} {title}</span>
        </div>
        {open && <div className="mt-1">{children}</div>}
    </section>
);

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="text-xs text-neutral-600 w-24 select-none">{children}</span>
);

export const DisabledHint: React.FC<{ reason: 'template' | 'tag' | 'component' }> = ({ reason }) => (
    <span
        className="text-[10px] px-1 py-0.5 rounded border border-neutral-200 text-neutral-500"
        title={
            reason === 'tag' ? 'TagPolicy에 의해 제한' :
                reason === 'component' ? 'ComponentPolicy에 의해 제한' :
                    'Template 필터에 의해 제한'
        }
    >
        {
            reason === 'tag' ? '⛔ Tag' :
                reason === 'component' ? '🔒 Comp' :
                    '▣ Tpl'
        }
    </span>
);

export const PermissionLock: React.FC<{
    componentId: string;
    controlKey: string;
}> = ({ componentId, controlKey }) => {
    const { project, updateComponentPolicy } = useEditor();

    const isVisible = project.policies?.components?.[componentId]?.inspector?.controls?.[controlKey]?.visible !== false;

    const toggleVisibility = () => {
        const patch: Partial<ComponentPolicy> = {
            inspector: {
                controls: {
                    [controlKey]: {
                        visible: !isVisible
                    }
                }
            }
        };
        updateComponentPolicy(componentId, patch);
    };

    return (
        <button
            onClick={toggleVisibility}
            className="p-1 rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            title={isVisible ? `Lock control for Page Builders` : `Unlock control for Page Builders`}
        >
            {isVisible ? <Unlock size={12} /> : <Lock size={12} />}
        </button>
    );
};


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
        type="text"
        value={value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        title={title}
        className={
            `border rounded px-2 py-1 text-sm w-28 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ` +
            (className ?? '')
        }
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
        value={Number.isFinite(value ?? NaN) ? (value as number) : 0}
        onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isNaN(n)) return onChange(NaN);
            let v = n;
            if (typeof min === 'number') v = Math.max(min, v);
            if (typeof max === 'number') v = Math.min(max, v);
            onChange(v);
        }}
        disabled={disabled}
        title={title}
        className={`border rounded px-2 py-1 text-sm w-24 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className ?? ''}`}
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
        className={`border rounded px-2 py-1 text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className ?? ''}`}
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
        type="button"
        title={title}
        onClick={onClick}
        disabled={disabled}
        className={[
            'px-2 py-0.5 text-xs rounded border',
            active ? 'bg-neutral-800 text-white border-neutral-900' : 'hover:bg-neutral-50 border-neutral-200',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
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
        className={[
            'h-7 w-7 inline-flex items-center justify-center rounded border',
            active ? 'bg-neutral-800 text-white border-neutral-900' : 'hover:bg-neutral-50 border-neutral-200',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
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
    const isHex =
        typeof value === 'string' &&
        /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
    const safeHex = isHex ? (value as string) : '#000000';
    return (
        <div className="flex items-center gap-2">
            <input
                type="color"
                value={safeHex}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                title={title}
            />
            <input
                type="text"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="#000000"
                disabled={disabled}
                title={title}
                className={`border rounded px-2 py-1 text-sm w-28 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
        </div>
    );
};

/* ────────────────────────────────────────────────────
 * 허용/제한 판단 유틸
 * ──────────────────────────────────────────────────── */

export type DisallowReason = 'template' | 'tag' | 'component' | null;

export function useAllowed(nodeId: NodeId): Set<string> {
    const { project, ui } = useEditor();
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

/**
 * ✨ [수정] useEditor Hook을 호출하는 대신 project와 ui 상태를 인자로 받도록 변경
 */
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

    if (ui.mode === 'Page' && !expert && componentPolicy?.inspector?.controls?.[key]?.visible === false) {
        return 'component';
    }

    if (tagPolicy?.styles) {
        if (tagPolicy.styles.deny?.includes(key)) return 'tag';
        if (tagPolicy.styles.allow && !tagPolicy.styles.allow.includes('*') && !tagPolicy.styles.allow.includes(key)) return 'tag';
    }

    return null;
}