'use client';
import React, { memo, useCallback, useMemo } from 'react';
import { useEditor } from '../useEditor';
import type { NodeId, Node } from '../../core/types';
import { getDefinition } from '../../core/registry';

// lucide-react 아이콘 (일관성)
import { Lock, Unlock, Eye, EyeOff, Trash2 } from 'lucide-react';

const LINE_COLOR = '#e5e7eb'; // Tailwind gray-200

/** 계층 가이드 라인 + 들여쓰기 박스 */
const Indent: React.FC<{ depth: number }> = ({ depth }) => {
    return (
        <span style={{ display: 'inline-flex' }}>
      {Array.from({ length: depth }).map((_, i) => (
          <span key={i} style={{ display: 'inline-block', width: 12, position: 'relative' }}>
          {/* 세로 라인 */}
              <span
                  style={{
                      position: 'absolute',
                      top: -6,
                      bottom: -6,
                      left: 5,
                      width: 0,
                      borderLeft: `1px solid ${LINE_COLOR}`,
                      opacity: 0.7,
                  }}
              />
        </span>
      ))}
            {/* 현재 레벨의 ├─ 가로 라인 */}
            <span style={{ display: 'inline-block', width: 12, position: 'relative' }}>
        <span
            style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                width: 10,
                borderTop: `1px solid ${LINE_COLOR}`,
                transform: 'translateY(-50%)',
                opacity: 0.7,
            }}
        />
      </span>
    </span>
    );
};

/** 표시 이름: props.title → 컴포넌트 정의 title/label → componentId */
function getDisplayName(node: Node): string {
    const t = (node.props as any)?.title;
    if (typeof t === 'string' && t.trim()) return t.trim();
    const def = getDefinition(node.componentId);
    return (def as any)?.title ?? (def as any)?.label ?? node.componentId;
}

const Row: React.FC<{ id: NodeId; depth: number }> = memo(({ id, depth }) => {
    const state = useEditor();
    const node = state.project.nodes[id];
    if (!node) return null;

    const isRoot = id === state.project.rootId;
    const selected = state.ui.selectedId === id;
    const name = getDisplayName(node);

    const onSelect = useCallback(() => state.select(id), [state, id]);
    const onToggleVisible = useCallback(() => state.toggleNodeVisibility(id), [state, id]);
    const onToggleLock = useCallback(() => state.toggleNodeLock(id), [state, id]);
    const onRemove = useCallback(() => {
        if (isRoot) return; // 루트 삭제 금지
        state.removeNodeCascade(id);

        // 선택 보정
        const sel = state.ui.selectedId;
        if (!sel || !state.project.nodes[sel]) {
            state.select(state.project.rootId);
        }
    }, [state, id, isRoot]);

    return (
        <div
            className={`flex items-center justify-between px-2 py-1 text-sm ${
                selected ? 'bg-blue-50' : 'hover:bg-gray-50'
            }`}
            style={{ borderBottom: `1px solid ${LINE_COLOR}` }}
        >
            <div className="flex items-center gap-1">
                <Indent depth={depth} />
                <button onClick={onSelect} className="text-left">
                    <span className="font-medium">{name}</span>
                    <span className="ml-2 text-[11px] text-gray-500">({node.componentId})</span>
                </button>
            </div>

            {/* 루트는 액션(잠금/표시/삭제) 숨김 — 선택만 허용 */}
            {!isRoot && (
                <div className="flex items-center gap-1">
                    <button
                        className="p-1 rounded border border-gray-200"
                        onClick={onToggleLock}
                        aria-label={node.locked ? 'Unlock' : 'Lock'}
                        title={node.locked ? 'Unlock' : 'Lock'}
                    >
                        {node.locked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>

                    <button
                        className="p-1 rounded border border-gray-200"
                        onClick={onToggleVisible}
                        aria-label={node.isVisible === false ? 'Show' : 'Hide'}
                        title={node.isVisible === false ? 'Show' : 'Hide'}
                    >
                        {node.isVisible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>

                    <button
                        className="p-1 rounded border border-red-200 text-red-600"
                        onClick={onRemove}
                        aria-label="Delete"
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
});
Row.displayName = 'Row';

const Tree: React.FC<{ id: NodeId; depth: number }> = ({ id, depth }) => {
    const state = useEditor();
    const node = state.project.nodes[id];
    if (!node) return null;

    // 유효한 자식만
    const children = useMemo(
        () => ((node.children ?? []) as NodeId[]).filter((cid) => !!state.project.nodes[cid]),
        [node.children, state.project.nodes]
    );

    return (
        <div>
            <Row id={id} depth={depth} />
            {children.map((cid) => (
                <Tree key={cid} id={cid} depth={depth + 1} />
            ))}
        </div>
    );
};

export function Layers() {
    const state = useEditor();
    const rootId = state.project.rootId;

    if (!state.project.nodes[rootId]) {
        return (
            <div className="p-3 text-sm text-gray-500">
                루트 노드가 비정상입니다. 새 페이지를 추가하거나 프로젝트를 다시 불러오세요.
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto">
            <Tree id={rootId} depth={0} />
        </div>
    );
}