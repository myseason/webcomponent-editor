'use client';

import { useMemo, useCallback, useRef } from 'react';
import { getDefinition } from '../core/registry';
import type { NodeId, Fragment, EditorState, Viewport } from '../core/types';
import { useEditor } from '../editor/useEditor';

import type { Command } from '../domain/command/CommandTypes';
import { CommandBus } from '../domain/command/CommandBus';
import { visibilityService, type VisibilityCheck } from '../domain/policy/VisibilityService';
import { undoService } from '../domain/history/UndoService';
import { guardRegistry } from '../domain/guard/GuardRegistry';
import { validationService } from '../domain/validation/ValidationService';
import { bindingService } from '../domain/binding/BindingService';

export type InspectorTarget = {
    nodeId: NodeId;
    node: any;
    defId: string | null;
    def?: any;
} | null;

function computeTargetNodeId(ui: any, project: any): NodeId | null {
    const rootId = project?.rootId as NodeId | undefined;
    if (!project || !rootId) return null;
    if (ui?.mode === 'Page') return (ui?.selectedId ?? rootId) as NodeId;

    const fragment = (project?.fragments ?? []).find((f: Fragment) => f.id === ui?.editingFragmentId);
    const fragRoot = (fragment?.rootId ?? null) as NodeId | null;
    if (!fragRoot) return null;

    const sel = (ui?.selectedId ?? null) as NodeId | null;
    if (!sel) return fragRoot;

    const stack: NodeId[] = [fragRoot];
    const visited = new Set<NodeId>();
    while (stack.length) {
        const id = stack.pop()!;
        if (id === sel) return sel;
        if (visited.has(id)) continue;
        visited.add(id);
        const kids = (project?.nodes?.[id]?.children ?? []) as NodeId[];
        for (const c of kids) stack.push(c);
    }
    return fragRoot;
}

