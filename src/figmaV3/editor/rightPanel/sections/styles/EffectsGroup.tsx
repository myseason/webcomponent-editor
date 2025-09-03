'use client';

import React from 'react';
import type {
    CSSDict,
    InspectorFilter,
    TagPolicy,
    TagPolicyMap,
    NodeId,
} from '../../../../core/types';

import {
    useAllowed,
    DisabledHint,
    type DisallowReason,
    PermissionLock,
    reasonForKey,
    ColorField,
} from './common';

import { useEditor } from '../../../useEditor';

// 공통 레이아웃
import {
    SectionShellV1,
    RowV1,
    RowLeftV1,
    RowRightGridV1,
    MiniInputV1,
    MiniSelectV1,
    ChipBtnV1,
} from './layoutV1';

import { ShadowStack } from './ShadowStack';
import { FilterStack } from './FilterStack';

function s(v: unknown): string {
    if (v === undefined || v === null) return '';
    return String(v).trim();
}
function clamp01(n: number) {
    if (Number.isNaN(n)) return 1;
    return Math.max(0, Math.min(1, n));
}

/* gradient parse/build */
type GradType = 'linear' | 'radial';
type Stop = { color: string; pos: string };

function detectGradient(img: string): { has: boolean; type: GradType; angle: string; stops: Stop[] } {
    const str = s(img);
    if (!/gradient\(/i.test(str)) return { has: false, type: 'linear', angle: '180deg', stops: [] };

    const isLinear = /^linear-gradient/i.test(str);
    const type: GradType = isLinear ? 'linear' : 'radial';

    let angle = '180deg';
    let body = str.replace(/^[a-z-]+-gradient\s*\(/i, '').replace(/\)\s*$/, '');
    const parts = body.split(',');
    const first = s(parts[0]);

    const stopStartIdx = (() => {
        if (isLinear && /^[\d.]+deg$/i.test(first)) {
            angle = first;
            return 1;
        }
        return 0;
    })();

    const stops: Stop[] = parts.slice(stopStartIdx).map((token) => {
        const t = s(token);
        const m = t.match(
            /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsl[a]?\([^)]+\))\s*(\d+%?)?$/
        );
        const color = m?.[1] ?? t.split(/\s+/)[0] ?? '#000000';
        const pos = m?.[2] ?? '';
        return { color, pos };
    });

    return { has: true, type, angle, stops: stops.filter(Boolean).slice(0, 5) };
}
function buildGradient(g: { type: GradType; angle?: string; stops: Stop[] }) {
    const t = g.type === 'linear' ? 'linear-gradient' : 'radial-gradient';
    const head = g.type === 'linear' ? (g.angle ? `${g.angle}, ` : '') : '';
    const body = g.stops
        .filter((st) => s(st.color))
        .map((st) => (s(st.pos) ? `${s(st.color)} ${s(st.pos)}` : s(st.color)))
        .join(', ');
    return `${t}(${head}${body})`;
}

