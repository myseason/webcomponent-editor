import { StateCreator } from 'zustand';
import { EditorStoreState, BaseSlice } from '../types';
import { getDefinition } from '@/figmaV3/core/registry';
import type { Project } from '@/figmaV3/core/types';

export const createBaseSlice: StateCreator<EditorStoreState, [], [], BaseSlice> = (set, get) => ({
    _hydrateDefaults: () =>
        get().update((s) => {
            const nodes = s.project.nodes;
            for (const id in nodes) {
                const node = nodes[id]!;
                const def = getDefinition(node.componentId);
                if (!def) continue;

                const defProps = def.defaults?.props ?? {};
                const nextProps = { ...defProps, ...(node.props ?? {}) };

                const element = node.styles?.element ?? {};
                const defBase = def.defaults?.styles?.element?.base ?? {};
                const curBase = (element as any).base ?? {};
                const nextElement = { ...element, base: { ...defBase, ...curBase } };

                s.project.nodes[id] = { ...node, props: nextProps, styles: { ...node.styles, element: nextElement } };
            }
        }, true),

    _resetProject: (next: Project) =>
        get().update((s) => {
            s.project = next;
            s.ui.selectedId = next.rootId;
            // 히스토리는 update(recordHistory=true)에서 관리됨
        }, true),

    _patchProject: (patch) =>
        get().update((s) => {
            s.project = { ...s.project, ...patch };
        }, true),
});