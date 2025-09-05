// src/figmaV3/editor/rightPanel/sections/DataBindingPopover.tsx
'use client';

import * as React from 'react';
import type { CSSProperties } from 'react';
import { useInspectorController } from '../../../controllers/InspectorController';

export type DataBindingPopoverProps = {
    /** 기존 UI/UX와 동일: 앵커 엘리먼트, onClose 는 그대로 유지 */
    anchorEl: HTMLElement | null;
    onClose: () => void;

    /** 바인딩 적용 대상 (기존과 동일) */
    nodeId: string;
    propKey: string;

    /** 초기 값 (기존과 동일, 없으면 빈 값) */
    initial?: string;

    /** 외형/클래스 (있다면 그대로 유지) */
    className?: string;
    style?: CSSProperties;
};

/**
 * 레이아웃/마크업은 유지합니다.
 * 내부 저장(onApply)만 컨트롤러의 applyBinding()으로 전환합니다.
 */
export function DataBindingPopover(props: DataBindingPopoverProps) {
    const { anchorEl, onClose, nodeId, propKey, initial, className, style } = props;
    const ctl = useInspectorController();
    const [value, setValue] = React.useState<string>(initial ?? '');

    // 기존 저장 버튼 핸들러를 대체: 컨트롤러 경유로 저장 + 가드/Undo/Redo/저널 자동 연동
    const onApply = React.useCallback(async () => {
        // 컨트롤러 API: applyBinding(nodeId, propKey, value)
        await ctl.applyBinding(nodeId, propKey, value);
        onClose?.();
    }, [ctl, nodeId, propKey, value, onClose]);

    const open = !!anchorEl;
    if (!open) return null;

    return (
        <div
            className={className}
            style={{
                position: 'absolute',
                top: anchorEl?.getBoundingClientRect().bottom ?? 0,
                left: anchorEl?.getBoundingClientRect().left ?? 0,
                zIndex: 1000,
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 12,
                width: 320,
                boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                ...style,
            }}
            role="dialog"
            aria-modal="true"
        >
            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Data Binding</div>
                <div style={{ marginLeft: 'auto' }}>
                    <button
                        onClick={onClose}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16 }}
                        aria-label="Close"
                        title="Close"
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* 입력 필드 (레이아웃/마크업 유지) */}
            <div style={{ marginBottom: 8 }}>
                <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder='예) {{user.name}} 또는 $data.user.name'
                    style={{
                        width: '100%',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        padding: '8px 10px',
                        fontSize: 13,
                        outline: 'none',
                    }}
                />
                <div style={{ marginTop: 6, color: '#6b7280', fontSize: 12, lineHeight: 1.4 }}>
                    <div>• <code>{'{}'}</code> 또는 <code>$data.</code> 접두 형식 지원</div>
                    <div>• 저장 시 정책/스키마/역할 가드, Undo/Redo, 커맨드 저널이 자동 연동됩니다</div>
                </div>
            </div>

            {/* 액션 버튼 (레이아웃 유지) */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                    onClick={onClose}
                    style={{
                        border: '1px solid #d1d5db',
                        background: '#ffffff',
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: 13,
                        cursor: 'pointer',
                    }}
                >
                    Cancel
                </button>
                <button
                    onClick={onApply}
                    style={{
                        border: '1px solid #2563eb',
                        background: '#2563eb',
                        color: '#fff',
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: 13,
                        cursor: 'pointer',
                    }}
                >
                    Save
                </button>
            </div>
        </div>
    );
}