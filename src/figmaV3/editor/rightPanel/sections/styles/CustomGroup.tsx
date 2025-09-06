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
} from './common';

import {
    SectionShellV1,
    RowV1,
    RowLeftV1,
    RowRightGridV1,
    MiniInputV1,
} from './layoutV1';
import {useInspectorController} from "@/figmaV3/controllers/inspector/InspectorFacadeController";

/* ───────── utils ───────── */
function s(v: unknown): string {
    if (v === undefined || v === null) return '';
    return String(v).trim();
}

/** 다른 그룹에서 이미 다루는 CSS 키(여기서는 제외, 목록 필요시 확장) */
const KNOWN_KEYS: ReadonlySet<string> = new Set([
    // Layout / Display
    'display','flexDirection','flexWrap','justifyContent','alignItems','alignContent','gap','rowGap','columnGap',
    'gridTemplateColumns','gridTemplateRows','gridAutoFlow','gridAutoColumns','gridAutoRows',
    'overflow','overflowX','overflowY','width','height','minWidth','minHeight','maxWidth','maxHeight',

    // Position
    'position','top','left','right','bottom','zIndex',

    // Spacing
    'margin','marginTop','marginRight','marginBottom','marginLeft',
    'padding','paddingTop','paddingRight','paddingBottom','paddingLeft',

    // Border
    'border','borderColor','borderStyle','borderWidth',
    'borderTop','borderRight','borderBottom','borderLeft',
    'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth',
    'borderTopColor','borderRightColor','borderBottomColor','borderLeftColor',
    'borderTopStyle','borderRightStyle','borderBottomStyle','borderLeftStyle',
    'borderRadius','borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius',

    // Background
    'background','backgroundColor','backgroundImage','backgroundRepeat','backgroundSize','backgroundPosition',

    // Typography
    'color','fontSize','fontWeight','fontStyle','fontFamily','lineHeight','letterSpacing','textAlign','textDecoration','textTransform','whiteSpace',

    // Effects
    'opacity','boxShadow','filter','backdropFilter',
]);

type CustomKV = { key: string; value: string };

