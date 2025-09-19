// policy/globalTagPolicy.ts
// - 태그별 허용 섹션/키/속성/이벤트의 글로벌 규칙
// - Box 컴포넌트 외에는 div 선택 불가(컨테이너 태그는 div로 고정)

import type { TagPolicy, TagName, StyleGroupKey } from '../core/types';

const ALL_TAGS: TagName[] = [
    'div','span','img','button','a','p','h1','h2','h3','h4','h5','h6','label','ul','li',
];

// 섹션 alias
const DF: StyleGroupKey = 'displayFlow';
const PS: StyleGroupKey = 'position';
const SZ: StyleGroupKey = 'sizing';
const SP: StyleGroupKey = 'spacing';
const TP: StyleGroupKey = 'typography';
const BD: StyleGroupKey = 'border';
const BG: StyleGroupKey = 'background';
const EF: StyleGroupKey = 'effects';
const IN: StyleGroupKey = 'interactivity';

export const GLOBAL_TAG_POLICY: TagPolicy = {
    allowedTags: ALL_TAGS,
    defaultTag: 'div',              // Box 기본
    containerTag: 'div',            // 컨테이너는 div 고정

    // 태그별 허용 섹션(Inspector 그룹)
    allowedSectionsByTag: {
        div:  [DF, PS, SZ, SP, TP, BD, BG, EF, IN],
        span: [DF, PS, SP, TP, BG, EF, IN],                     // inline-ish
        img:  [DF, PS, SZ, SP, BD, EF, IN],                     // typography 제외
        button: [DF, PS, SZ, SP, TP, BD, BG, EF, IN],
        a:    [DF, PS, SZ, SP, TP, BD, BG, EF, IN],
        p:    [DF, PS, SP, TP, BG, EF, IN],                     // sizing 최소화
        h1:   [DF, PS, SP, TP, BG, EF, IN],
        h2:   [DF, PS, SP, TP, BG, EF, IN],
        h3:   [DF, PS, SP, TP, BG, EF, IN],
        ul:   [DF, PS, SZ, SP, BD, BG, EF, IN],
        li:   [DF, PS, SZ, SP, TP, BD, BG, EF, IN],
        h4:   [DF, PS, SP, TP, BG, EF, IN],
        h5:   [DF, PS, SP, TP, BG, EF, IN],
        h6:   [DF, PS, SP, TP, BG, EF, IN],
        label:[DF, PS, SP, TP, BG, EF, IN],
    },

    // (선택) 태그별 허용/금지 키 white/black-list (deny 우선)
    styleAllowByTag: {
        img: ['object-fit', 'object-position'],
        a:   ['text-decoration', 'cursor'],
    },
    styleDenyByTag: {
        img: ['font-size','font-weight','line-height','letter-spacing','text-align'], // img에는 타이포 금지
        span: ['width','height'],                                                     // inline 기본 제한
    },

    // (선택) 속성/이벤트 화이트리스트
    attrsByTag: {
        img: ['alt', 'src', 'srcset', 'decoding', 'loading'],
        a:   ['href', 'target', 'rel'],
        button: ['type', 'disabled'],
    },
    eventsByTag: {
        a: ['onClick', 'onMouseEnter', 'onMouseLeave', 'onFocus', 'onBlur'],
        button: ['onClick', 'onFocus', 'onBlur'],
        div: ['onClick', 'onMouseEnter', 'onMouseLeave', 'onDragStart', 'onDragEnd'],
    },
};