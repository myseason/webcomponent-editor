// 정책 레이어: 태그 분류/헬퍼
export const CONTAINER_TAGS = [
    'div', 'section', 'article', 'main', 'nav', 'aside', 'header', 'footer'
] as const;

export const INLINE_OR_SIMPLE_TAGS = [
    'span', 'label', 'button', 'img', 'p'
] as const;

export type HtmlTag = typeof CONTAINER_TAGS[number] | typeof INLINE_OR_SIMPLE_TAGS[number] | string;

export function isContainerTag(tag: string): boolean {
    return (CONTAINER_TAGS as readonly string[]).includes(tag);
}

export function isInlineOrSimple(tag: string): boolean {
    return (INLINE_OR_SIMPLE_TAGS as readonly string[]).includes(tag);
}