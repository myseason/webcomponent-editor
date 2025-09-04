'use client';

import { guardRegistry } from '../domain/guard/GuardRegistry';
import type { Command } from '../domain/command/CommandTypes';
import { roleGuard } from '../domain/guard/RoleGuard';
import { bindingValidator } from '../domain/validation/BindingValidator';

const GLOBALLY_DENY_STYLES = new Set<string>([]);

let registered = false;

export function registerDefaultGuards() {
    if (registered) return;
    registered = true;

    // 전역 스타일 deny
    guardRegistry.register((cmd: Command) => {
        if (cmd.name !== 'node.styles.patch') return { ok: true };
        const keys = Object.keys(cmd.payload?.patch ?? {});
        for (const k of keys) if (GLOBALLY_DENY_STYLES.has(k)) {
            return { ok: false, reason: `Style "${k}" is globally denied.`, code: 'STYLE_GLOBAL_DENY' };
        }
        return { ok: true };
    });

    // 역할 가드
    guardRegistry.register(roleGuard);

    // props.patch 내 바인딩 문자열 검사 (기존)
    guardRegistry.register((cmd: Command, ctx: any) => {
        if (cmd.name !== 'node.props.patch') return { ok: true };
        const patch = cmd.payload?.patch ?? {};
        for (const [key, val] of Object.entries(patch)) {
            const s = String(val ?? '');
            const m = s.match(/^\{\{(.+?)\}\}$/) || s.match(/^\$data\.(.+)$/);
            if (m) {
                const raw = m[1] ?? '';
                const r = bindingValidator.validateExists(ctx?.project, raw);
                if (!r.ok) return { ok: false, reason: `Binding of "${key}" invalid: ${r.reason}`, code: 'BINDING_INVALID' };
            }
        }
        return { ok: true };
    });

    // 신규: binding.apply 명시 가드
    guardRegistry.register((cmd: Command, ctx: any) => {
        if (cmd.name !== 'binding.apply') return { ok: true };
        const { propKey, value } = cmd.payload ?? {};
        const s = String(value ?? '');
        const m = s.match(/^\{\{(.+?)\}\}$/) || s.match(/^\$data\.(.+)$/);
        if (!m) return { ok: true }; // plain은 통과
        const raw = m[1] ?? '';
        const r = bindingValidator.validateExists(ctx?.project, raw);
        return r.ok ? { ok: true } : { ok: false, reason: `Binding of "${propKey}" invalid: ${r.reason}`, code: 'BINDING_INVALID' };
    });
}