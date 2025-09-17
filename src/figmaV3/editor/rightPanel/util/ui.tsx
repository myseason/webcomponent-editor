'use client';

import React from 'react';
import {
    Lock, Unlock, ChevronDown, ChevronRight, Info, Wand2,
} from 'lucide-react';

import { PropertySpec, StyleValues, SetStyleValue } from "./types";
import {renderValueControl} from "./controls";

export const RowShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="grid grid-cols-9 gap-[4px] py-[4px] px-[6px] border-b border-neutral-100 items-center overflow-x-hidden">
        {children}
    </div>
);

export const LeftCell: React.FC<{ title: string; subtitle?: string; tooltip?: string }> = ({ title, subtitle, tooltip }) => (
    <div className="col-span-2 flex flex-col justify-center min-w-0">
        <div className="text-[11px] font-medium leading-[14px] text-neutral-800 truncate" title={tooltip || title}>
            {title}
        </div>
        {subtitle ? <div className="text-[10px] text-neutral-500 ml-[8px] leading-[12px] truncate">{subtitle}</div> : null}
    </div>
);

export const RightCell: React.FC<{
    children: React.ReactNode;
    onToggleDetail?: () => void;
    detailActive?: boolean;
}> = ({ children, onToggleDetail, detailActive }) => (
    <div className="col-span-7 grid grid-cols-10 items-center gap-[4px] min-w-0">
        <div className="col-span-9 min-w-0 flex items-center">{children}</div>
        <div className="col-span-1 flex justify-center">
            {onToggleDetail ? (
                <button
                    className={`p-1 rounded hover:bg-neutral-100 ${detailActive ? 'text-blue-600' : ''}`}
                    title="상세"
                    onClick={onToggleDetail}
                    type="button"
                >
                    {detailActive ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
            ) : null}
        </div>
    </div>
);

// --- 추가: 3:7 행 레이아웃 (좌측 3, 우측 7) ---
export const RowShell3x7: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="grid grid-cols-10 gap-[4px] py-[4px] px-[6px] border-b border-neutral-100 items-center overflow-x-hidden">
        {children}
    </div>
);

