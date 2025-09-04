'use client';

/**
 * CommandBus
 * - 모든 "쓰기"를 명명된 커맨드로 캡슐화/발행
 * - 구독/해제 API: cleanup이 반드시 void를 반환하도록 보장
 */

export type CommandName =
    | 'node.props.patch'
    | 'node.styles.patch'
    | 'node.tag.change'
    | 'ui.expert.toggle'
    | 'binding.apply'
    | (string & {});

export type Command<T = any> = {
    name: CommandName;
    payload: T;
};

export type CommandListener = (cmd: Command) => void;

export class CommandBus {
    private listeners = new Set<CommandListener>();

    subscribe(fn: CommandListener): () => void {
        this.listeners.add(fn);
        // 중요: cleanup은 void 반환
        return () => {
            // Set.delete는 boolean을 반환하지만, 우리는 그 값을 버리고 void만 반환
            this.listeners.delete(fn);
        };
    }

    emit(cmd: Command) {
        for (const fn of this.listeners) fn(cmd);
    }
}