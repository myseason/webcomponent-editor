'use client';

import { EditorEngine } from '../EditorEngine';
import type { NodeId } from '../../core/types';

export function computeInspectorTargetNodeId(): NodeId | null {
    const sel = EditorEngine.nodes.getSelectedNodeId();
    return sel ?? null;
}