export function useInspectorController() {
    const {
        ui, project, update, setNotification,
        updateNodeProps: v3UpdateNodeProps,
        updateNodeStyles: v3UpdateNodeStyles,
        getEffectiveDecl,
    } = useEditor();

    const busRef = useRef<CommandBus>(null);
    if (!busRef.current) busRef.current = new CommandBus();

    const target: InspectorTarget = useMemo(() => {
        const nodeId = computeTargetNodeId(ui, project);
        if (!nodeId) return null;
        const node = project?.nodes?.[nodeId];
        if (!node) return null;
        const defId: string | null = (node?.componentId ?? null) as string | null;
        const def = defId ? getDefinition(defId) : undefined;
        return { nodeId, node, defId, def };
    }, [ui, project]);

    const getVisibility = useCallback(
        (): VisibilityCheck | null => {
            if (!target) return null;
            return visibilityService.build({ def: target.def, node: target.node });
        },
        [target]
    );

    const pickSubset = (src: Record<string, any> | undefined, keys: string[]) => {
        const out: Record<string, any> = {};
        for (const k of keys) out[k] = src?.[k];
        return out;
    };

    const runGuards = useCallback(async (cmd: Command) => {
        const res = await guardRegistry.run(cmd, { project, target, ui });
        if (!res.ok) setNotification?.(res.reason || 'Blocked by guard');
        return res.ok;
    }, [project, target, ui, setNotification]);

    const setExpertMode = useCallback((next: boolean) => {
        const prev = !!ui?.expertMode;
        const cmd: Command<'ui.expert.toggle'> = { name: 'ui.expert.toggle', payload: { next, prev } };
        update((s: EditorState) => { (s.ui as any).expertMode = next; });
        busRef.current?.emit(cmd);
        undoService.onCommand(cmd);
        setNotification?.(`고급 모드: ${next ? 'ON' : 'OFF'}`);
    }, [ui?.expertMode, update, setNotification]);

    const updateNodeProps = useCallback(async (nodeId: NodeId, patch: Record<string, unknown>) => {
        const g = validationService.validatePropsPatch(patch, { project, target });
        if (!g.ok) { setNotification?.(g.reason); return; }

        const node = project?.nodes?.[nodeId];
        const prev = pickSubset(node?.props as any, Object.keys(patch));

        const cmd: Command<'node.props.patch'> = { name: 'node.props.patch', payload: { nodeId, patch, prev } };
        if (!(await runGuards(cmd))) return;

        if (typeof v3UpdateNodeProps === 'function') v3UpdateNodeProps(nodeId, patch);
        else {
            update((s: EditorState) => {
                const n: any = s.project?.nodes?.[nodeId]; if (!n) return;
                n.props = { ...(n.props ?? {}), ...patch };
            });
        }
        busRef.current?.emit(cmd);
        undoService.onCommand(cmd);
    }, [project?.nodes, v3UpdateNodeProps, update, runGuards, setNotification]);

    const changeTag = useCallback(async (nodeId: NodeId, tag: string) => {
        const v = validationService.validateTag(tag, { project, target });
        if (!v.ok) { setNotification?.(v.reason); return; }
        const node = project?.nodes?.[nodeId];
        const prevTag = (node?.props as any)?.['__tag'];

        // 내부적으로 props.patch 호출 → emit/undo 포함
        await updateNodeProps(nodeId, { __tag: tag });

        // 태그 변경 이벤트도 별도 발행 (옵저버 용)
        const cmd: Command<'node.tag.change'> = { name: 'node.tag.change', payload: { nodeId, tag, prevTag } };
        if (await runGuards(cmd)) {
            busRef.current?.emit(cmd);
            undoService.onCommand(cmd);
        }
    }, [project?.nodes, updateNodeProps, runGuards, setNotification]);

    const updateNodeStyles = useCallback(async (nodeId: NodeId, patch: Record<string, unknown>, viewport?: Viewport) => {
        const v = validationService.validateStylesPatch(patch, { project, target });
        if (!v.ok) { setNotification?.(v.reason); return; }

        const effective = (getEffectiveDecl?.(nodeId) ?? {}) as Record<string, unknown>;
        const prev = pickSubset(effective, Object.keys(patch));

        const cmd: Command<'node.styles.patch'> = {
            name: 'node.styles.patch',
            payload: { nodeId, patch, viewport: viewport as any, prev },
        };
        if (!(await runGuards(cmd))) return;

        if (typeof v3UpdateNodeStyles === 'function') v3UpdateNodeStyles(nodeId, patch, viewport);
        else {
            update((s: EditorState) => {
                const n: any = s.project?.nodes?.[nodeId]; if (!n) return;
                n.styles = { ...(n.styles ?? {}), ...patch };
            });
        }
        busRef.current?.emit(cmd);
        undoService.onCommand(cmd);
    }, [getEffectiveDecl, v3UpdateNodeStyles, update, runGuards, setNotification]);

    /** 신규: 데이터 바인딩 적용 API (UI는 이 메서드를 호출만 하면 됨) */
    const applyBinding = useCallback(async (nodeId: NodeId, propKey: string, value: unknown) => {
        const node = project?.nodes?.[nodeId];
        const prev = (node?.props ?? {})[propKey];

        const cmd: Command<'binding.apply'> = { name: 'binding.apply', payload: { nodeId, propKey, value, prev } };
        if (!(await runGuards(cmd))) return;

        // 바인딩 미리보기(옵션): 실패해도 저장은 가능하게 둘지 정책으로 선택
        const preview = typeof value === 'string' ? bindingService.preview(project, value) : { ok: true as const, value };
        if (!preview.ok) setNotification?.(`Binding preview failed: ${preview.reason}`);

        // 실제 반영은 props.patch로 (undo/redo 호환)
        await updateNodeProps(nodeId, { [propKey]: value });
    }, [project, updateNodeProps, runGuards, setNotification]);

    const notify = useCallback((msg: string) => setNotification?.(msg), [setNotification]);

    const viewport = useMemo(() => {
        const active = ui?.canvas?.activeViewport as Viewport | undefined;
        const mode = active ? ui?.canvas?.vpMode?.[active] : undefined;
        return { activeViewport: active, mode };
    }, [ui?.canvas]);

    const onCommand = useCallback((fn: (cmd: Command) => void) => {
        const unsub = busRef.current?.subscribe(fn);
        return () => {
            if (unsub)
                unsub(); // cleanup은 항상 void
        };
    }, []);

    const execute = useCallback(async (cmd: Command) => {
        if (!(await runGuards(cmd))) return;
        busRef.current?.emit(cmd);
        undoService.onCommand(cmd);
    }, [runGuards]);

    return {
        // 읽기
        ui, project, target,
        mode: (ui?.mode ?? 'Page') as 'Page' | 'Component',
        expertMode: !!ui?.expertMode,
        viewport,
        getEffectiveDecl,

        // 행동
        setExpertMode,
        updateNodeProps,
        updateNodeStyles,
        changeTag,
        applyBinding,  // ← 신규
        notify,

        // 도메인/이벤트
        getVisibility,
        onCommand,
        execute,
    };
}