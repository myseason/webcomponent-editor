import type { NodeId } from '../../core/types';

export function selectNodeStyles(state: any, nodeId: NodeId): Record<string, any> {
    const n = state?.project?.nodes?.[nodeId];
    return (n?.styles ?? {}) as Record<string, any>;
}

export function isFlex(state: any, nodeId: NodeId): boolean {
    const s = selectNodeStyles(state, nodeId);
    return s.display === 'flex' || s.display === 'inline-flex';
}