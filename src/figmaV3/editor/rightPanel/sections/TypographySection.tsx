'use client';

import * as React from 'react';
import { Type as TypeIcon, Text as TextIcon } from 'lucide-react';

import type { StyleValues, SetStyleValue } from '../util/types';
import {
    GroupHeader,
    RowShell,
    LeftCell,
    RightCell, WarningRow,
} from '../util/ui';
import { renderValueControl } from '../util/controls';
import { makeSelect, makeIcons, makeChips, makeColor, makeInput, makeRatio } from "@/figmaV3/editor/rightPanel/util/spec";

// 그룹 아이콘 매핑(원본과 동일한 의도)
const GROUP_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    Font: TypeIcon,
    Text: TextIcon,
};

export interface TypographySectionProps {
    values: StyleValues;
    setValue: SetStyleValue;
    locks: Record<string, boolean>;
    onToggleLock: (k: string) => void;
}

/** Typography 섹션 (원본 UI/UX & 동작 유지) */
const TypographySection: React.FC<TypographySectionProps> = ({
                                                                 values,
                                                                 setValue,
                                                                 locks,
                                                                 onToggleLock,
                                                             }) => {

    const needsEllipsis = values.textOverflow === 'ellipsis';
    const overflowOK = /^(hidden|clip)$/.test(String(values.overflow ?? ''));
    const singleLine = String(values.whiteSpace ?? 'normal') === 'nowrap';
    const ellipsisBlocked = needsEllipsis && (!overflowOK || !singleLine);

    return (
        <>
            {/* Font */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Font"
                    Icon={GROUP_ICONS['Font']}
                    locked={locks['typo.font']}
                    onToggleLock={() => onToggleLock('typo.font')}
                />
                <RowShell>
                    <LeftCell title="글꼴" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'fontFamily',
                            makeSelect(['Inter', 'Pretendard', 'Noto Sans']),
                            String(values['fontFamily'] ?? ''),
                            (v) => setValue('fontFamily', v),
                            locks['typo.font']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="크기" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'fontSize',
                            makeChips(['10', '12', '14', '16'], { size: 'xs', free: true, placeholder: 'ex) 18' }),
                            String(values['fontSize'] ?? ''),
                            (v) => setValue('fontSize', v),
                            locks['typo.font']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="스타일" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'fontStyle',
                            makeIcons([
                                { value: 'normal', iconKey: 'typography.fontStyle:normal' },
                                { value: 'italic', iconKey: 'typography.fontStyle:italic' },
                            ]),
                            String(values['fontStyle'] ?? ''),
                            (v) => setValue('fontStyle', v),
                            locks['typo.font']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="굵기" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'fontWeight',
                            makeSelect(['100','200','300','400','500','600','700','800','900','normal','bold','bolder','lighter']),
                            String(values['fontWeight'] ?? ''),
                            (v) => setValue('fontWeight', v),
                            locks['typo.font']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="글자색" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'color',
                            makeColor(),
                            String(values['color'] ?? ''),
                            (v) => setValue('color', v),
                            locks['typo.font']
                        )}
                    </RightCell>
                </RowShell>
            </div>

            {/* Text */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Text"
                    Icon={GROUP_ICONS['Text']}
                    locked={locks['typo.text']}
                    onToggleLock={() => onToggleLock('typo.text')}
                />

                <RowShell>
                    <LeftCell title="정렬" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'textAlign',
                            makeIcons(
                                [
                                    { value: 'left', iconKey: 'typography.textAlign:left' },
                                    { value: 'center', iconKey: 'typography.textAlign:center' },
                                    { value: 'right', iconKey: 'typography.textAlign:right' },
                                    { value: 'justify', iconKey: 'typography.textAlign:justify' },
                                ],
                                'sm'
                            ),
                            String(values['textAlign'] ?? ''),
                            (v) => setValue('textAlign', v),
                            locks['typo.text']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="대소문자" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'textTransform',
                            makeIcons([
                                { value: 'none' },
                                { value: 'inherit' },
                                { value: 'capitalize', iconKey: 'typography.textTransform:capitalize' },
                                { value: 'uppercase', iconKey: 'typography.textTransform:uppercase' },
                                { value: 'lowercase', iconKey: 'typography.textTransform:lowercase' },
                            ]),
                            String(values['textTransform'] ?? ''),
                            (v) => setValue('textTransform', v),
                            locks['typo.text']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="장식" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'textDecoration',
                            makeIcons([
                                { value: 'none', iconKey: 'typography.textDecoration:none' },
                                { value: 'underline', iconKey: 'typography.textDecoration:underline' },
                                { value: 'line-through', iconKey: 'typography.textDecoration:line-through' },
                            ]),
                            String(values['textDecoration'] ?? ''),
                            (v) => setValue('textDecoration', v),
                            locks['typo.text']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="줄 높이" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'lineHeight',
                            makeChips(['1','1.2','1.5','2'], { size: 'xs', free: true, placeholder: '1.4 / 20px' }),
                            String(values['lineHeight'] ?? ''),
                            (v) => setValue('lineHeight', v),
                            locks['typo.text']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="자간" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'letterSpacing',
                            makeChips(['0','0.5','1','2'], { size: 'xs', free: true, placeholder: 'ex) 0.2px' }),
                            String(values['letterSpacing'] ?? ''),
                            (v) => setValue('letterSpacing', v),
                            locks['typo.text']
                        )}
                    </RightCell>
                </RowShell>
            </div>

            {/* Content Flow */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Content Flow"
                    locked={locks['typo.flow']}
                    onToggleLock={() => onToggleLock('typo.flow')}
                />
                {ellipsisBlocked && (
                    <WarningRow message="‘ellipsis’가 보이려면 Layout의 overflow를 hidden/clip으로, Typography의 whiteSpace를 nowrap으로 설정하세요." />
                )}
                <RowShell>
                    <LeftCell title="공백 처리" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'whiteSpace',
                            makeSelect(['normal','nowrap','pre','pre-wrap']),
                            String(values['whiteSpace'] ?? ''),
                            (v) => setValue('whiteSpace', v),
                            locks['typo.flow']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="줄바꿈" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'wordBreak',
                            makeSelect(['normal','break-all','keep-all']),
                            String(values['wordBreak'] ?? ''),
                            (v) => setValue('wordBreak', v),
                            locks['typo.flow']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="넘침 표시" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'textOverflow',
                            makeSelect(['clip','ellipsis']),
                            String(values['textOverflow'] ?? ''),
                            (v) => setValue('textOverflow', v),
                            locks['typo.flow']
                        )}
                    </RightCell>
                </RowShell>
            </div>
        </>
    );
};

export default TypographySection;