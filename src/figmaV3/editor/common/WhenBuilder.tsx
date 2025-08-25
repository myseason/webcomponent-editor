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
import { useEditor } from '../useEditor';
import type { NodeId } from '../../core/types';
import { evalWhenExpr } from '../../runtime/expr';

type Root = 'data' | 'node' | 'project';
type Op = '==' | '!=' | '>' | '>=' | '<' | '<=';
type ValKind = 'string' | 'number' | 'boolean' | 'null';

export function WhenBuilder({
                                value,
                                onChange,
                                previewNodeId,
                                className,
                            }: {
    value?: string;
    onChange: (expr: string) => void;
    previewNodeId?: NodeId;     // 미지정 시 선택 노드 또는 프로젝트 루트로 프리뷰
    className?: string;
}) {
    const state = useEditor();

    // --- 모드: builder / raw ---------------------------------------------------
    const [mode, setMode] = React.useState<'builder' | 'raw'>(() => (value ? 'raw' : 'builder'));

    // --- builder 상태 ----------------------------------------------------------
    const [root, setRoot] = React.useState<Root>('data');
    const [path, setPath] = React.useState<string>('');           // foo.bar.baz
    const [op, setOp] = React.useState<Op>('==');
    const [valKind, setValKind] = React.useState<ValKind>('string');
    const [valStr, setValStr] = React.useState<string>('');       // string/number/boolean/null을 표현

    // 초기 값 파싱(단순 패턴만 해석) → builder로 역주입
    React.useEffect(() => {
        if (!value) return;
        const re =
            /^(data|node|project)\.([a-zA-Z_$][\w.$]*)\s*(==|!=|>=|<=|>|<)\s*(.+)$/;
        const m = value.trim().match(re);
        if (!m) return; // 복잡식은 raw 모드 유지
        const [, r, p, o, rhs] = m;
        setRoot(r as Root);
        setPath(p);
        setOp(o as Op);
        // rhs literal 판별
        const rhsTrim = rhs.trim();
        if (rhsTrim === 'true' || rhsTrim === 'false') {
            setValKind('boolean'); setValStr(rhsTrim);
        } else if (rhsTrim === 'null') {
            setValKind('null'); setValStr('null');
        } else if (!Number.isNaN(Number(rhsTrim))) {
            setValKind('number'); setValStr(String(Number(rhsTrim)));
        } else if (
            (rhsTrim.startsWith("'") && rhsTrim.endsWith("'")) ||
            (rhsTrim.startsWith('"') && rhsTrim.endsWith('"'))
        ) {
            setValKind('string');
            setValStr(rhsTrim.slice(1, -1).replace(/\\(['"])/g, '$1').replace(/\\n/g, '\n').replace(/\\t/g, '\t'));
        } else {
            // 해석 어려우면 raw 모드로 유지
            return;
        }
        setMode('builder');
    }, [value]);

    // builder → expr 문자열 생성
    const buildExpr = React.useCallback((): string => {
        const quote = (s: string): string =>
            `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\t/g, '\\t')}'`;

        const rhs =
            valKind === 'string' ? quote(valStr) :
                valKind === 'number' ? String(Number(valStr || '0')) :
                    valKind === 'boolean' ? (valStr === 'true' ? 'true' : 'false') :
                        'null';

        const p = path.trim();
        const safePath = p.length ? `.${p}` : ''; // 빈 경로 허용(루트 그 자체는 대부분 의미 없음)
        return `${root}${safePath} ${op} ${rhs}`;
    }, [root, path, op, valKind, valStr]);

    // raw 값(직접 입력)
    const [raw, setRaw] = React.useState<string>(value ?? '');

    // 미리보기: 선택 노드 → 미지정 시 현재 선택 또는 루트
    const nodeId: NodeId | null =
        previewNodeId ?? state.ui.selectedId ?? state.project.rootId;
    const node = state.project.nodes[nodeId];

    // 프리뷰 평가
    const previewExpr = mode === 'builder' ? buildExpr() : raw;
    const isTrue = React.useMemo<boolean>(() => {
        if (!previewExpr || !previewExpr.trim()) return false;
        try {
            return evalWhenExpr(previewExpr, {
                data: state.data,
                node,
                project: state.project,
            });
        } catch {
            return false;
        }
    }, [previewExpr, state.data, node, state.project]);

    // 적용
    const onApply = () => {
        const expr = mode === 'builder' ? buildExpr() : raw.trim();
        onChange(expr);
    };

    return (
        <div className={className ?? 'border rounded p-2 text-xs space-y-2'}>
            <div className="flex items-center gap-2">
                <span className="text-gray-600">When</span>
                <div className="ml-auto flex items-center gap-1">
                    <span className="text-[10px] text-gray-500">Preview:</span>
                    <span className={`text-[10px] px-1 rounded ${isTrue ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
            {String(isTrue)}
          </span>
                    <button
                        className="border rounded px-2 py-0.5"
                        onClick={() => setMode(mode === 'builder' ? 'raw' : 'builder')}
                        title={mode === 'builder' ? 'Raw 모드로' : 'Builder 모드로'}
                    >
                        {mode === 'builder' ? 'Raw' : 'Builder'}
                    </button>
                </div>
            </div>

            {mode === 'builder' ? (
                <div className="grid grid-cols-12 gap-2">
                    <select
                        className="col-span-2 border rounded px-2 py-1"
                        value={root}
                        onChange={(e) => setRoot(e.target.value as Root)}
                    >
                        <option value="data">data</option>
                        <option value="node">node</option>
                        <option value="project">project</option>
                    </select>

                    <input
                        className="col-span-4 border rounded px-2 py-1"
                        placeholder="path (ex: user.role)"
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                    />

                    <select
                        className="col-span-2 border rounded px-2 py-1"
                        value={op}
                        onChange={(e) => setOp(e.target.value as Op)}
                    >
                        <option>==</option>
                        <option>!=</option>
                        <option>&gt;</option>
                        <option>&gt;=</option>
                        <option>&lt;</option>
                        <option>&lt;=</option>
                    </select>

                    <select
                        className="col-span-2 border rounded px-2 py-1"
                        value={valKind}
                        onChange={(e) => setValKind(e.target.value as ValKind)}
                    >
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="null">null</option>
                    </select>

                    {valKind === 'boolean' || valKind === 'null' ? (
                        <select
                            className="col-span-2 border rounded px-2 py-1"
                            value={valKind === 'boolean' ? (valStr === 'true' ? 'true' : 'false') : 'null'}
                            onChange={(e) => {
                                if (valKind === 'boolean') setValStr(e.target.value === 'true' ? 'true' : 'false');
                                else setValStr('null');
                            }}
                        >
                            {valKind === 'boolean' ? (
                                <>
                                    <option value="true">true</option>
                                    <option value="false">false</option>
                                </>
                            ) : (
                                <option value="null">null</option>
                            )}
                        </select>
                    ) : (
                        <input
                            className="col-span-2 border rounded px-2 py-1"
                            placeholder={valKind === 'number' ? '0' : 'string'}
                            value={valStr}
                            onChange={(e) => setValStr(e.target.value)}
                            inputMode={valKind === 'number' ? 'decimal' : undefined}
                        />
                    )}
                </div>
            ) : (
                <textarea
                    className="w-full h-16 border rounded px-2 py-1 font-mono"
                    value={raw}
                    onChange={(e) => setRaw(e.target.value)}
                    placeholder="ex) data.user == 'admin' && node.props.enabled == true"
                />
            )}

            <div className="flex">
                <button className="ml-auto border rounded px-2 py-1" onClick={onApply}>
                    적용
                </button>
            </div>
        </div>
    );
}