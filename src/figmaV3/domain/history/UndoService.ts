'use client';

import type { Command, CommandName } from '../command/CommandTypes';

export class UndoService {
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];

    onCommand(cmd: Command) {
        this.undoStack.push(cmd);
        this.redoStack = [];
    }

    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }

    private makeInverse(cmd: Command): Command | null {
        switch (cmd.name as CommandName) {
            case 'node.props.patch': {
                const { nodeId, patch, prev } = cmd.payload as any;
                return { name: 'node.props.patch', payload: { nodeId, patch: prev, prev: patch } };
            }
            case 'node.styles.patch': {
                const { nodeId, patch, viewport, prev } = cmd.payload as any;
                return { name: 'node.styles.patch', payload: { nodeId, patch: prev, viewport, prev: patch } };
            }
            case 'node.tag.change': {
                const { nodeId, tag, prevTag } = cmd.payload as any;
                if (prevTag === undefined) return null;
                return { name: 'node.tag.change', payload: { nodeId, tag: prevTag, prevTag: tag } };
            }
            case 'ui.expert.toggle': {
                const { next, prev } = cmd.payload as any;
                return { name: 'ui.expert.toggle', payload: { next: prev, prev: next } };
            }
            case 'binding.apply': {
                const { nodeId, propKey, value, prev } = cmd.payload as any;
                return { name: 'binding.apply', payload: { nodeId, propKey, value: prev, prev: value } };
            }
            default:
                return null;
        }
    }

    popUndo(): Command | null {
        if (!this.canUndo()) return null;
        const last = this.undoStack.pop()!;
        const inverse = this.makeInverse(last);
        this.redoStack.push(last);
        return inverse;
    }

    popRedo(): Command | null {
        if (!this.canRedo()) return null;
        const last = this.redoStack.pop()!;
        this.undoStack.push(last);
        return last;
    }

    reset() { this.undoStack = []; this.redoStack = []; }

    get sizes() { return { undo: this.undoStack.length, redo: this.redoStack.length }; }
}

export const undoService = new UndoService();