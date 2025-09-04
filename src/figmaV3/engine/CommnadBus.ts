/**
 * CommandBus (스텁)
 * - Phase 4에서 실제 Undo/Redo/HistorySlice 연동 예정
 * - 현재 단계에서는 인터페이스만 제공 (엔진에서 선택적으로 사용 가능)
 */

export type Command = {
    type: string;
    apply: () => void;
    undo: () => void;
};

export class CommandBus {
    static instance = new CommandBus();

    private stack: Command[] = [];
    private cursor = -1;

    execute(cmd: Command) {
        cmd.apply();
        // 간단한 선형 히스토리
        if (this.cursor < this.stack.length - 1) {
            this.stack = this.stack.slice(0, this.cursor + 1);
        }
        this.stack.push(cmd);
        this.cursor++;
    }

    canUndo() {
        return this.cursor >= 0;
    }

    canRedo() {
        return this.cursor + 1 < this.stack.length;
    }

    undo() {
        if (!this.canUndo()) return;
        const cmd = this.stack[this.cursor--];
        cmd.undo();
    }

    redo() {
        if (!this.canRedo()) return;
        const cmd = this.stack[++this.cursor];
        cmd.apply();
    }
}