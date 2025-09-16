'use client';

import React from 'react';
import {
    Lock, Unlock, ChevronDown, ChevronRight, Info,
} from 'lucide-react';

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