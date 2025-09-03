'use client';

import React, { useState } from 'react';
import type {
    CSSDict,
    InspectorFilter,
    TagPolicy,
    TagPolicyMap,
    NodeId,
} from '../../../../core/types';

import {
    ColorField,
    DisabledHint,
    useAllowed,
    type DisallowReason,
    PermissionLock,
    reasonForKey,
} from './common';

import { useEditor } from '../../../useEditor';

// 공통 레이아웃 프리미티브 (라벨 80px + 우측 6그리드)
import {
    SectionShellV1,
    RowV1,
    RowLeftV1,
    RowRightGridV1,
    MiniInputV1,
    MiniSelectV1,
    IconBtnV1,
} from './layoutV1';

// 아이콘
import {
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    X as IconX,
} from 'lucide-react';

export function TypographyGroup(props: {
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

    // 현재값
    const color = String((el as any).color ?? '');
    const fw = String((el as any).fontWeight ?? '');
    const ta = String((el as any).textAlign ?? '');
    const lh = String((el as any).lineHeight ?? '');
    const ls = String((el as any).letterSpacing ?? '');
    const td = String((el as any).textDecoration ?? '');
    const fs = String((el as any).fontStyle ?? '');

    const renderLock = (controlKey: string) => {
        if (ui.mode === 'Component') {
            return <PermissionLock controlKey={`styles:${controlKey}`} componentId={componentId} />;
        }
        return null;
    };

    // font-weight 셀렉트 옵션 (빈 값은 해제)
    const fontWeightOptions = [
        '', '100','200','300','400','500','600','700','800','900','normal','bold','bolder','lighter'
    ];

    const textDecorationOptions = ['', 'none', 'underline', 'line-through', 'overline'];

    // 하단 "사용자 추가"용 선택 가능한 타이포 속성(필요 시 확장)
    const addableProps = [
        'fontFamily',
        'fontStyle',
        'fontVariant',
        'textTransform',
        'textDecoration',
        'textOverflow',
        'whiteSpace',
        'wordBreak',
        'overflowWrap',
    ];

    // 하단 추가 입력 상태
    const [addKey, setAddKey] = useState<string>(addableProps[0]);
    const [addVal, setAddVal] = useState<string>('');
    // 추가로 사용자에게 표시할 키들을 추적
    const [addedKeys, setAddedKeys] = useState<string[]>([]);

    const onClickAdd = () => {
        if (!addKey) return;
        if (!allow.has(addKey)) return; // 권한 불가 시 무시(혹은 안내)
        patch({ [addKey]: addVal || undefined });
        setAddVal('');
        setAddedKeys(prev => (prev.includes(addKey) ? prev : [...prev, addKey]));
    };

    const onClickRemove = (k: string) => {
        patch({ [k]: undefined });                 // 스타일 값 해제
        setAddedKeys(prev => prev.filter(x => x !== k)); // 목록에서 제거
    };

    return (
        // 상단 여백 유지(현 기조)
        <div className="mt-4">
            <SectionShellV1 title="Typography" open={open} onToggle={onToggle}>
                {/* color: color-picker (1칸) | textfield (5칸) */}
                <RowV1>
                    <RowLeftV1 title="color" />
                    <RowRightGridV1>
                        <div className="col-span-1 flex items-center min-w-0">
                            {renderLock('color')}
                            {!allow.has('color') && <DisabledHint reason={dis('color') ?? 'template'} />}
                            {allow.has('color') ? (
                                <ColorField
                                    value={color || '#000000'}
                                    onChange={(v) => patch({ color: v })}
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                        <div className="col-span-5 min-w-0">
                            {allow.has('color') ? (
                                <MiniInputV1
                                    value={color}
                                    onChange={(v) => patch({ color: v || undefined })}
                                    placeholder="#000000"
                                    size="auto"
                                    title="hex color"
                                />
                            ) : null}
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* fontWeight: select (4칸) | textfield (2칸) */}
                <RowV1>
                    <RowLeftV1 title="fontWeight" />
                    <RowRightGridV1>
                        <div className="col-span-4 min-w-0">
                            {renderLock('fontWeight')}
                            {!allow.has('fontWeight') && <DisabledHint reason={dis('fontWeight') ?? 'template'} />}
                            {allow.has('fontWeight') ? (
                                <MiniSelectV1
                                    value={fw}
                                    options={fontWeightOptions}
                                    onChange={(v) => patch({ fontWeight: v || undefined })}
                                    title="font-weight"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                        <div className="col-span-2 min-w-0">
                            {allow.has('fontWeight') ? (
                                <MiniInputV1
                                    value={fw}
                                    onChange={(v) => patch({ fontWeight: v || undefined })}
                                    placeholder="400"
                                    size="auto"
                                    title="font-weight (custom)"
                                />
                            ) : null}
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* textAlign: 아이콘 버튼 */}
                <RowV1>
                    <RowLeftV1 title="textAlign" />
                    <RowRightGridV1>
                        <div className="col-span-6 min-w-0 flex items-center gap-[2px] flex-nowrap">
                            {renderLock('textAlign')}
                            {!allow.has('textAlign') && <DisabledHint reason={dis('textAlign') ?? 'template'} />}

                            {allow.has('textAlign') ? (
                                [
                                    { key: '',        title: '(unset)', I: AlignLeft },
                                    { key: 'left',    title: 'left',    I: AlignLeft },
                                    { key: 'center',  title: 'center',  I: AlignCenter },
                                    { key: 'right',   title: 'right',   I: AlignRight },
                                    { key: 'justify', title: 'justify', I: AlignJustify },
                                ].map(({ key, title, I }) => (
                                    <IconBtnV1
                                        key={title}
                                        title={title}
                                        onClick={() => patch({ textAlign: key || undefined })}
                                        active={ta === key}
                                        square24
                                    >
                                        <I size={16} />
                                    </IconBtnV1>
                                ))
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* lineHeight: input (3칸) | spacer (3칸) */}
                <RowV1>
                    <RowLeftV1 title="lineHeight" />
                    <RowRightGridV1>
                        <div className="col-span-3 min-w-0">
                            {renderLock('lineHeight')}
                            {!allow.has('lineHeight') && <DisabledHint reason={dis('lineHeight') ?? 'template'} />}
                            {allow.has('lineHeight') ? (
                                <MiniInputV1
                                    value={lh}
                                    onChange={(v) => patch({ lineHeight: v || undefined })}
                                    placeholder="1.5 / 24px"
                                    size="auto"
                                    title="line-height"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                        <div className="col-span-3" />
                    </RowRightGridV1>
                </RowV1>

                {/* letterSpacing: input (3칸) | spacer (3칸) */}
                <RowV1>
                    <RowLeftV1 title="letterSpacing" />
                    <RowRightGridV1>
                        <div className="col-span-3 min-w-0">
                            {renderLock('letterSpacing')}
                            {!allow.has('letterSpacing') && <DisabledHint reason={dis('letterSpacing') ?? 'template'} />}
                            {allow.has('letterSpacing') ? (
                                <MiniInputV1
                                    value={ls}
                                    onChange={(v) => patch({ letterSpacing: v || undefined })}
                                    placeholder="0.2px"
                                    size="auto"
                                    title="letter-spacing"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                        <div className="col-span-3" />
                    </RowRightGridV1>
                </RowV1>

                {/* textDecoration: select (3칸) | spacer (3칸) */}
                <RowV1>
                    <RowLeftV1 title="textDecoration" />
                    <RowRightGridV1>
                        <div className="col-span-3 min-w-0">
                            {renderLock('textDecoration')}
                            {!allow.has('textDecoration') && <DisabledHint reason={dis('textDecoration') ?? 'template'} />}
                            {allow.has('textDecoration') ? (
                                <MiniSelectV1
                                    value={td}
                                    options={textDecorationOptions}
                                    onChange={(v) => patch({ textDecoration: v || undefined })}
                                    title="text-decoration"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                        <div className="col-span-3" />
                    </RowRightGridV1>
                </RowV1>

                {/* fontStyle: select (3칸) | spacer (3칸) */}
                <RowV1>
                    <RowLeftV1 title="fontStyle" />
                    <RowRightGridV1>
                        <div className="col-span-3 min-w-0">
                            {renderLock('fontStyle')}
                            {!allow.has('fontStyle') && <DisabledHint reason={dis('fontStyle') ?? 'template'} />}
                            {allow.has('fontStyle') ? (
                                <MiniSelectV1
                                    value={fs}
                                    options={['', 'normal', 'italic']}
                                    onChange={(v) => patch({ fontStyle: v || undefined })}
                                    title="font-style"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                        <div className="col-span-3" />
                    </RowRightGridV1>
                </RowV1>

                {/* ─────────────────────────────────────────────────────────
            하단 사용자 추가: (좌측 라벨 없이) 우측 컬럼 영역만 사용
            select(3칸) | textfield(2칸) | 추가 버튼(1칸)
        ───────────────────────────────────────────────────────── */}
                <RowV1>
                    <RowLeftV1 title="" />
                    <RowRightGridV1>
                        {/* select 3칸 */}
                        <div className="col-span-3 min-w-0">
                            {addKey ? renderLock(addKey) : null}
                            {addKey && !allow.has(addKey) && <DisabledHint reason={dis(addKey) ?? 'template'} />}
                            <MiniSelectV1
                                value={addKey}
                                options={addableProps}
                                onChange={(v) => setAddKey(v)}
                                title="add style property"
                            />
                        </div>
                        {/* textfield 2칸 */}
                        <div className="col-span-2 min-w-0">
                            <MiniInputV1
                                value={addVal}
                                onChange={(v) => setAddVal(v)}
                                placeholder="value"
                                size="auto"
                                title="style value"
                            />
                        </div>
                        {/* 버튼 1칸 */}
                        <div className="col-span-1 min-w-0">
                            <button
                                className="h-[28px] w-full text-[12px] rounded border bg-white border-[var(--mdt-color-border)]"
                                onClick={onClickAdd}
                                disabled={!!addKey && !allow.has(addKey)}
                                title="Add style"
                            >
                                추가
                            </button>
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* ───────── 추가 결과 표시: "속성명 : 값" 목록 + 삭제 버튼 ───────── */}
                {addedKeys.length > 0 && (
                    <RowV1>
                        {/* 좌측 라벨 비움 */}
                        <RowLeftV1 title="" />
                        <RowRightGridV1>
                            <div className="col-span-6 text-[11px] text-gray-700">
                                {addedKeys.map((k) => {
                                    const cur = (el as any)[k];
                                    return (
                                        <div
                                            key={k}
                                            className="flex items-center justify-between gap-2 py-[2px] border-b border-dashed border-[var(--mdt-color-border)]"
                                        >
                                            <div className="truncate">
                                                <span className="font-medium">{k}</span>
                                                <span> : </span>
                                                <span className="text-gray-600 truncate">{String(cur ?? '')}</span>
                                            </div>
                                            <div className="flex-none">
                                                <IconBtnV1
                                                    title="삭제"
                                                    onClick={() => onClickRemove(k)}
                                                    square24
                                                >
                                                    <IconX size={16} />
                                                </IconBtnV1>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </RowRightGridV1>
                    </RowV1>
                )}
            </SectionShellV1>
        </div>
    );
}