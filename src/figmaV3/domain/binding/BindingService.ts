'use client';

/**
 * BindingService
 * - 바인딩 표현식 정규화/식별/미리보기(경량)
 * - 프로젝트 expr 실행기(runtime/expr.ts) 연동 여지 제공
 */

export class BindingService {
    /** "{{path}}", "$data.path" 형태를 내부 공통 표현 "path"로 정규화 */
    normalize(raw: string): { kind: 'dot' | 'expr' | 'plain'; path?: string; raw: string } {
        if (!raw) return { kind: 'plain', raw: '' };
        const s = String(raw);

        // {{ user.name }}
        const m1 = s.match(/^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/);
        if (m1) return { kind: 'expr', path: m1[1].trim(), raw: s };

        // $data.user.name
        const m2 = s.match(/^\s*\$data\.(.+)\s*$/);
        if (m2) return { kind: 'dot', path: m2[1].trim(), raw: s };

        return { kind: 'plain', raw: s };
    }

    /** 미리보기: 지금은 dot-path만 시도 (expr 실행기는 프로젝트에 맞춰 확장 가능) */
    preview(project: any, raw: string): { ok: true; value: unknown } | { ok: false; reason: string } {
        const n = this.normalize(raw);
        if (n.kind === 'plain') return { ok: true, value: raw };
        if (!n.path) return { ok: false, reason: 'Empty binding path.' };

        try {
            const parts = n.path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
            let cur: any = (project as any)?.data?.values ?? (project as any)?.data ?? null;
            for (const p of parts) {
                if (cur == null) return { ok: true, value: undefined };
                cur = cur[p];
            }
            return { ok: true, value: cur };
        } catch (e: any) {
            return { ok: false, reason: e?.message ?? 'Preview failed' };
        }
    }
}

export const bindingService = new BindingService();