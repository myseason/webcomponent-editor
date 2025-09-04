'use client';

import type { Command } from '../command/CommandTypes';

/**
 * RoleGuard
 * - 간단한 역할/권한 기반 차단
 * - ctx.ui?.currentUser?.role 이나 ctx.project?.roles 매핑 등, 실제 프로젝트 구조에 맞게 커스터마이즈
 */

export type RoleName = 'admin' | 'editor' | 'viewer' | (string & {});
export type RoleMatrix = {
    deny?: {
        commands?: string[];        // 커맨드 이름 명시적 금지
        styles?: string[];          // 스타일 키 금지 (node.styles.patch 대상)
        props?: string[];           // prop 키 금지 (node.props.patch 대상)
    };
};

/** 역할 판별: 프로젝트/세션에서 현재 사용자 역할을 추론 */
function getCurrentRole(ctx: any): RoleName {
    const role =
        ctx?.ui?.currentUser?.role ??
        ctx?.project?.currentUserRole ??
        'editor';
    return role as RoleName;
}

/** 역할 매트릭스: 필요시 프로젝트 설정에서 가져오도록 확장 */
function getRoleMatrix(ctx: any, role: RoleName): RoleMatrix {
    // 예시: ctx.project.roles?.[role]
    const fromProject = ctx?.project?.roles?.[role];
    if (fromProject) return fromProject as RoleMatrix;

    // 기본: viewer는 쓰기 금지
    if (role === 'viewer') {
        return { deny: { commands: ['node.props.patch', 'node.styles.patch', 'node.tag.change'] } };
    }
    return {};
}

export function roleGuard(cmd: Command, ctx?: any) {
    const role = getCurrentRole(ctx);
    const matrix = getRoleMatrix(ctx, role);

    // 1) 명시 커맨드 금지
    if (matrix?.deny?.commands?.includes?.(cmd.name)) {
        return { ok: false as const, reason: `Command "${cmd.name}" is not allowed for role "${role}".`, code: 'ROLE_DENY' };
    }

    // 2) 스타일/프롭 키별 금지
    if (cmd.name === 'node.styles.patch' && matrix?.deny?.styles?.length) {
        const keys = Object.keys(cmd.payload?.patch ?? {});
        for (const k of keys) {
            if (matrix.deny.styles.includes(k)) {
                return { ok: false as const, reason: `Style "${k}" is not allowed for role "${role}".`, code: 'ROLE_STYLE_DENY' };
            }
        }
    }

    if (cmd.name === 'node.props.patch' && matrix?.deny?.props?.length) {
        const keys = Object.keys(cmd.payload?.patch ?? {});
        for (const k of keys) {
            if (matrix.deny.props.includes(k)) {
                return { ok: false as const, reason: `Prop "${k}" is not allowed for role "${role}".`, code: 'ROLE_PROP_DENY' };
            }
        }
    }

    return { ok: true as const };
}