export function EffectsGroup(props: {
    el: Record<string, any>;
    patch: (css: CSSDict) => void;
    tag: string;
    tagPolicy: TagPolicy | undefined;
    tf: InspectorFilter | undefined;
    map: TagPolicyMap | undefined;
    expert: boolean;
    open: boolean;
    onToggle: () => void;
    nodeId: NodeId;
    componentId: string;
}) {
    const { el, patch, expert, open, onToggle, nodeId, componentId } = props;
    const { ui, project } = useEditor();
    const allow = useAllowed(nodeId);
    const dis = (k: string): DisallowReason => reasonForKey(project, ui, nodeId, k, expert);

    // current values
    const opacity = s((el as any).opacity);
    const boxShadow = s((el as any).boxShadow);
    const filter = s((el as any).filter);
    const backgroundImage = s((el as any).backgroundImage);

    // gradient state
    const parsed = React.useMemo(() => detectGradient(backgroundImage), [backgroundImage]);
    const [gType, setGType] = React.useState<GradType>(parsed.type);
    const [gAngle, setGAngle] = React.useState<string>(parsed.angle || '180deg');
    const [stops, setStops] = React.useState<Stop[]>(
        parsed.has && parsed.stops.length
            ? parsed.stops
            : [
                { color: '#000000', pos: '0%' },
                { color: '#ffffff', pos: '100%' },
            ]
    );

    React.useEffect(() => {
        const p = detectGradient(backgroundImage);
        setGType(p.type);
        setGAngle(p.angle || '180deg');
        setStops(
            p.has && p.stops.length
                ? p.stops
                : [
                    { color: '#000000', pos: '0%' },
                    { color: '#ffffff', pos: '100%' },
                ]
        );
    }, [backgroundImage]);

    const renderLock = (controlKey: string) => {
        if (ui.mode === 'Component') {
            return <PermissionLock controlKey={`styles:${controlKey}`} componentId={componentId} />;
        }
        return null;
    };

    const applyGradient = (next?: { type?: GradType; angle?: string; stops?: Stop[] }) => {
        const nt = next?.type ?? gType;
        const na = nt === 'linear' ? (next?.angle ?? gAngle) : undefined;
        const ns = next?.stops ?? stops;
        const val = buildGradient({ type: nt, angle: na, stops: ns });
        patch({ backgroundImage: val });
    };
    const updateStop = (idx: number, key: keyof Stop, val: string) => {
        setStops((prev) => {
            const arr = prev.slice();
            arr[idx] = { ...arr[idx], [key]: val };
            const nt = { type: gType, angle: gAngle, stops: arr };
            patch({ backgroundImage: buildGradient(nt) });
            return arr;
        });
    };
    const addStop = () => {
        setStops((prev) => {
            const next = prev.length >= 5 ? prev : [...prev, { color: '#888888', pos: '50%' }];
            patch({ backgroundImage: buildGradient({ type: gType, angle: gAngle, stops: next }) });
            return next;
        });
    };
    const removeStop = (idx: number) => {
        setStops((prev) => {
            const next = prev.filter((_, i) => i !== idx);
            patch({ backgroundImage: buildGradient({ type: gType, angle: gAngle, stops: next }) });
            return next;
        });
    };

    const anglePresets = ['0deg', '45deg', '90deg', '180deg', '270deg'];

    return (
        <div className="mt-4">
            <SectionShellV1 title="Effects" open={open} onToggle={onToggle}>
                {/* Opacity */}
                <RowV1>
                    <RowLeftV1 title="opacity" />
                    <RowRightGridV1>
                        <div className="col-span-3 min-w-0 flex items-center gap-[2px]">
                            {renderLock('opacity')}
                            {!allow.has('opacity') && <DisabledHint reason={dis('opacity') ?? 'template'} />}
                            {allow.has('opacity') ? (
                                <>
                                    <ChipBtnV1 title="0"   active={opacity === '0'}                   onClick={() => patch({ opacity: '0' })}>0</ChipBtnV1>
                                    <ChipBtnV1 title="0.5" active={opacity === '0.5'}                 onClick={() => patch({ opacity: '0.5' })}>0.5</ChipBtnV1>
                                    <ChipBtnV1 title="1"   active={opacity === '1' || opacity === ''} onClick={() => patch({ opacity: '1' })}>1</ChipBtnV1>
                                </>
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                        <div className="col-span-3 min-w-0">
                            {allow.has('opacity') ? (
                                <MiniInputV1
                                    value={opacity}
                                    onChange={(v) => {
                                        const n = clamp01(Number(v));
                                        patch({ opacity: String(n) });
                                    }}
                                    placeholder="0~1"
                                    size="auto"
                                    title="opacity"
                                />
                            ) : null}
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* Gradient — 요구사항 반영 */}
                {/* 1행: linear => type|angle preset, radial => type|+add */}
                <RowV1>
                    <RowLeftV1 title="gradient" />
                    <RowRightGridV1>
                        <div className="col-span-3 min-w-0">
                            {renderLock('backgroundImage')}
                            {!allow.has('backgroundImage') && <DisabledHint reason={dis('backgroundImage') ?? 'template'} />}
                            <MiniSelectV1
                                value={gType}
                                options={['linear', 'radial']}
                                onChange={(v) => {
                                    const nextType = (v as GradType) || 'linear';
                                    setGType(nextType);
                                    applyGradient({ type: nextType });
                                }}
                                title="gradient type"
                            />
                        </div>
                        <div className="col-span-3 min-w-0">
                            {gType === 'linear' ? (
                                <MiniSelectV1
                                    value={anglePresets.includes(gAngle) ? gAngle : ''}
                                    options={['— angle —', ...anglePresets] as unknown as string[]}
                                    onChange={(v) => {
                                        const next = s(v);
                                        if (next && next !== '— angle —') {
                                            setGAngle(next);
                                            applyGradient({ angle: next });
                                        }
                                    }}
                                    title="angle preset"
                                />
                            ) : (
                                <button
                                    className="h-[28px] w-full rounded border border-gray-300 text-[12px]"
                                    onClick={addStop}
                                    title="add color stop"
                                >
                                    + add stops
                                </button>
                            )}
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* 2행: linear => angle text | +add, radial => 경고(6칸) */}
                <RowV1>
                    <RowLeftV1 title="" />
                    <RowRightGridV1>
                        <div className="col-span-3 min-w-0">
                            {gType === 'linear' ? (
                                <MiniInputV1
                                    value={gAngle}
                                    onChange={(v) => {
                                        const next = v || '180deg';
                                        setGAngle(next);
                                        applyGradient({ angle: next });
                                    }}
                                    placeholder="e.g. 180deg"
                                    size="auto"
                                    title="angle"
                                />
                            ):''}
                        </div>
                        {gType === 'linear' ? (
                        <div className="col-span-3 min-w-0">
                            <button
                                className="h-[28px] w-full rounded border border-gray-300 text-[12px]"
                                onClick={addStop}
                                title="add color stop"
                            >
                                + add stops
                            </button>
                        </div>
                        ) : (
                        <div className="col-span-6 min-w-0">
                            <div className="text-[11px] text-amber-600 h-[28px] flex items-center">
                                radial 그라디언트는 중심/반경 기반이며 각도 입력을 지원하지 않습니다.
                            </div>
                        </div>
                        )}
                    </RowRightGridV1>
                </RowV1>

                {/* stops */}
                {stops.map((st, i) => {
                    const canDelete = stops.length > 2;
                    return (
                        <RowV1 key={i}>
                            <RowLeftV1 title={i === 0 ? 'stops' : ''} />
                            <RowRightGridV1>
                                <div className="col-span-3 min-w-0 flex items-center">
                                    <div className="origin-left scale-90 w-full">
                                        <ColorField
                                            value={st.color || '#000000'}
                                            onChange={(v) => updateStop(i, 'color', s(v) || '#000000')}
                                        />
                                    </div>
                                </div>
                                <div className="col-span-2 min-w-0">
                                    <MiniInputV1
                                        value={st.pos}
                                        onChange={(v) => updateStop(i, 'pos', v)}
                                        placeholder="0% ~ 100%"
                                        size="auto"
                                        title="stop position"
                                    />
                                </div>
                                <div className="col-span-1 min-w-0">
                                    <button
                                        className={`h-[28px] w-full rounded border text-[12px] ${
                                            canDelete
                                                ? 'border-gray-300'
                                                : 'border-gray-200 text-gray-300 cursor-not-allowed'
                                        }`}
                                        onClick={() => canDelete && removeStop(i)}
                                        disabled={!canDelete}
                                        title={canDelete ? 'remove stop' : 'at least 2 stops required'}
                                    >
                                        ×
                                    </button>
                                </div>
                            </RowRightGridV1>
                        </RowV1>
                    );
                })}

                {/* 목록형 Shadow / Filter */}
                <ShadowStack
                    el={el}
                    patch={patch}
                    nodeId={nodeId}
                    componentId={componentId}
                    allow={allow}
                    dis={dis}
                    renderLock={renderLock}
                />
                <FilterStack
                    el={el}
                    patch={patch}
                    nodeId={nodeId}
                    componentId={componentId}
                    allow={allow}
                    dis={dis}
                    renderLock={renderLock}
                />
            </SectionShellV1>
        </div>
    );
}