export function CustomGroup(props: {
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

    const { reader, writer } = useInspectorController();
    const R = reader(); const W = writer();

    const { el, patch, expert, open, onToggle, nodeId, componentId } = props;
    const ui = R.ui();
    const project = R.project();
    const allow = useAllowed(nodeId);
    const dis = (k: string): DisallowReason => reasonForKey(project, ui, nodeId, k, expert);

    /** 현 스타일에서 Custom 대상으로 볼 키(=KNOWN_KEYS에 없고 프리미티브 값)만 추출 */
    const existingCustom: CustomKV[] = React.useMemo(() => {
        const out: CustomKV[] = [];
        if (el && typeof el === 'object') {
            for (const [k, v] of Object.entries(el)) {
                if (!KNOWN_KEYS.has(k) && typeof v !== 'object') {
                    out.push({ key: k, value: s(v) });
                }
            }
        }
        out.sort((a, b) => a.key.localeCompare(b.key)); // 안정적 정렬
        return out;
    }, [el]);

    /** 편집용 내부 상태 */
    const [items, setItems] = React.useState<CustomKV[]>(existingCustom);
    React.useEffect(() => {
        setItems(existingCustom);
    }, [existingCustom]);

    const renderLock = (controlKey: string) => {
        if (ui.mode === 'Component') {
            return <PermissionLock controlKey={`styles:${controlKey}`} componentId={componentId} />;
        }
        return null;
    };

    const canWrite = (key: string) => {
        // 비어있는 키일 땐 patch를 미루고, 키가 생기면 권한 검사
        if (!key) return true;
        return allow.has(key);
    };

    /** 한 아이템 변경 반영(키 변경 포함) */
    const applyItem = (idx: number, next: CustomKV) => {
        const prev = items[idx];
        const nextItems = items.slice();
        nextItems[idx] = next;
        setItems(nextItems);

        const prevKey = s(prev.key);
        const nextKey = s(next.key);
        const nextVal = s(next.value);

        // 1) 키가 바뀌는 경우: 이전 키 제거 + 새 키 설정
        if (prevKey !== nextKey) {
            // 이전 키 제거
            if (prevKey && canWrite(prevKey)) {
                patch({ [prevKey]: undefined });
            }
            // 새 키 설정
            if (nextKey && canWrite(nextKey)) {
                patch({ [nextKey]: nextVal || undefined });
            }
            return;
        }

        // 2) 키 동일 → 값만 업데이트
        if (nextKey && canWrite(nextKey)) {
            patch({ [nextKey]: nextVal || undefined });
        }
    };

    const addItem = () => {
        const newItem: CustomKV = { key: '', value: '' };
        setItems((prev) => [...prev, newItem]);
        // 키가 비어있으므로 즉시 patch하지 않음 (사용자가 키 입력 후 반영)
    };

    const removeItem = (idx: number) => {
        const it = items[idx];
        setItems(items.filter((_, i) => i !== idx));
        const k = s(it?.key);
        if (k && canWrite(k)) {
            patch({ [k]: undefined });
        }
    };

    return (
        <div className="mt-4">
            <SectionShellV1 title="Custom" open={open} onToggle={onToggle}>

                {/* 헤더: items — spacer(3) | + add items(3) */}
                <RowV1>
                    <RowLeftV1 title="items" />
                    <RowRightGridV1>
                        <div className="col-span-3" />
                        <div className="col-span-3 min-w-0">
                            <button
                                className="h-[28px] w-full rounded border border-gray-300 text-[12px]"
                                onClick={addItem}
                                title="add items"
                            >
                                + add items
                            </button>
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* 아이템: key(3) | value(2) | 삭제(1) */}
                {items.length === 0 ? (
                    <RowV1>
                        <RowLeftV1 title="" />
                        <RowRightGridV1>
                            <div className="col-span-6 text-[11px] text-gray-500">
                                등록된 항목이 없습니다. <b>+ add items</b>로 추가하세요.
                            </div>
                        </RowRightGridV1>
                    </RowV1>
                ) : (
                    items.map((it, idx) => (
                        <RowV1 key={`${it.key}-${idx}`}>
                            <RowLeftV1 title="" />
                            <RowRightGridV1>
                                {/* Key(3칸) */}
                                <div className="col-span-3 min-w-0">
                                    {renderLock(it.key)}
                                    {!!it.key && !canWrite(it.key) && <DisabledHint reason={dis(it.key) ?? 'template'} />}
                                    <MiniInputV1
                                        value={it.key}
                                        onChange={(v) => applyItem(idx, { ...it, key: v })}
                                        placeholder="CSS key (e.g. transform)"
                                        size="auto"
                                        title="custom key"
                                    />
                                </div>

                                {/* Value(2칸) */}
                                <div className="col-span-2 min-w-0">
                                    <MiniInputV1
                                        value={it.value}
                                        onChange={(v) => applyItem(idx, { ...it, value: v })}
                                        placeholder="value (e.g. rotate(10deg))"
                                        size="auto"
                                        title="custom value"
                                    />
                                </div>

                                {/* 삭제(1칸) */}
                                <div className="col-span-1 min-w-0">
                                    <button
                                        className={`h-[28px] w-full rounded border text-[12px] ${
                                            !it.key || canWrite(it.key)
                                                ? 'border-gray-300'
                                                : 'border-gray-200 text-gray-300 cursor-not-allowed'
                                        }`}
                                        onClick={() => (!it.key || canWrite(it.key)) && removeItem(idx)}
                                        disabled={!!it.key && !canWrite(it.key)}
                                        title="remove"
                                    >
                                        ×
                                    </button>
                                </div>
                            </RowRightGridV1>
                        </RowV1>
                    ))
                )}

            </SectionShellV1>
        </div>
    );
}