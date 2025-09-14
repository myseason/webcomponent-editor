'use client';

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { modeBorderClass } from '../../../ui/uiUtils';
import {RightDomain, useRightControllerFactory} from '@/figmaV3/controllers/right/RightControllerFactory';

type SectionShellV1Props = {
    title: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    className?: string;
};

/**
 * V1 레이아웃 프리미티브 (비침투성)
 * - 기존 common.tsx와의 호환을 위해 "새 파일"로만 추가
 * - 기존 함수/타입/스타일은 절대 삭제/변경하지 않음
 *
 * 규칙:
 * - 좌측 타이틀 블록(아이콘|제목) 고정폭 80px
 * - 우측 편집 폼은 grid-cols-6 (gap 2px)
 * - 입력 기본폭 tiny(~4ch) — 단, fullWidth가 true면 셀 폭을 꽉 채움
 * - 칩/아이콘 5개 초과 시 마지막 칸은 수동입력(또는 Select+입력)
 */

export function SectionShellV1({ title, open, onToggle, children, className }: SectionShellV1Props) {
    const { reader } = useRightControllerFactory(RightDomain.Inspector);
    const R = reader;

    const ui = R.getUI();
    const borderColor = modeBorderClass(ui?.mode); // 🔹 모드별 상단 보더 색상 결정

    return (
        <section
            className={[
                'rounded-sm bg-white',
                'overflow-hidden',
                'border-t-2', // 상단 보더는 2px로
                borderColor, // 🔹 모드별 컬러 적용
                className || '',
            ].join(' ')}
        >
            <header
                className="flex h-8 items-center justify-between px-2 text-[12px] font-medium cursor-pointer select-none"
                onClick={onToggle}
            >
                <div className="truncate">{title}</div>
                <div className="text-gray-400">{open ? '▾' : '▸'}</div>
            </header>

            {open && <div className="px-2 pb-2 pt-1">{children}</div>}
        </section>
    );
}

/* ───────── Row & Columns ───────── */

export const RowV1: React.FC<{
    children: React.ReactNode;
    className?: string;
    withDivider?: boolean;
}> = ({ children, className, withDivider = true }) => {
    return (
        <div
            className={`flex items-center min-w-0 py-1 ${
                withDivider ? 'border-b border-dashed border-[var(--mdt-color-border)]' : ''
            } gap-[2px] ${className ?? ''}`}
        >
            {children}
        </div>
    );
};

export const RowLeftV1: React.FC<{
    icon?: React.ReactNode;
    title: React.ReactNode;
    className?: string;
}> = ({ icon, title, className }) => {
    return (
        <div
            className={`flex items-center pl-[2px] w-[80px] min-w-[80px] flex-none ${className ?? ''}`}
            title={typeof title === 'string' ? title : undefined}
        >
            {icon ? <span className="inline-flex items-center">{icon}</span> : null}
            <span className="text-[12px] ml-[4px] truncate">{title}</span>
        </div>
    );
};

export const RowRightGridV1: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className }) => {
    return (
        <div className={`grid grid-cols-6 gap-[2px] flex-1 min-w-0 ${className ?? ''}`}>
            {children}
        </div>
    );
};

export const RowRightFlexV1: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className }) => {
    return (
        <div className={`flex items-center gap-[4px] flex-wrap flex-1 min-w-0 ${className ?? ''}`}>
            {children}
        </div>
    );
};

/* ───────── Small Form Controls (충돌 방지 위해 접미사 V1) ───────── */

export type MiniInputV1Props = {
    value: string | number | undefined;
    onChange: (v: string) => void;
    placeholder?: string;
    disabled?: boolean;
    title?: string;
    className?: string;
    numeric?: boolean; // 숫자 전용 힌트
    size?: 'tiny' | 'auto' | 'full';
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    /** 기본값 true — 그리드 셀 폭을 꽉 채움 */
    fullWidth?: boolean;
};

export const MiniInputV1: React.FC<MiniInputV1Props> = ({
                                                            value,
                                                            onChange,
                                                            placeholder,
                                                            disabled,
                                                            title,
                                                            className,
                                                            numeric = false,
                                                            size = 'tiny',
                                                            onBlur,
                                                            fullWidth = true,
                                                        }) => {
    const baseTiny = 'w-[56px]'; // ~4~5ch
    const sizeClass =
        size === 'full' || fullWidth ? 'w-full block min-w-0' : size === 'auto' ? '' : baseTiny;

    return (
        <input
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            title={title}
            inputMode={numeric ? 'numeric' : undefined}
            pattern={numeric ? '[0-9]*' : undefined}
            className={`h-[28px] text-[12px] px-2 rounded border border-[var(--mdt-color-border)] bg-white ${sizeClass} ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
            } ${className ?? ''}`}
        />
    );
};

