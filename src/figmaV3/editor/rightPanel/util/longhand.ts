'use client';

import * as React from 'react';
import { StyleValues, SetStyleValue } from "./types";

/** 값이 비어있다면 세팅 */
export function setIfEmpty(values: StyleValues, setValue: SetStyleValue, key: string, next?: string) {
    setValue(key, next);
}

/** 상세가 열려 있는 동안 shorthand가 바뀌면 longhand를 동기화 (원본 로직 유지) */
export function useSyncLonghand(opts: {
    expanded: Record<string, boolean>;
    detailKey: string;                 // e.g. "Layout.padding"
    shorthandKey: keyof StyleValues;   // e.g. "padding"
    values: StyleValues;
    setValue: SetStyleValue;
    parse: (raw?: string) => Record<string, string>;
    map: Record<string, string>;       // derivedKey -> longhandKey
}) {
    const { expanded, detailKey, shorthandKey, values, setValue, parse, map } = opts;
    const prevDerivedRef = React.useRef<Record<string, string>>({});

    React.useEffect(() => {
        if (!expanded[detailKey]) return;

        const raw = String(values[shorthandKey] ?? '');
        const nextDerived = parse(raw);
        const prevDerived = prevDerivedRef.current;

        Object.entries(map).forEach(([derivedKey, longhandKey]) => {
            const cur = String(values[longhandKey] ?? '');
            const prev = prevDerived[derivedKey] ?? '';
            const next = nextDerived[derivedKey] ?? '';

            // longhand가 비어있거나 이전에 shorthand로 채워졌던 값(prev)과 같으면 갱신
            const shouldUpdate = cur === '' || cur === prev;
            if (shouldUpdate && next !== cur) setValue(longhandKey, next);
        });

        prevDerivedRef.current = nextDerived;
    }, [expanded[detailKey], values[shorthandKey]]);
}

/** padding/margin 같은 1~4 값 box shorthand 확장 */
export function expandBoxShorthand(raw: string) {
    const t = (raw || '').trim();
    if (!t) return { top: '', right: '', bottom: '', left: '' };
    const parts = t.split(/\s+/).slice(0, 4);
    const [a, b, c, d] = parts;
    if (parts.length === 1) return { top: a, right: a, bottom: a, left: a };
    if (parts.length === 2) return { top: a, right: b, bottom: a, left: b };
    if (parts.length === 3) return { top: a, right: b, bottom: c, left: b };
    return { top: a, right: b, bottom: c, left: d };
}

/** border/outline: "1px solid red" → width/style/color */
export function parseBorderLike(raw: string) {
    const t = (raw || '').trim();
    if (!t) return { width: '', style: '', color: '' };
    const parts = t.split(/\s+/);
    let width = '', style = '', color = '';

    for (const p of parts) {
        if (!width && /(^\d+(\.\d+)?(px|em|rem|%)?$)|(^thin$|^medium$|^thick$)/i.test(p)) { width = p; continue; }
        if (!style && /^(none|hidden|solid|dashed|dotted|double|groove|ridge|inset|outset)$/i.test(p)) { style = p; continue; }
        if (!color && (/^#([0-9a-f]{3,8})$/i.test(p) || /^rgb|^hsl/i.test(p) || /^[a-zA-Z]+$/.test(p))) { color = p; continue; }
    }
    return { width, style, color };
}

/** filter/transform: "fn1(x) fn2(y)" → { fn1:"fn1(x)", fn2:"fn2(y)" } */
export function parseFunctionList(raw: string) {
    const t = (raw || '').trim();
    const out: Record<string, string> = {};
    if (!t) return out;
    const re = /([a-zA-Z-]+)\s*\(([^)]*)\)/g;
    let m;
    while ((m = re.exec(t))) {
        const name = m[1];
        out[name] = `${name}(${m[2]})`;
    }
    return out;
}

/** transition: "prop dur easing delay" → 각 longhand */
export function parseTransition(raw: string) {
    const t = (raw || '').trim();
    if (!t) return { transitionProperty: '', transitionDuration: '', transitionTimingFunction: '', transitionDelay: '' };

    const first = t.split(',')[0].trim();
    const tokens = first.split(/\s+/);

    let property = 'all', duration = '150ms', timing = '', delay = '';
    const timeToken = (s: string) => /^(?:\d+\.?\d*)(ms|s)$/.test(s);
    const timingToken = (s: string) =>
        /^(ease|linear|ease-in|ease-out|ease-in-out|step-start|step-end|steps\(\d+,\s*(start|end)\)|cubic-bezier\([^)]*\))$/.test(s);

    let i = 0;
    if (tokens[i] && !timeToken(tokens[i]) && !timingToken(tokens[i])) { property = tokens[i++]; }
    if (tokens[i] && timeToken(tokens[i])) { duration = tokens[i++]; }
    if (tokens[i] && timingToken(tokens[i])) { timing = tokens[i++]; }
    if (tokens[i] && timeToken(tokens[i])) { delay = tokens[i++]; }

    return {
        transitionProperty: property,
        transitionDuration: duration,
        transitionTimingFunction: timing,
        transitionDelay: delay,
    };
}

/** background: 단순화 파서 */
export function parseBackground(raw: string) {
    const t = (raw || '').trim();
    const out: Record<string, string> = {
        backgroundImage: '',
        backgroundPosition: '',
        backgroundSize: '',
        backgroundRepeat: '',
        backgroundClip: '',
        backgroundOrigin: '',
        backgroundAttachment: '',
    };
    if (!t) return out;

    const urlMatch = t.match(/url\([^\)]*\)|none/);
    if (urlMatch) out.backgroundImage = urlMatch[0];

    const slash = t.split('/');
    if (slash.length > 1) {
        const right = slash[1].trim();
        const sizeToken = right.split(/\s+/)[0];
        out.backgroundSize = sizeToken;
    }

    const repeat = t.match(/\b(no-repeat|repeat|repeat-x|repeat-y)\b/);
    if (repeat) out.backgroundRepeat = repeat[0];

    const pos = t.match(/\b(\d+%|\d+px|left|center|right|top|bottom)\b(?:\s+(\d+%|\d+px|left|center|right|top|bottom)\b)?/);
    if (pos) out.backgroundPosition = pos[0];

    const clip = t.match(/\b(border-box|padding-box|content-box)\b/);
    if (clip) out.backgroundClip = clip[0];

    const origin = t.match(/\b(padding-box|border-box|content-box)\b/);
    if (origin) out.backgroundOrigin = origin[0];

    const attachment = t.match(/\b(scroll|fixed|local)\b/);
    if (attachment) out.backgroundAttachment = attachment[0];

    return out;
}