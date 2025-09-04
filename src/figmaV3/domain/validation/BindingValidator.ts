'use client';

/**
 * BindingValidator
 * - "expr" 형식이든 "dot-path" 형식이든, 최소한 존재성 검증을 수행
 * - 고급식 지원은 프로젝트의 expr 파서/실행기(runtime/expr.ts)에 맞춰 확장
 */

import { dataSchemaService } from '../data/DataSchemaService';

export class BindingValidator {
    /**
     * 단순 dot-path 바인딩 검증: "user.name", "order.items[0].price" → 배열 인덱스는 평탄화 가정
     * - 지금은 [index]를 '.'로 치환하는 매우 단순 버전 (필요시 고도화)
     */
    private normalizePath(path: string): string {
        return path.replace(/\[(\d+)\]/g, '.$1');
    }

    /** 존재성 검사 */
    validateExists(project: any, raw: string): { ok: true } | { ok: false; reason: string } {
        const path = this.normalizePath(raw || '');
        if (!path) return { ok: false, reason: 'Empty binding path.' };
        const ok = dataSchemaService.exists(project, path);
        return ok ? { ok: true } : { ok: false, reason: `Binding path "${raw}" does not exist.` };
    }
}

export const bindingValidator = new BindingValidator();