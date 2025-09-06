'use client';

import { useMemo } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';
import { getDefinition } from '../../core/registry';
import type { EditorState, NodeId, PropSchemaEntry } from '../../core/types';

/**
 * SchemaEditor 전용 컨트롤러
 * - rows 초기값: project.schemaOverrides[defId] ?? def.propsSchema
 * - 저장: project.schemaOverrides[defId] = rows
 * - 리셋: delete project.schemaOverrides[defId]
 */
export function useSchemaController(nodeId: NodeId) {
    const state = EditorEngine.getState();
    const node = state.project.nodes[nodeId];
    const defId = node.componentId as string;
    const def = getDefinition(defId);
    const projectOverride = (state as any).project?.schemaOverrides?.[defId] as PropSchemaEntry[] | undefined;
    const initialRows = (projectOverride ?? (def?.propsSchema ?? [])) as PropSchemaEntry[];

    const save = (rows: PropSchemaEntry[]) => {
        EditorEngine.update((s: any) => {
            const map = { ...(s.project.schemaOverrides ?? {}) };
            map[defId] = rows;
            s.project.schemaOverrides = map;
        }, true);
    };

    const reset = () => {
        EditorEngine.update((s: any) => {
            const map = { ...(s.project.schemaOverrides ?? {}) };
            delete map[defId];
            s.project.schemaOverrides = map;
        }, true);
    };

    return useMemo(
        () => ({ defId, def, projectOverride, initialRows, save, reset }),
        // def, projectOverride는 재계산 비용이 적으므로 단순 참조
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [defId, projectOverride?.length, initialRows.length]
    );
}