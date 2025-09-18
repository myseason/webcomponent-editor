'use client';

import * as React from 'react';

// 공용 UI (원본 StyleInspector와 동일한 컴포넌트)
import {
    GroupHeader,
    RowShell,
    LeftCell,
    RightCell,
} from '../util/ui';

// 컨트롤 렌더러
import { renderValueControl } from '../util/controls';

// 타입
import type {StyleValues, SetStyleValue, SectionProps} from '../util/types';
import {StyleGroupKey} from "@/figmaV3/core/types";

/**
 * Advanced / Overrides 섹션
 * - 모드: __ovrMode ('merge' | 'override-all' | 'class-only')
 * - className: __ovrClass
 * - Raw CSS: __ovrRawCss (textarea)
 * - CSS Vars: __ovrCssVars (textarea, "--a:1; --b:2;" 형식)
 * - Attributes: __ovrAttrs (textarea, "data-xx:1; aria-yy:true;" 형식)
 * - UX, 레이아웃, 잠금키 등은 원본과 100% 동일 유지
 */
const AdvancedSection: React.FC<SectionProps> = ({
                                                     values,
                                                     setValue,
                                                     locks,
                                                     onToggleLock,
                                                     expanded,
                                                     openDetail,
                                                     canLock,
                                                     getCpVisible,
                                                 }) => {
    const mode = values['__ovrMode'] ?? 'merge';
    const className = values['__ovrClass'] ?? '';
    const rawCss = values['__ovrRawCss'] ?? '';
    const cssVars = values['__ovrCssVars'] ?? '';
    const attrs = values['__ovrAttrs'] ?? '';

    return (
        <div className="border-b border-neutral-200">
            <GroupHeader
                label="Advanced / Overrides"
                locked={!!locks['advanced.overrides']}
                onToggleLock={() => onToggleLock('advanced.overrides')}
            />

            {/* Mode */}
            <RowShell>
                <LeftCell title="Mode" tooltip="커스텀 값 병합/대체/클래스만 추가" />
                <RightCell>
                    {renderValueControl(
                        'Advanced',
                        '__ovrMode',
                        {
                            control: 'select',
                            options: [
                                { value: 'merge',        label: { ko: '병합(권장)' } },
                                { value: 'override-all', label: { ko: '전면 대체' } },
                                { value: 'class-only',   label: { ko: '클래스만 추가' } },
                            ],
                            ui: { size: 'sm' },
                        },
                        String(mode),
                        (v) => setValue('__ovrMode', v),
                        locks['advanced.overrides']
                    )}
                </RightCell>
            </RowShell>

            {/* className */}
            <RowShell>
                <LeftCell title="className" tooltip="Tailwind/프로젝트 클래스 등" />
                <RightCell>
                    {renderValueControl(
                        'Advanced',
                        '__ovrClass',
                        { control: 'input', placeholder: 'e.g. flex items-center gap-2', ui: { size: 'sm' } },
                        String(className),
                        (v) => setValue('__ovrClass', v),
                        locks['advanced.overrides']
                    )}
                </RightCell>
            </RowShell>

            {/* Raw CSS (textarea) */}
            <RowShell>
                <LeftCell title="Raw CSS" tooltip="세미콜론(;) 구분으로 선언 입력" />
                <RightCell>
                    <div className="w-full">
            <textarea
                className="w-full h-24 px-2 py-1 border rounded outline-none text-[11px]"
                placeholder="display:flex; gap:8px; background: url(/hero.png) center/cover no-repeat;"
                value={String(rawCss)}
                onChange={(e) => setValue('__ovrRawCss', e.currentTarget.value)}
                disabled={!!locks['advanced.overrides']}
            />
                        <div className="text-[10px] text-neutral-500 mt-1">
                            예: <code>display:flex; gap:8px;</code>
                        </div>
                    </div>
                </RightCell>
            </RowShell>

            {/* CSS Variables (textarea) */}
            <RowShell>
                <LeftCell title="CSS Vars" tooltip="--변수명: 값; 형식" />
                <RightCell>
          <textarea
              className="w-full h-16 px-2 py-1 border rounded outline-none text-[11px]"
              placeholder="--brand-color: #6b5cff; --radius: 8px;"
              value={String(cssVars)}
              onChange={(e) => setValue('__ovrCssVars', e.currentTarget.value)}
              disabled={!!locks['advanced.overrides']}
          />
                </RightCell>
            </RowShell>

            {/* data-/aria- Attributes (textarea) */}
            <RowShell>
                <LeftCell title="Attributes" tooltip="data-*, aria-* 형식" />
                <RightCell>
          <textarea
              className="w-full h-16 px-2 py-1 border rounded outline-none text-[11px]"
              placeholder="data-test-id: hero; aria-hidden: true;"
              value={String(attrs)}
              onChange={(e) => setValue('__ovrAttrs', e.currentTarget.value)}
              disabled={!!locks['advanced.overrides']}
          />
                </RightCell>
            </RowShell>
        </div>
    );
};

export default AdvancedSection;