// --- 추가: 좌측 셀(제목/부제 + 우측 끝 Lock 버튼 고정) ---
export const LeftLockCell: React.FC<{
    title: string;
    subtitle?: string;
    tooltip?: string;
    locked?: boolean;
    onToggleLock?: () => void;
}> = ({ title, subtitle, tooltip, locked, onToggleLock }) => (
    <div className="col-span-3 min-w-0">
        <div className="flex items-start">
            <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium leading-[14px] text-neutral-800 truncate" title={tooltip || title}>
                    {title}
                </div>
                {subtitle ? (
                    <div className="text-[10px] text-neutral-500 ml-[8px] leading-[12px] truncate">{subtitle}</div>
                ) : null}
            </div>
            <div className="ml-2 shrink-0">
                {onToggleLock ? (
                    <button
                        className="p-1 rounded hover:bg-neutral-100"
                        title={locked ? 'Unlock' : 'Lock'}
                        onClick={onToggleLock}
                        type="button"
                    >
                        {locked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                ) : null}
            </div>
        </div>
    </div>
);

// --- 추가: 우측 셀(7) → 9:1 분할 + 9 내부 6등분 그리드 + 상세 버튼 ---
export const RightControlsWithDetail: React.FC<{
    // 6등분 그리드에 들어갈 컨트롤 아이템들(라벨/셀렉트/인풋/칩 등)
    children: React.ReactNode;
    onToggleDetail?: () => void;
    detailActive?: boolean;
}> = ({ children, onToggleDetail, detailActive }) => (
    <div className="col-span-7 grid grid-cols-10 items-center gap-[4px] min-w-0">
        {/* 9 : 컨트롤 영역(내부 6칸 균등) */}
        <div className="col-span-9 min-w-0">
            <div className="grid grid-cols-6 gap-[6px] min-w-0 items-center">
                {children}
            </div>
        </div>
        {/* 1 : 상세 버튼 */}
        <div className="col-span-1 flex justify-center">
            {onToggleDetail ? (
                <button
                    className={`p-1 rounded hover:bg-neutral-100 ${detailActive ? 'text-blue-600' : ''}`}
                    title="상세"
                    onClick={onToggleDetail}
                    type="button"
                >
                    {detailActive ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
            ) : null}
        </div>
    </div>
);

// --- 선택: 6칸 그리드 안에서 각 셀(컨트롤)의 최소/최대폭을 일관되게 ---
export const ControlCell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-w-0 overflow-hidden">{children}</div>
);

export const SectionFrame: React.FC<{
    title: string;
    Icon?: React.ComponentType<{ size?: number; className?: string }>;
    collapsed?: boolean;
    onToggle?: () => void;
    children: React.ReactNode;
}> = ({ title, Icon, collapsed, onToggle, children }) => (
    <section className="mb-5">
        <div className="rounded-lg bg-neutral-50 border border-neutral-200">
            <div className="px-3 py-1.5">
                <div className="flex items-center">
                    {Icon ? <Icon size={14} className="text-neutral-700 mr-2" /> : null}
                    <div className="text-[12px] font-bold text-neutral-900">{title}</div>
                    <div className="ml-auto">
                        <button
                            className="p-1 rounded hover:bg-neutral-100"
                            title={collapsed ? '펼치기' : '접기'}
                            onClick={onToggle}
                            type="button"
                        >
                            {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                        </button>
                    </div>
                </div>
            </div>
            {!collapsed && (
                <div className="p-2">
                    <div className="rounded-lg border border-neutral-200 bg-white overflow-x-hidden">{children}</div>
                </div>
            )}
        </div>
    </section>
);

export const GroupHeader: React.FC<{
    label: string;
    Icon?: React.ComponentType<{ size?: number; className?: string }>;
    locked?: boolean;
    onToggleLock?: () => void;
}> = ({ label, Icon, locked, onToggleLock }) => {
    return (
        <div className="px-3 py-2 border-b border-neutral-200 bg-transparent">
            <div className="flex items-center">
                {Icon ? <Icon size={13} className="text-neutral-700 mr-2" /> : null}
                <div className="text-[11px] font-semibold text-neutral-800">{label}</div>
                <div className="ml-auto">
                    <button
                        className="p-1 rounded hover:bg-neutral-100"
                        title={locked ? 'Unlock' : 'Lock'}
                        onClick={onToggleLock}
                        type="button"
                    >
                        {locked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

/** 라벨+아이콘 작은 인라인 블럭 */
export const InlineInfo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="text-[10px] text-neutral-500 mb-1 flex items-center gap-1">
        <Info size={12} />
        {children}
    </div>
);

/** 재사용 가능한 업로드 버튼(아이콘 주입 가능) */
export const FileUploadButton: React.FC<{
    accept?: string;
    title?: string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    onFile: (file: File) => void;
}> = ({ accept = 'image/*', title = '파일 업로드', Icon, onFile }) => {
    const inputId = React.useId();
    return (
        <>
            <input
                id={inputId}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                    e.currentTarget.value = '';
                }}
            />
            <label
                htmlFor={inputId}
                className="inline-flex items-center justify-center h-6 w-6 rounded border border-neutral-200 hover:bg-neutral-50 cursor-pointer"
                title={title}
            >
                <Icon size={14} />
            </label>
        </>
    );
};

// ── 섹션 공통 블록 컴포넌트 ────────────────────────────────
const DependentBlock: React.FC<{
    title?: string;
    propsMap: Record<string, PropertySpec>;
    values: StyleValues;
    setValue: SetStyleValue;
    sectionKey: string;
    disabled?: boolean;
}> = ({ title, propsMap, values, setValue, sectionKey, disabled }) => {
    const entries = Object.entries(propsMap);
    if (entries.length === 0) return null;

    return (
        <div className="ml-4 border-l border-neutral-200 pl-3 mt-1">
            {title ? <InlineInfo>{title}</InlineInfo> : null}
            {entries.map(([k, p]) => {
                const v = values[k];
                return (
                    <RowShell key={`dep:${sectionKey}:${k}`}>
                        <LeftCell title={p.label?.ko ?? p.label?.en ?? k} tooltip={p.ui?.tooltip} />
                        <RightCell>
                            {renderValueControl(sectionKey, k, p, String(v ?? ''), (nv) => setValue(k, nv), disabled)}
                        </RightCell>
                    </RowShell>
                );
            })}
        </div>
    );
};

//----------------------------------------------------------------------
// DetailBlock
//---------------------------------------------------------------------
export const DetailBlock: React.FC<{
    propsMap?: Record<string, PropertySpec>;
    values: StyleValues;
    setValue: SetStyleValue;
    sectionKey: string;
    disabled?: boolean;
    getDependentsFor?: (propKey: string, curVal?: string) => Array<{ title?: string; properties: Record<string, PropertySpec> }>;
    variant?: 'plain' | 'smart'; // ★ 추가
}> = ({ propsMap, values, setValue, sectionKey, disabled, getDependentsFor, variant = 'plain' }) => {
    if (!propsMap) return null;
    const entries = Object.entries(propsMap);
    if (entries.length === 0) return null;

    return (
        <div className="ml-4 border-l border-dashed border-neutral-200 pl-3 mt-2">
            {variant === 'smart' && (
                <div className="text-[10px] text-neutral-500 mb-1 flex items-center gap-1">
                    <Wand2 size={12} />
                    상세
                </div>
            )}

            {entries.map(([k, p]) => {
                const v = values[k];
                return (
                    <div key={`detail:${sectionKey}:${k}`}>
                        <RowShell>
                            <LeftCell title={p.label?.ko ?? p.label?.en ?? k} tooltip={p.ui?.tooltip} />
                            <RightCell>
                                {renderValueControl(sectionKey, k, p, String(v ?? ''), (nv) => setValue(k, nv), disabled)}
                            </RightCell>
                        </RowShell>

                        {getDependentsFor &&
                            getDependentsFor(k, String(v ?? ''))?.map((dg, idx) => (
                                <DependentBlock
                                    key={`detail-dep:${sectionKey}:${k}:${idx}`}
                                    title={dg.title}
                                    propsMap={dg.properties}
                                    values={values}
                                    setValue={setValue}
                                    sectionKey={sectionKey}
                                    disabled={disabled}
                                />
                            ))}
                    </div>
                );
            })}
        </div>
    );
};