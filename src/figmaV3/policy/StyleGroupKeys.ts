/* ============================================================================
 * policy/StyleGroupKeys.ts
 *  - Inspector 서브그룹(StyleGroupKey)별 포함 스타일 키 목록(대표/멤버)을 정의합니다.
 *  - 이 파일은 '데이터' 계층이며, 오직 core/types 에서 타입만 import 합니다.
 * ========================================================================== */

import type { StyleGroupKey, StyleKey } from '../core/types';

/** 각 서브그룹의 라벨 및 포함 키(대표/멤버) 정의 */
export const STYLEGROUPS: Record<StyleGroupKey, {
    label: string;
    representatives: StyleKey[]; // UI에 먼저 노출되는 대표 키
    members: StyleKey[];         // 같은 그룹에 속하는 나머지 키
}> = {
    displayFlow: {
        label: 'Display & Flow',
        representatives: ['display', 'overflow'],
        members: [
            'visibility',
            // Flex 관련
            'flex-direction', 'flex-wrap', 'gap',
            'justify-content', 'align-items', 'align-content', 'align-self',
            'order', 'flex-grow', 'flex-shrink', 'flex-basis',
        ],
    },
    position: {
        label: 'Position',
        representatives: ['position', 'z-index'],
        members: ['top', 'right', 'bottom', 'left'],
    },
    sizing: {
        label: 'Sizing',
        representatives: ['width', 'height'],
        members: ['min-width', 'max-width', 'min-height', 'max-height', 'box-sizing', 'aspect-ratio'],
    },
    spacing: {
        label: 'Spacing',
        representatives: ['margin', 'padding'],
        members: [
            'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
            'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
            'row-gap', 'column-gap',
        ],
    },
    typography: {
        label: 'Typography',
        representatives: ['font-size', 'font-weight'],
        members: [
            'font-family', 'font-style', 'font-variant',
            'line-height', 'letter-spacing', 'text-align',
            'text-transform', 'text-decoration', 'white-space',
            'color',
        ],
    },
    border: {
        label: 'Border',
        representatives: ['border-width', 'border-radius'],
        members: [
            'border-style', 'border-color',
            'border-top-left-radius', 'border-top-right-radius',
            'border-bottom-right-radius', 'border-bottom-left-radius',
            'outline', 'outline-offset',
        ],
    },
    background: {
        label: 'Background',
        representatives: ['background-color'],
        members: [
            'background-image', 'background-size', 'background-repeat', 'background-position',
            'background-clip', 'background-origin',
        ],
    },
    effects: {
        label: 'Effects',
        representatives: ['opacity'],
        members: ['box-shadow', 'filter', 'backdrop-filter', 'mix-blend-mode'],
    },
    interactivity: {
        label: 'Interactivity',
        representatives: [],
        members: [
            // pointer-events, cursor 등 필요 시 확장
            'cursor', 'pointer-events', 'user-select',
            // transition/animation은 필요 시 별도 그룹 분리 가능
            'transition', 'transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay',
            'animation', 'animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay',
            'animation-iteration-count', 'animation-direction', 'animation-fill-mode', 'animation-play-state',
        ],
    },
    advanced: {
        label: 'Advanced',
        representatives: [],
        members: [
            // 그리드 등 고급 속성(필요 시 확장)
            'contain', 'isolation', 'will-change',
        ],
    },
};

/** flat 스타일 키 → 서브그룹 키 역매핑 (런타임/도메인에서 사용) */
export const KEY_TO_STYLEGROUP: Record<StyleKey, StyleGroupKey> = (() => {
    const out: Record<string, StyleGroupKey> = {};
    (Object.keys(STYLEGROUPS) as StyleGroupKey[]).forEach((group) => {
        const { representatives, members } = STYLEGROUPS[group];
        [...representatives, ...members].forEach((k) => {
            out[k] = group;
        });
    });
    return out;
})();

/** (선택) 'styles:group.key' | 'styles:key' | 'key' → flat 'key' 로 정규화 */
export function normalizeControlPathToKey(path: string): StyleKey | null {
    if (!path) return null;
    const norm = path.replace(/:/g, '.'); // 'styles:layout.display' → 'styles.layout.display'
    const parts = norm.split('.');
    if (parts[0] === 'styles') {
        if (parts.length === 2) return parts[1];               // 'styles.display'
        if (parts.length >= 3) return parts.slice(2).join('.'); // 'styles.layout.display'
        return null;
    }
    return path; // 이미 flat key라고 판단
}