// Global TagPolicy (v1.1)
// 태그별 속성/이벤트/스타일 키 허용 범위를 스펙 기반으로 정의합니다.
// groups 항목은 Inspector의 그룹 패널 묶음에 사용됩니다.

import type { TagPolicy } from '../core/types';

// 정책 레이어: 태그 분류/헬퍼
export const CONTAINER_TAGS = [
    'div', 'section', 'article', 'main', 'nav', 'aside', 'header', 'footer'
] as const;
export const INLINE_OR_SIMPLE_TAGS = [
    'span', 'label', 'button', 'img', 'p', 'a', 'input', 'textarea', 'ul', 'li', 'form'
] as const;

export type HtmlTag = typeof CONTAINER_TAGS[number] | typeof INLINE_OR_SIMPLE_TAGS[number] | string;

export function isContainerTag(tag: string): boolean {
    return (CONTAINER_TAGS as readonly string[]).includes(tag);
}
export function isInlineOrSimple(tag: string): boolean {
    return (INLINE_OR_SIMPLE_TAGS as readonly string[]).includes(tag);
}

/**
 * ✅ 기본 가시성(메인 1차 속성) 시드
 *  - "표시 판단"의 기본값을 보이는(true) 방향으로 제공
 *  - ComponentPolicy의 visible:false로만 숨길 수 있음
 *  - runtime/capabilities.ts 에서 tagSeed와 병합하여 사용
 *
 *  ※ 키 네이밍은 UI에서 쓰는 "메인" 키와 동일해야 합니다.
 *    - layout: display / size / overflow
 *    - spacing, typography, position, border, background, effects 등은
 *      실제 프로젝트 요구에 맞춰 필요 키만 채워 주세요.
 */
export const DEFAULT_MAIN_VISIBILITY: Record<string, readonly string[]> = {
    layout: ['display', 'size', 'overflow'] as const,
    // spacing: ['margin', 'padding'] as const,
    // typography: ['font'] as const,
    // position: ['position'] as const,
    // border: ['border'] as const,
    // background: ['background'] as const,
    // effects: ['shadow', 'filter'] as const,
};

/**
 * 태그별 허용 정책
 *  - styles.groups: 그룹 → 허용 가능한 "실제 속성 키" 목록
 *  - styles.allow/deny: 와일드카드 기반 허용/금지(현재 구조 유지)
 *
 * (주의) 여기서의 키는 "실제 CSS 키"입니다.
 *  - 예: size(메인)는 alias이며, groups에는 width/height 같은 실제 키가 들어갑니다.
 */
