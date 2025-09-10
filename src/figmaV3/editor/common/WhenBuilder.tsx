'use client';
/**
 * WhenBuilder
 * - 안전 표현식(when) 빌더 + Raw 모드 편집 + 실시간 프리뷰
 * - 지원: root(data|node|project).path  op(== != > >= < <=)  value(string|number|boolean|null)
 * - Raw 모드: 임의의 표현식을 직접 입력 가능(파서 실패 시 false)
 *
 * 표현식 예:
 *  data.user == 'admin'
 *  node.props.visible == true
 *  project.pages.length > 1
 *
 * 규약:
 * - 훅 최상위 호출, any 금지
 * - evalWhenExpr로 안전 평가(함수 호출/[] 인덱싱 불가)
 */
import React from 'react';
import type { NodeId, BindingScope } from '../../core/types';
import { evalWhenExpr } from '../../runtime/expr';

// ... (내부 유틸리티 타입들은 변경 없음) ...
type Root = 'data' | 'node' | 'project';
type Op = '==' | '!=' | '>' | '>=' | '<' | '<=';
type ValKind = 'string' | 'number' | 'boolean' | 'null';

export function WhenBuilder({
                                value,
                                onChange,
                                bindingScope, // ✅ bindingScope를 props로 받음
                                className,
                            }: {
    value?: string;
    onChange: (expr: string) => void;
    bindingScope: BindingScope; // ✅ props 타입 추가
    className?: string;
}) {
    const [mode, setMode] = React.useState<'builder' | 'raw'>(() => (value ? 'raw' : 'builder'));
    // ... (내부 상태 관리 로직은 변경 없음) ...
    const [root, setRoot] = React.useState<Root>('data');
    const [path, setPath] = React.useState<string>('');
    const [op, setOp] = React.useState<Op>('==');
    const [valKind, setValKind] = React.useState<ValKind>('string');
    const [valStr, setValStr] = React.useState<string>('');
    const [raw, setRaw] = React.useState<string>(value ?? '');

    // ... (buildExpr, 파싱 로직 등은 변경 없음) ...
    const buildExpr = React.useCallback((): string => {
        // ...
        return `${root}${path ? `.${path.trim()}`: ''} ${op} ${valStr}`; // simplified
    }, [root, path, op, valStr]);


    const previewExpr = mode === 'builder' ? buildExpr() : raw;

    // 프리뷰 평가는 전달받은 bindingScope를 사용합니다.
    const isTrue = React.useMemo<boolean>(() => {
        if (!previewExpr || !previewExpr.trim()) return false;
        try {
            return evalWhenExpr(previewExpr, bindingScope);
        } catch {
            return false;
        }
    }, [previewExpr, bindingScope]);

    const onApply = () => {
        const expr = mode === 'builder' ? buildExpr() : raw.trim();
        onChange(expr);
    };

    return (
        <div className={className ?? 'border rounded p-2 text-xs space-y-2'}>
            {/* ... (JSX 렌더링 부분은 변경 없음) ... */}
        </div>
    );
}