export const MiniSelectV1: React.FC<{
    value: string | number | undefined;
    options: Array<string | number | { value: string | number; label?: string }>;
    onChange: (v: string) => void;
    disabled?: boolean;
    title?: string;
    className?: string;
    /** 기본값 true — 그리드 셀 폭을 꽉 채움 */
    fullWidth?: boolean;
}> = ({ value, options, onChange, disabled, title, className, fullWidth = true }) => {
    // 옵션 정규화: string/number 또는 {value,label}
    const norm = (options ?? []).map((op, idx) => {
        if (typeof op === 'string' || typeof op === 'number') {
            const v = String(op);
            return { key: `s:${v}:${idx}`, value: v, label: v };
        }
        const v = String((op as any)?.value ?? '');
        const label =
            (op as any) && 'label' in (op as any) && (op as any).label != null
                ? String((op as any).label)
                : v;
        return { key: `o:${v}:${idx}`, value: v, label };
    });

    return (
        <select
            value={value == null ? '' : String(value)}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            title={title}
            className={`h-[28px] text-[12px] px-1 rounded border border-[var(--mdt-color-border)] bg-white ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
            } ${fullWidth ? 'w-full block min-w-0' : ''} ${className ?? ''}`}
        >
            {value === undefined && <option value="">{'(unset)'}</option>}
            {norm.map((op) => (
                <option key={op.key} value={op.value}>
                    {op.label}
                </option>
            ))}
        </select>
    );
};

export const ChipBtnV1: React.FC<{
    active?: boolean;
    disabled?: boolean;
    title: string;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ active, disabled, title, onClick, children }) => (
    <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={onClick}
        className={`h-[28px] px-2 text-[12px] rounded border ${
            active
                ? 'bg-[var(--mdt-color-accent-weak)] border-[var(--mdt-color-accent)]'
                : 'bg-white border-[var(--mdt-color-border)]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        {children}
    </button>
);

export const IconBtnV1: React.FC<{
    active?: boolean;
    title: string;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    children: React.ReactNode;
    disabled?: boolean;
    square24?: boolean; // true면 24x24
}> = ({ active, title, onClick, children, disabled, square24 = true }) => (
    <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={onClick}
        className={`${
            square24 ? 'h-[24px] w-[24px]' : 'h-[28px] w-[28px]'
        } inline-flex items-center justify-center rounded border ${
            active
                ? 'bg-[var(--mdt-color-accent-weak)] border-[var(--mdt-color-accent)]'
                : 'bg-white border-[var(--mdt-color-border)]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        {children}
    </button>
);

/* ───────── “5개 초과 → 5개 + 수동입력” 유틸 ───────── */

export function LimitedIconGridV1(props: {
    items: { key: string; title: string; node: React.ReactNode; active?: boolean; onClick: React.MouseEventHandler<HTMLButtonElement> }[];
    onManualChange: (v: string) => void;
    manualValue?: string;
    manualPlaceholder?: string;
    manualDisabled?: boolean;
    use24?: boolean; // 24x24 아이콘
}) {
    const { items, onManualChange, manualValue, manualPlaceholder, manualDisabled, use24 } = props;
    const cap = 5;
    const visible = items.slice(0, Math.min(cap, items.length));
    const showManual = items.length > cap;

    return (
        <>
            {visible.map((it) => (
                <IconBtnV1
                    key={it.key}
                    title={it.title}
                    onClick={it.onClick}
                    active={it.active}
                    disabled={false}
                    square24={use24}
                >
                    {it.node}
                </IconBtnV1>
            ))}
            {showManual && (
                <MiniInputV1
                    value={manualValue}
                    onChange={onManualChange}
                    placeholder={manualPlaceholder}
                    disabled={manualDisabled}
                    size="tiny"
                />
            )}
        </>
    );
}

export function LimitedChipGridV1(props: {
    items: { key: string; title: string; label: string; active?: boolean; onClick: () => void }[];
    mode: 'input' | 'select';
    manualValue?: string;
    onManualChange?: (v: string) => void;
    manualPlaceholder?: string;
    selectValue?: string;
    selectOptions?: string[];
    onSelectChange?: (v: string) => void;
}) {
    const {
        items,
        mode,
        manualValue,
        onManualChange,
        manualPlaceholder,
        selectValue,
        selectOptions,
        onSelectChange,
    } = props;

    const cap = 5;
    const visible = items.slice(0, Math.min(cap, items.length));
    const showManual = items.length > cap;

    return (
        <>
            {visible.map((it) => (
                <ChipBtnV1
                    key={it.key}
                    title={it.title}
                    onClick={it.onClick}
                    active={!!it.active}
                >
                    {it.label}
                </ChipBtnV1>
            ))}
            {showManual &&
                (mode === 'input' ? (
                    <MiniInputV1
                        value={manualValue}
                        onChange={(v) => onManualChange?.(v)}
                        placeholder={manualPlaceholder}
                        size="tiny"
                    />
                ) : (
                    <div className="flex items-center gap-[2px]">
                        <MiniSelectV1
                            value={selectValue}
                            options={selectOptions ?? []}
                            onChange={(v) => onSelectChange?.(v)}
                            className="max-w-[85px]"
                        />
                        <MiniInputV1
                            value={manualValue}
                            onChange={(v) => onManualChange?.(v)}
                            placeholder={manualPlaceholder}
                            size="tiny"
                        />
                    </div>
                ))}
        </>
    );
}