export const GLOBAL_TAG_POLICIES: Record<string, TagPolicy> = {
    // ✅ div: grid/flex 포함한 레이아웃 전반 허용
    div: {
        version: '1.1',
        tag: 'div',
        attributes: { allow: ['id','class','title','role','tabIndex','aria-*'] },
        events: { allow: ['onClick','onMouseEnter','onMouseLeave','onKeyDown','onKeyUp','onFocus','onBlur'] },
        styles: {
            allow: ['*'],
            deny: ['content'],
            groups: {
                layout: [
                    'display','overflow','width','height','minWidth','minHeight','maxWidth','maxHeight',
                    'flexDirection','justifyContent','alignItems','gap',
                    'gridTemplateColumns','gridTemplateRows','gridAutoFlow',
                    'flexWrap','flexGrow','flexShrink','order'
                ],
                typography: [
                    'fontSize','fontWeight','lineHeight','fontStyle','textAlign',
                    'letterSpacing','textTransform','color'
                ],
                spacing: [
                    'margin','padding','marginTop','marginRight','marginBottom','marginLeft',
                    'paddingTop','paddingRight','paddingBottom','paddingLeft','rowGap','columnGap'
                ],
                position: ['position','top','right','bottom','left','zIndex','overflowX','overflowY'],
                border: [
                    'border','borderWidth','borderStyle','borderColor',
                    'borderRadius','borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'
                ],
                background: [
                    'background','backgroundColor','backgroundImage','backgroundSize','backgroundRepeat','backgroundPosition'
                ],
                effects: ['boxShadow','opacity','filter','backdropFilter','mixBlendMode'],
                custom: [],
            },
        },
    },

    span: {
        version: '1.1',
        tag: 'span',
        attributes: { allow: ['id','class','title','role','tabIndex','aria-*'] },
        events: { allow: ['onClick','onMouseEnter','onMouseLeave','onKeyDown','onKeyUp','onFocus','onBlur'] },
        styles: {
            allow: ['*'],
            deny: ['content'],
            groups: {
                typography: ['fontSize','fontWeight','lineHeight','fontStyle','textAlign','letterSpacing','textTransform','color'],
                spacing: ['margin','padding','gap'],
                layout: ['display','width','height','minWidth','minHeight','maxWidth','maxHeight'],
                position: ['position','top','right','bottom','left','zIndex'],
                border: ['border','borderWidth','borderStyle','borderColor','borderRadius'],
                background: ['background','backgroundColor'],
                effects: ['boxShadow','opacity','filter'],
                custom: [],
            },
        },
    },

    button: {
        version: '1.1',
        tag: 'button',
        attributes: { allow: ['type','disabled','title','tabIndex','aria-*'], deny: ['href','src'] },
        events: { allow: ['onClick','onFocus','onBlur','onKeyDown','onKeyUp'] },
        styles: {
            allow: ['color','background','backgroundColor','padding','margin','border','borderWidth','borderStyle','borderColor','borderRadius','fontSize','fontWeight','lineHeight','textAlign','width','height','minWidth','minHeight','maxWidth','maxHeight','boxShadow','opacity'],
            deny: ['content'],
            groups: {
                typography: ['fontSize','fontWeight','lineHeight','textAlign','color','textTransform','letterSpacing'],
                spacing: ['margin','padding'],
                layout: ['display','width','height','minWidth','minHeight','maxWidth','maxHeight'],
                border: ['border','borderWidth','borderStyle','borderColor','borderRadius'],
                background: ['background','backgroundColor'],
                effects: ['boxShadow','opacity'],
                custom: [],
            },
        },
    },

    a: {
        version: '1.1',
        tag: 'a',
        attributes: { allow: ['href','target','rel','title','download','aria-*','tabIndex'] },
        events: { allow: ['onClick','onFocus','onBlur','onKeyDown','onKeyUp'] },
        styles: {
            allow: ['color','textDecoration','fontSize','fontWeight','lineHeight','letterSpacing','textTransform','margin','padding','display','width','height','opacity'],
            deny: ['content'],
            groups: {
                typography: ['fontSize','fontWeight','lineHeight','letterSpacing','textTransform','color','textDecoration'],
                spacing: ['margin','padding'],
                layout: ['display','width','height'],
                effects: ['opacity'],
                custom: [],
            },
        },
    },

    img: {
        version: '1.1',
        tag: 'img',
        attributes: { allow: ['src','alt','title','loading','decoding','width','height','referrerPolicy','aria-*'] },
        events: { allow: ['onLoad','onError'] },
        styles: {
            allow: ['width','height','minWidth','minHeight','maxWidth','maxHeight','objectFit','objectPosition','border','borderWidth','borderStyle','borderColor','borderRadius','boxShadow','opacity','display','margin'],
            deny: ['content'],
            groups: {
                layout: ['display','width','height','minWidth','minHeight','maxWidth','maxHeight','objectFit','objectPosition','margin'],
                border: ['border','borderWidth','borderStyle','borderColor','borderRadius'],
                effects: ['boxShadow','opacity'],
                custom: [],
            },
        },
    },

    input: {
        version: '1.1',
        tag: 'input',
        attributes: { allow: ['type','value','placeholder','disabled','readOnly','name','required','min','max','step','checked','aria-*','tabIndex'] },
        events: { allow: ['onChange','onInput','onFocus','onBlur','onKeyDown','onKeyUp'] },
        styles: {
            allow: ['color','backgroundColor','padding','margin','border','borderWidth','borderStyle','borderColor','borderRadius','fontSize','width','height','boxShadow','opacity'],
            deny: ['content'],
            groups: {
                typography: ['fontSize','color'],
                spacing: ['margin','padding'],
                layout: ['display','width','height'],
                border: ['border','borderWidth','borderStyle','borderColor','borderRadius'],
                background: ['backgroundColor'],
                effects: ['boxShadow','opacity'],
                custom: [],
            },
        },
    },

    textarea: {
        version: '1.1',
        tag: 'textarea',
        attributes: { allow: ['placeholder','disabled','readOnly','name','required','rows','cols','aria-*','tabIndex'] },
        events: { allow: ['onChange','onInput','onFocus','onBlur','onKeyDown','onKeyUp'] },
        styles: {
            allow: ['color','backgroundColor','padding','margin','border','borderWidth','borderStyle','borderColor','borderRadius','fontSize','width','height','minHeight','boxShadow','opacity'],
            deny: ['content'],
            groups: {
                typography: ['fontSize','color','lineHeight'],
                spacing: ['margin','padding'],
                layout: ['display','width','height','minHeight'],
                border: ['border','borderWidth','borderStyle','borderColor','borderRadius'],
                background: ['backgroundColor'],
                effects: ['boxShadow','opacity'],
                custom: [],
            },
        },
    },

    label: {
        version: '1.1',
        tag: 'label',
        attributes: { allow: ['htmlFor','title','aria-*','tabIndex'] },
        events: { allow: ['onClick','onFocus','onBlur'] },
        styles: {
            allow: ['color','fontSize','fontWeight','lineHeight','letterSpacing','textTransform','margin','display','opacity'],
            deny: ['content'],
            groups: {
                typography: ['fontSize','fontWeight','lineHeight','letterSpacing','textTransform','color'],
                spacing: ['margin'],
                layout: ['display'],
                effects: ['opacity'],
                custom: [],
            },
        },
    },

    ul: {
        version: '1.1',
        tag: 'ul',
        attributes: { allow: ['role','aria-*'] },
        events: { allow: ['onClick'] },
        styles: {
            allow: ['margin','padding','listStyle','display','gap','width','height'],
            deny: ['content'],
            groups: {
                spacing: ['margin','padding','gap'],
                layout: ['display','width','height'],
                custom: ['listStyle'],
            },
        },
    },

    li: {
        version: '1.1',
        tag: 'li',
        attributes: { allow: ['role','aria-*'] },
        events: { allow: ['onClick'] },
        styles: {
            allow: ['margin','padding','display','width','height','color','fontSize','lineHeight'],
            deny: ['content'],
            groups: {
                spacing: ['margin','padding'],
                layout: ['display','width','height'],
                typography: ['color','fontSize','lineHeight'],
                custom: [],
            },
        },
    },

    nav: {
        version: '1.1',
        tag: 'nav',
        attributes: { allow: ['role','aria-*','title'] },
        events: { allow: ['onClick'] },
        styles: {
            allow: ['*'],
            deny: ['content'],
            groups: {
                layout: ['display','width','height'],
                spacing: ['margin','padding','gap'],
                border: ['border','borderRadius'],
                background: ['background','backgroundColor'],
                effects: ['boxShadow','opacity'],
                typography: ['color','fontSize','lineHeight'],
            },
        },
    },

    header: {
        version: '1.1',
        tag: 'header',
        attributes: { allow: ['role','aria-*','title'] },
        events: { allow: ['onClick'] },
        styles: {
            allow: ['*'],
            deny: ['content'],
            groups: {
                layout: ['display','width','height'],
                spacing: ['margin','padding','gap'],
                border: ['border','borderRadius'],
                background: ['background','backgroundColor'],
                effects: ['boxShadow','opacity'],
                typography: ['color','fontSize','lineHeight'],
            },
        },
    },

    footer: {
        version: '1.1',
        tag: 'footer',
        attributes: { allow: ['role','aria-*','title'] },
        events: { allow: ['onClick'] },
        styles: {
            allow: ['*'],
            deny: ['content'],
            groups: {
                layout: ['display','width','height'],
                spacing: ['margin','padding','gap'],
                border: ['border','borderRadius'],
                background: ['background','backgroundColor'],
                effects: ['boxShadow','opacity'],
                typography: ['color','fontSize','lineHeight'],
            },
        },
    },

    section: {
        version: '1.1',
        tag: 'section',
        attributes: { allow: ['role','aria-*','title'] },
        events: { allow: ['onClick'] },
        styles: {
            allow: ['*'],
            deny: ['content'],
            groups: {
                layout: ['display','width','height'],
                spacing: ['margin','padding','gap'],
                border: ['border','borderRadius'],
                background: ['background','backgroundColor'],
                effects: ['boxShadow','opacity'],
                typography: ['color','fontSize','lineHeight'],
            },
        },
    },

    article: {
        version: '1.1',
        tag: 'article',
        attributes: { allow: ['role','aria-*','title'] },
        events: { allow: ['onClick'] },
        styles: {
            allow: ['*'],
            deny: ['content'],
            groups: {
                layout: ['display','width','height'],
                spacing: ['margin','padding','gap'],
                border: ['border','borderRadius'],
                background: ['background','backgroundColor'],
                effects: ['boxShadow','opacity'],
                typography: ['color','fontSize','lineHeight'],
            },
        },
    },

    form: {
        version: '1.1',
        tag: 'form',
        attributes: { allow: ['action','method','target','noValidate','name','aria-*'] },
        events: { allow: ['onSubmit','onReset','onChange','onInput'] },
        styles: {
            allow: ['display','width','height','margin','padding','gap','border','borderRadius','background','backgroundColor','boxShadow','opacity'],
            deny: ['content'],
            groups: {
                layout: ['display','width','height'],
                spacing: ['margin','padding','gap'],
                border: ['border','borderRadius'],
                background: ['background','backgroundColor'],
                effects: ['boxShadow','opacity'],
                custom: [],
            },
        },
    },
};