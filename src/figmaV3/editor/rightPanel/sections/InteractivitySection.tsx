'use client';

import * as React from 'react';

// 공용 UI (기존 StyleInspector와 동일 레이아웃 컴포넌트)
import {
    GroupHeader,
    RowShell,
    LeftCell,
    RightCell,
} from '../util/ui';

// 단일 컨트롤 렌더 함수
import { renderValueControl } from '../util/controls';

// 타입 (기존 파일 유지)
import type {PropertySpec, SectionProps} from '../util/types';

// 섹션 공용 타입/팩토리
import type { StyleValues, SetStyleValue } from '../util/types';
import { makeSelect } from '../util/spec';
import {StyleGroupKey} from "@/figmaV3/core/types";

/**
 * Interactivity 섹션
 * - UX/옵션/락키는 원본과 100% 동일 유지
 * - 상세/의존 컨트롤 없음 (RightCell의 detail 버튼 사용 안 함)
 */
export const InteractivitySection: React.FC<SectionProps> = ({
                                                                 values,
                                                                 setValue,
                                                                 locks,
                                                                 onToggleLock,
                                                                 expanded,
                                                                 openDetail,
                                                                 canLock,
                                                                 getCpVisible,
                                                             }) => {
    return (
        <div className="border-b border-neutral-200">
            <GroupHeader
                label="User Interaction"
                locked={locks['interact.user']}
                onToggleLock={() => onToggleLock('interact.user')}
            />

            {/* cursor */}
            <RowShell>
                <LeftCell title="커서" />
                <RightCell>
                    {renderValueControl(
                        'Interactivity',
                        'cursor',
                        makeSelect(['auto', 'default', 'pointer', 'text', 'move']),
                        String(values['cursor'] ?? ''),
                        (v) => setValue('cursor', v),
                        locks['interact.user']
                    )}
                </RightCell>
            </RowShell>

            {/* pointer-events */}
            <RowShell>
                <LeftCell title="포인터 이벤트" />
                <RightCell>
                    {renderValueControl(
                        'Interactivity',
                        'pointerEvents',
                        makeSelect(['auto', 'none']),
                        String(values['pointerEvents'] ?? ''),
                        (v) => setValue('pointerEvents', v),
                        locks['interact.user']
                    )}
                </RightCell>
            </RowShell>

            {/* user-select */}
            <RowShell>
                <LeftCell title="텍스트 선택" />
                <RightCell>
                    {renderValueControl(
                        'Interactivity',
                        'userSelect',
                        makeSelect(['auto', 'text', 'none']),
                        String(values['userSelect'] ?? ''),
                        (v) => setValue('userSelect', v),
                        locks['interact.user']
                    )}
                </RightCell>
            </RowShell>
        </div>
    );
};

export default InteractivitySection;