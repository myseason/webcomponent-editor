'use client';

import type { Command } from '../command/CommandTypes';

export type GuardResult =
    | { ok: true }
    | { ok: false; reason: string; code?: string };

export type GuardFn = (cmd: Command, ctx?: any) => GuardResult | Promise<GuardResult>;

/**
 * GuardRegistry
 * - 커맨드 실행 전 사전 검증 레이어
 * - 이름/우선순위 없이 단순 선형으로 실행 (간결성 유지)
 * - 가드 중 하나라도 {ok:false}면 즉시 중단
 */
export class GuardRegistry {
    private guards: GuardFn[] = [];

    register(fn: GuardFn) {
        this.guards.push(fn);
        return () => {
            const i = this.guards.indexOf(fn);
            if (i >= 0) this.guards.splice(i, 1);
        };
    }

    async run(cmd: Command, ctx?: any): Promise<GuardResult> {
        for (const g of this.guards) {
            const r = await g(cmd, ctx);
            if (!r?.ok) return r ?? { ok: false, reason: 'Unknown guard failure' };
        }
        return { ok: true };
    }
}

// 싱글턴 기본 인스턴스
export const guardRegistry = new GuardRegistry();