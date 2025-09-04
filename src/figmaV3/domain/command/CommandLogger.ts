// src/figmaV3/domain/command/CommandLogger.ts
'use client';

import type { Command } from './CommandTypes';

/**
 * 개발/운영 공용 커맨드 로거
 * - subscribe/unsubscribe 인터페이스만 제공 (컨트롤러의 onCommand()로 연결)
 * - 메모리 링버퍼 + window 디버그 출력(개발 모드에서만)
 */

export type CommandLog = {
    ts: number;
    cmd: Command;
};

export class CommandLogger {
    private buffer: CommandLog[] = [];
    private max = 300;

    record(cmd: Command) {
        const item = { ts: Date.now(), cmd };
        this.buffer.push(item);
        if (this.buffer.length > this.max) this.buffer.shift();

        // dev helper
        if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
            (window as any).__EDITOR_CMD_LOG = this.buffer;
            // eslint-disable-next-line no-console
            console.debug('[cmd]', new Date(item.ts).toISOString(), cmd.name, cmd.payload);
        }
    }

    getAll() {
        return [...this.buffer];
    }

    clear() {
        this.buffer = [];
    }
}

// 싱글턴 사용 (원하면 별도 인스턴스도 생성 가능)
export const commandLogger = new CommandLogger();