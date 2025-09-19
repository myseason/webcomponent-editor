'use client';

import React from 'react';
import { ImageUp } from 'lucide-react';

import type { PropertySpec } from './types';
import { getIconFor } from '../util/inspectorIcons';
import { freeInputClass, getOptions, normalizeColor } from './logic';
import { FileUploadButton } from './ui';

/** option.iconKey 를 해석해 아이콘을 가져온다 */
function resolveIconByKey(
    iconKey: string | undefined,
    fallbackGroup: string,
    propKey: string,
    fallbackValue: string
) {
    if (!iconKey || iconKey.trim() === '') {
        return getIconFor(fallbackGroup, propKey, fallbackValue);
    }
    const h = iconKey.trim();
    const hasDot = h.includes('.');
    const hasColon = h.includes(':');
    if (hasDot && hasColon) {
        const [g, rest] = h.split('.', 2);
        const [p, v] = rest.split(':', 2);
        if (g && p && v) return getIconFor(g.toLowerCase(), p, v);
    }
    // value-only 힌트로 처리
    return getIconFor(fallbackGroup, propKey, h);
}

type RatioSpec = {
    control: 'ratio';
    placeholder?: string;
    presets?: Array<{ value: string; label?: string }>;
    ui?: { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' };
};

// ─────────────────────────────────────────────────────────────
// RatioControl: "width/height" 형태 전용 UI
// ─────────────────────────────────────────────────────────────
const RatioControl: React.FC<{
    value: string;
    onChange: (v: string) => void;
    spec: RatioSpec;
    disabled?: boolean;
}> = ({ value, onChange, spec, disabled }) => {
    // value 예: "16/9" | "1/1" | "" 등
    const parse = React.useCallback((raw: string) => {
        const t = (raw || '').trim();
        if (!t) return { a: '', b: '' };
        const m = t.split('/');
        return { a: m[0] ?? '', b: m[1] ?? '' };
    }, []);

    const { a: initA, b: initB } = React.useMemo(() => parse(value), [value, parse]);
    const [a, setA] = React.useState(initA);
    const [b, setB] = React.useState(initB);

    // 외부 value 변화에 동기화
    React.useEffect(() => {
        const { a: na, b: nb } = parse(value);
        setA(na);
        setB(nb);
    }, [value, parse]);

    const commit = React.useCallback(
        (na: string, nb: string) => {
            const sa = String(na ?? '').trim();
            const sb = String(nb ?? '').trim();
            if (!sa && !sb) {
                onChange('');
                return;
            }
            if (sa && !sb) {
                onChange(`${sa}/`); // 미완성도 반영(원하면 '' 처리로 바꿔도 됨)
                return;
            }
            if (!sa && sb) {
                onChange(`/${sb}`);
                return;
            }
            onChange(`${sa}/${sb}`);
        },
        [onChange]
    );

    const size = spec.ui?.size ?? 'xs';
    const sizeCls =
        size === 'xs' ? 'h-6 text-[11px]' :
            size === 'sm' ? 'h-7 text-[12px]' :
                size === 'md' ? 'h-8 text-[13px]' :
                    size === 'lg' ? 'h-9 text-[14px]' : 'h-10 text-[14px]';

    return (
        <div className="flex items-center gap-1">
            {/* 프리셋 칩(선택) */}
            {Array.isArray(spec.presets) && spec.presets.length > 0 && (
                <div className="ml-1 flex flex-wrap gap-1">
                    {spec.presets.map((p, idx) => (
                        <button
                            key={`ratio:preset:${idx}:${p.value}`}
                            type="button"
                            className={`px-1.5 ${sizeCls} leading-none border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-50`}
                            onClick={() => onChange(p.value)}
                            disabled={disabled}
                            title={p.value}
                        >
                            {p.label ?? p.value}
                        </button>
                    ))}
                </div>
            )}
            <input
                className={`${sizeCls} px-1 border border-neutral-200 rounded w-10 min-w-0`}
                inputMode="numeric"
                placeholder="W"
                value={a}
                onChange={(e) => {
                    const nv = e.currentTarget.value.replace(/[^\d.]/g, '');
                    setA(nv);
                    commit(nv, b);
                }}
                disabled={disabled}
            />
            <div className="px-1 text-neutral-500">/</div>
            <input
                className={`${sizeCls} px-1 border border-neutral-200 rounded w-10 min-w-0`}
                inputMode="numeric"
                placeholder="H"
                value={b}
                onChange={(e) => {
                    const nv = e.currentTarget.value.replace(/[^\d.]/g, '');
                    setB(nv);
                    commit(a, nv);
                }}
                disabled={disabled}
            />
        </div>
    );
};

/** 값 컨트롤 렌더러 */
export function renderValueControl(
    sectionKey: string,
    propKey: string,
    spec: PropertySpec,
    value: string | undefined,
    onChange: (v: string) => void,
    disabled?: boolean
) {
    const group = sectionKey.toLowerCase();

    // INPUT
    if (spec.control === 'input') {
        const showUpload = spec.ui?.uploadButton?.enabled;
        if (!showUpload) {
            return (
                <input
                    type={spec.ui?.inputType === 'number' ? 'number' : 'text'}
                    className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full"
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={spec.placeholder || spec.description}
                    disabled={disabled}
                />
            );
        }

        const accept   = spec.ui?.uploadButton?.accept ?? 'image/*';
        const toValue  = spec.ui?.uploadButton?.toValue ?? 'url()';
        const template = spec.ui?.uploadButton?.template;
        const iconKey  = spec.ui?.uploadButton?.iconKey;
        const uploaderKey = spec.ui?.uploadButton?.uploaderKey;

        const UploadIcon =
            (iconKey && getIconFor(sectionKey.toLowerCase(), propKey, iconKey)) || ImageUp;

        return (
            <div className="flex items-center gap-[6px] w-full">
                <input
                    type={spec.ui?.inputType === 'number' ? 'number' : 'text'}
                    className="h-6 px-1 border border-neutral-200 rounded text-[11px] flex-1 min-w-0"
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={spec.placeholder || spec.description}
                    disabled={disabled}
                />
                <FileUploadButton
                    accept={accept}
                    title="파일 업로드"
                    Icon={UploadIcon}
                    onFile={async (file) => {
                        const globalAny = window as any;
                        if (uploaderKey && typeof globalAny?.__editorUpload === 'function') {
                            try {
                                const cdnUrl: string = await globalAny.__editorUpload(file, uploaderKey);
                                const v = template ? template.replace('${src}', cdnUrl) : `url(${cdnUrl})`;
                                onChange(v);
                                return;
                            } catch {
                                // 폴백 아래로
                            }
                        }
                        // 폴백: objectURL/dataURL 또는 url()
                        const { fileToValue } = await import('./logic');
                        const v = await fileToValue(file, toValue as any, template);
                        if (toValue === 'url()' && !/^url\(/.test(v)) {
                            onChange(`url(${v})`);
                        } else {
                            onChange(v);
                        }
                    }}
                />
            </div>
        );
    }

    // SELECT
    if (spec.control === 'select') {
        const opts = getOptions(spec);
        return (
            <select
                className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
            >
                <option value="">{'(unset)'}</option>
                {opts.map((op, i) => {
                    const val = String(op.value);
                    const label = (op.label?.ko ?? op.label?.en ?? val);
                    return (
                        <option key={`${propKey}:opt:${val}:${i}`} value={val} disabled={op.disabled}>
                            {label}
                        </option>
                    );
                })}
            </select>
        );
    }

    // CHIPS / ICONS
    if (spec.control === 'chips' || spec.control === 'icons') {
        const opts = getOptions(spec);
        const Chips = (
            <div className="flex flex-wrap items-center gap-[4px] min-w-0 max-w-full">
                {opts.map((op, idx) => {
                    const val = String(op.value);
                    const active = val === value;
                    const wantIcon = spec.control === 'icons' || !!op.iconKey;
                    const Icon = wantIcon ? resolveIconByKey(op.iconKey, group, propKey, val) : null;
                    const label = (op.label?.ko ?? op.label?.en ?? val);

                    return (
                        <button
                            key={`${propKey}:chip:${val}:${idx}`}
                            className={`h-6 px-1.5 rounded border text-[10px] flex items-center gap-1 ${
                                disabled
                                    ? 'opacity-60 cursor-not-allowed border-neutral-200 bg-neutral-50'
                                    : active
                                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                                        : 'border-neutral-200 hover:bg-neutral-50'
                            }`}
                            title={label}
                            onClick={() => !disabled && !op.disabled && onChange(val)}
                            disabled={disabled || op.disabled}
                            type="button"
                        >
                            {Icon ? <Icon size={12} className="shrink-0" /> : null}
                            {!Icon ? label : null}
                        </button>
                    );
                })}
            </div>
        );

        // extra input
        if (spec.ui?.extraInput?.enabled) {
            const ei = spec.ui.extraInput;
            return (
                <div className="flex items-center gap-[6px] w-full min-w-0 max-w-full">
                    {Chips}
                    <input
                        className={`h-6 px-1 border border-neutral-200 rounded text-[11px] ${freeInputClass(ei?.size)} flex-1 min-w-0`}
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={ei?.placeholder || spec.placeholder || spec.description}
                        disabled={disabled}
                        type={ei?.type === 'number' ? 'number' : 'text'}
                    />
                </div>
            );
        }

        return Chips;
    }

    // COLOR
    const isColor = propKey.toLowerCase().includes('color');
    if (spec.control === 'color' || isColor) {
        return (
            <div className="flex items-center gap-2 w-full min-w-0">
                <input
                    type="color"
                    className="h-6 w-7 p-0 border border-neutral-200 rounded"
                    value={normalizeColor(value)}
                    onChange={(e) => onChange(e.target.value)}
                    title="Pick color"
                    disabled={disabled}
                />
                <input
                    type="text"
                    className="h-6 px-1 border border-neutral-200 rounded text-[11px] flex-1 min-w-0"
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={spec.placeholder || spec.description || '#000000'}
                    disabled={disabled}
                />
            </div>
        );
    }

    // RATIO
    if(spec.control === 'ratio') {
        return (
            <RatioControl
                value={value ?? ''}
                onChange={onChange}
                spec={spec as RatioSpec}
                disabled={disabled}
            />
        );
    }

    // SHORTHAND
    if (spec.shorthand?.enabled) {
        const placeholder = spec.shorthand.examples?.[0] ?? spec.shorthand.syntax ?? 'shorthand';
        const hint = spec.shorthand.syntax;
        return (
            <input
                className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                placeholder={placeholder}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                title={hint}
                disabled={disabled}
                type={spec.ui?.inputType === 'number' ? 'number' : 'text'}
            />
        );
    }

    // 기본 input
    return (
        <input
            type={spec.ui?.inputType === 'number' ? 'number' : 'text'}
            className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={spec.placeholder || spec.description}
            disabled={disabled}
        />
    );
}