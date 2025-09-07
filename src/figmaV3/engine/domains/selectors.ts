'use client';

import { EditorEngineCore } from '../EditorEngineCore';

export function selectorsDomain() {
    const R = {
        getOutline() {
            const s = EditorEngineCore.getState() as any;
            if (s.selectors?.outline) return s.selectors.outline();
            const map = s?.project?.nodes ?? {};
            return Object.values(map).map((n: any) => ({ id: n.id, name: n?.props?.__name ?? n.id }));
        },
    };
    return { reader: R, writer: {} } as const;
}