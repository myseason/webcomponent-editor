'use client';

/**
 * DataSchemaService
 * - 프로젝트에 선언된 데이터 스키마에서 dot-path 경로 탐색
 * - 존재 확인 및 타입 추정(경량) 제공
 * - 프로젝트 구조에 맞춰 확장 가능
 */

export type AnySchema = Record<string, unknown>;

function getByPath(obj: any, path: string): any {
    if (!path) return undefined;
    const parts = path.split('.').filter(Boolean);
    let cur: any = obj;
    for (const p of parts) {
        if (cur == null) return undefined;
        cur = cur[p];
    }
    return cur;
}

export class DataSchemaService {
    // 스키마의 위치/구조는 프로젝트 구현에 맞게 조정 가능
    getProjectSchema(project: any): AnySchema | null {
        // 예: project.data?.schema 또는 project.schemas?.default 등
        return (project as any)?.data?.schema ?? (project as any)?.schemas?.default ?? null;
    }

    exists(project: any, path: string): boolean {
        const schema = this.getProjectSchema(project);
        if (!schema) return false;
        return getByPath(schema, path) !== undefined;
    }

    // 필요 시 반환 타입 메타(예: "string", "number") 추가 확장 가능
}

export const dataSchemaService = new DataSchemaService();