import { VIEWPORTS, type Viewport } from './types';
import { HUB_TABS, type HubTab } from './constants';

export const isViewport = (v: string): v is Viewport =>
    (VIEWPORTS as readonly string[]).includes(v as any);

export const isHubTab = (t: string): t is HubTab =>
    (HUB_TABS as readonly string[]).includes(t as any);


/**
 * 얕은 비교 유틸 (flat object 기준)
 * - 두 객체의 키/값이 모두 동일하면 true
 * - === 비교만 수행 (중첩 객체 비교는 안 함)
 */
export function shallowEqual<T extends Record<string, any>>(a: T, b: T): boolean {
    if (a === b) return true;
    if (!a || !b) return false;

    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;

    for (const k of ak) {
        if (a[k] !== b[k]) return false;
    }
    return true;
}