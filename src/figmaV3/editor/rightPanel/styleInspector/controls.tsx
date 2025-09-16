'use client';

import React from 'react';
import type { PropertySpec } from './InspectorStyle';
import { ImageUp } from 'lucide-react';
import { getIconFor } from './InspectorStyleIcons';
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