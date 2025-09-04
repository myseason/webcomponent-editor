'use client';

import type { Command } from '../command/CommandTypes';

export interface InspectorControllerPort {
    updateNodeProps(nodeId: string, patch: Record<string, unknown>): void;
    updateNodeStyles(nodeId: string, patch: Record<string, unknown>, viewport?: string): void;
    changeTag(nodeId: string, tag: string): void;
    setExpertMode(next: boolean): void;
    applyBinding?(nodeId: string, propKey: string, value: unknown): void; // ← 선택
}

export function applyCommand(cmd: Command, ctl: InspectorControllerPort) {
    switch (cmd.name) {
        case 'node.props.patch': {
            const { nodeId, patch } = cmd.payload as any;
            ctl.updateNodeProps(nodeId, patch);
            break;
        }
        case 'node.styles.patch': {
            const { nodeId, patch, viewport } = cmd.payload as any;
            ctl.updateNodeStyles(nodeId, patch, viewport);
            break;
        }
        case 'node.tag.change': {
            const { nodeId, tag } = cmd.payload as any;
            ctl.changeTag(nodeId, tag);
            break;
        }
        case 'ui.expert.toggle': {
            const { next } = cmd.payload as any;
            ctl.setExpertMode(!!next);
            break;
        }
        case 'binding.apply': {
            const { nodeId, propKey, value } = cmd.payload as any;
            if (typeof ctl.applyBinding === 'function') {
                ctl.applyBinding(nodeId, propKey, value);
            } else {
                // 안전망: props.patch로 대체
                ctl.updateNodeProps(nodeId, { [propKey]: value });
            }
            break;
        }
        default:
            break;
    }
}