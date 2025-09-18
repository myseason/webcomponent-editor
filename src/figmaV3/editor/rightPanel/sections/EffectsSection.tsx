'use client';

import * as React from 'react';

import {
    GroupHeader,
    RowShell,
    LeftCell,
    RightCell,
    DetailBlock, WarningRow,        // 상세 블록 (util/ui)
} from '../util/ui';

import { renderValueControl } from '../util/controls';
import type {StyleValues, SetStyleValue, SectionProps} from '../util/types';

// longhand 동기화 & 파서 유틸
import {
    useSyncLonghand,
    parseFunctionList,
    parseTransition,
    setIfEmpty,
} from '../util/longhand';

import {makeChips, makeSelect, makeInput } from "../util/spec";
import {StyleGroupKey} from "@/figmaV3/core/types";

/** Effects 섹션 (Visual / Transform / Transition) */
const EffectsSection: React.FC<SectionProps> = ({
                                                    values,
                                                    setValue,
                                                    locks,
                                                    onToggleLock,
                                                    expanded,
                                                    openDetail,
                                                    canLock,
                                                    getCpVisible,
                                                }) => {
    const dk = (prop: string) => `Effects.${prop}`;

    // transform-origin 안내
    const noTransform = String(values.transform ?? '').trim() === '';
    // transition 안내/비활성
    const transProp = String(values.transitionProperty ?? '').trim();
    const transitionBlocked = transProp === 'none';

    // ── longhand 동기화 훅 ────────────────────────────────────
    // filter: blur/brightness/…/drop-shadow
    useSyncLonghand({
        expanded,
        detailKey: dk('filter'),
        shorthandKey: 'filter',
        values,
        setValue,
        parse: (raw) => {
            const obj = parseFunctionList(String(raw ?? ''));
            return {
                'blur': obj['blur'] ?? '',
                'brightness': obj['brightness'] ?? '',
                'contrast': obj['contrast'] ?? '',
                'grayscale': obj['grayscale'] ?? '',
                'hue-rotate': obj['hue-rotate'] ?? '',
                'invert': obj['invert'] ?? '',
                'saturate': obj['saturate'] ?? '',
                'sepia': obj['sepia'] ?? '',
                'drop-shadow': obj['drop-shadow'] ?? '',
            };
        },
        map: {
            'blur': 'blur',
            'brightness': 'brightness',
            'contrast': 'contrast',
            'grayscale': 'grayscale',
            'hue-rotate': 'hue-rotate',
            'invert': 'invert',
            'saturate': 'saturate',
            'sepia': 'sepia',
            'drop-shadow': 'drop-shadow',
        },
    });

    // transform: translate/scale/rotate/skew (대표 키 중심)
    useSyncLonghand({
        expanded,
        detailKey: dk('transform'),
        shorthandKey: 'transform',
        values,
        setValue,
        parse: (raw) => {
            const obj = parseFunctionList(String(raw ?? ''));
            return {
                translate: obj['translate'] ?? '',
                scale: obj['scale'] ?? obj['scaleX'] ?? obj['scaleY'] ?? '',
                rotate: obj['rotate'] ?? '',
                skew: obj['skew'] ?? obj['skewX'] ?? obj['skewY'] ?? '',
            };
        },
        map: {
            translate: 'translate',
            scale: 'scale',
            rotate: 'rotate',
            skew: 'skew',
        },
    });

    // transition: property/duration/timing/delay
    useSyncLonghand({
        expanded,
        detailKey: dk('transition'),
        shorthandKey: 'transition',
        values,
        setValue,
        parse: (raw) => parseTransition(String(raw ?? '')),
        map: {
            transitionProperty: 'transitionProperty',
            transitionDuration: 'transitionDuration',
            transitionTimingFunction: 'transitionTimingFunction',
            transitionDelay: 'transitionDelay',
        },
    });

    return (
        <>
            {/* ───────────────────── Visual ───────────────────── */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Visual"
                    locked={!!locks['effects.visual']}
                    onToggleLock={() => onToggleLock('effects.visual')}
                />

                {/* opacity */}
                <RowShell>
                    <LeftCell title="투명도" />
                    <RightCell>
                        {renderValueControl(
                            'Effects',
                            'opacity',
                            makeChips(['1', '0.5', '0'], { size: 'xs', free: true, placeholder: '0~1' }),
                            String(values['opacity'] ?? ''),
                            (v) => setValue('opacity', v),
                            locks['effects.visual']
                        )}
                    </RightCell>
                </RowShell>

                {/* filter (메인 + 상세) */}
                <RowShell>
                    <LeftCell title="그래픽 효과" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('filter'), () => {
                                const f = parseFunctionList(String(values.filter ?? ''));
                                const keys = ['blur','brightness','contrast','grayscale','hue-rotate','invert','saturate','sepia','drop-shadow'] as const;
                                keys.forEach((k) => setIfEmpty(values, setValue, k, f[k]));
                            })
                        }
                        detailActive={!!expanded[dk('filter')]}
                    >
                        {renderValueControl(
                            'Effects',
                            'filter',
                            {
                                ...makeInput('blur(4px) brightness(0.9)', 'text', 'xl'),
                                shorthand: {
                                    enabled: true,
                                    layered: true,
                                    layerLimit: 1,
                                    syntax: '<filter-function-list>',
                                    longhandKeys: ['blur', 'brightness', 'contrast', 'grayscale', 'hue-rotate', 'invert', 'saturate', 'sepia', 'drop-shadow'],
                                },
                            },
                            String(values['filter'] ?? ''),
                            (v) => setValue('filter', v),
                            locks['effects.visual']
                        )}
                    </RightCell>
                </RowShell>

                {!!expanded[dk('filter')] && (
                    <DetailBlock
                        propsMap={{
                            blur: makeInput('blur(6px)'),
                            brightness: makeInput('brightness(1.1)'),
                            contrast: makeInput('contrast(1.2)'),
                            grayscale: makeInput('grayscale(1)'),
                            'hue-rotate': makeInput('hue-rotate(30deg)'),
                            invert: makeInput('invert(1)'),
                            saturate: makeInput('saturate(1.2)'),
                            sepia: makeInput('sepia(1)'),
                            'drop-shadow': makeInput('drop-shadow(0 2px 6px #0003)'),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Effects"
                        disabled={locks['effects.visual']}
                    />
                )}

                {/* mix-blend-mode */}
                <RowShell>
                    <LeftCell title="블렌드" />
                    <RightCell>
                        {renderValueControl(
                            'Effects',
                            'mixBlendMode',
                            makeSelect([
                                'normal',
                                'multiply',
                                'screen',
                                'overlay',
                                'darken',
                                'lighten',
                                'color-dodge',
                                'color-burn',
                                'hard-light',
                                'soft-light',
                                'difference',
                                'exclusion',
                                'hue',
                                'saturation',
                                'color',
                                'luminosity',
                            ]),
                            String(values['mixBlendMode'] ?? ''),
                            (v) => setValue('mixBlendMode', v),
                            locks['effects.visual']
                        )}
                    </RightCell>
                </RowShell>
            </div>

            {/* ───────────────────── Transform ───────────────────── */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Transform"
                    locked={!!locks['effects.transform']}
                    onToggleLock={() => onToggleLock('effects.transform')}
                />
                {/* transform (메인 + 상세) */}
                <RowShell>
                    <LeftCell title="변형" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('transform'), () => {
                                const f = parseFunctionList(String(values.transform ?? ''));
                                setIfEmpty(values, setValue, 'translate', f['translate']);
                                setIfEmpty(values, setValue, 'scale', f['scale'] ?? f['scaleX'] ?? f['scaleY']);
                                setIfEmpty(values, setValue, 'rotate', f['rotate']);
                                setIfEmpty(values, setValue, 'skew', f['skew'] ?? f['skewX'] ?? f['skewY']);
                            })
                        }
                        detailActive={!!expanded[dk('transform')]}
                    >
                        {renderValueControl(
                            'Effects',
                            'transform',
                            {
                                ...makeInput('scale(1.05) rotate(5deg) translate(0, 4px)', 'text', 'xl'),
                                shorthand: {
                                    enabled: true,
                                    layered: true,
                                    layerLimit: 1,
                                    syntax: '<transform-function>+',
                                    longhandKeys: ['translate', 'scale', 'scaleX', 'scaleY', 'rotate', 'skew', 'skewX', 'skewY'],
                                },
                            },
                            String(values['transform'] ?? ''),
                            (v) => setValue('transform', v),
                            locks['effects.transform']
                        )}
                    </RightCell>
                </RowShell>

                {!!expanded[dk('transform')] && (
                    <DetailBlock
                        propsMap={{
                            translate: makeInput('translate(10px, 0)'),
                            scale: makeInput('scale(1.1)'),
                            rotate: makeInput('rotate(10deg)'),
                            skew: makeInput('skew(5deg, 0)'),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Effects"
                        disabled={locks['effects.transform']}
                    />
                )}

                {/* origin / perspective */}
                <RowShell>
                    <LeftCell title="기준점" />
                    <RightCell>
                        {renderValueControl(
                            'Effects',
                            'transformOrigin',
                            makeInput('ex) 50% 50% / center'),
                            //String(values['transformOrigin'] ?? ''),
                            String(''),
                            (v) => setValue('transformOrigin', v),
                            locks['effects.transform']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="원근" />
                    <RightCell>
                        {renderValueControl(
                            'Effects',
                            'perspective',
                            makeInput('600px'),
                            String(values['perspective'] ?? ''),
                            (v) => setValue('perspective', v),
                            locks['effects.transform']
                        )}
                    </RightCell>
                </RowShell>
            </div>

            {/* ───────────────────── Transition ───────────────────── */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Transition"
                    locked={!!locks['effects.transition']}
                    onToggleLock={() => onToggleLock('effects.transition')}
                />
                {transitionBlocked && (
                    <WarningRow message="transitionProperty가 none이면 전환 효과가 적용되지 않습니다." />
                )}

                {/* transition (메인 + 상세) */}
                <RowShell>
                    <LeftCell title="전환 효과" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('transition'), () => {
                                const t = parseTransition(String(values.transition ?? ''));
                                setIfEmpty(values, setValue, 'transitionProperty', t.transitionProperty);
                                setIfEmpty(values, setValue, 'transitionDuration', t.transitionDuration);
                                setIfEmpty(values, setValue, 'transitionTimingFunction', t.transitionTimingFunction);
                                setIfEmpty(values, setValue, 'transitionDelay', t.transitionDelay);
                            })
                        }
                        detailActive={!!expanded[dk('transition')]}
                    >
                        {renderValueControl(
                            'Effects',
                            'transition',
                            {
                                ...makeInput('all 150ms ease-out'),
                                shorthand: {
                                    enabled: true,
                                    layered: true,
                                    layerLimit: 1,
                                    syntax: '<property> <duration> <timing-function>? <delay>?',
                                    longhandKeys: ['transitionProperty', 'transitionDuration', 'transitionTimingFunction', 'transitionDelay'],
                                },
                                ui: { size: 'xs', extraInput: { enabled: true, size: 'xs', placeholder: 'opacity 200ms ease-in' } },
                            },
                            String(values['transition'] ?? ''),
                            (v) => setValue('transition', v),
                            locks['effects.transition']
                        )}
                    </RightCell>
                </RowShell>

                {!!expanded[dk('transition')] && (
                    <DetailBlock
                        propsMap={{
                            transitionProperty: makeInput('opacity, transform'),
                            transitionDuration: makeInput('200ms'),
                            transitionTimingFunction: makeSelect(['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'], 'xs'),
                            transitionDelay: makeInput('0ms'),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Effects"
                        disabled={locks['effects.transition']}
                    />
                )}
            </div>
        </>
    );
};

export default EffectsSection;