export type Shadow = { x: number; y: number; blur: number; spread: number; color: string };

export function parseShadow(v: unknown): Shadow | null {
    if (typeof v !== 'string') return null;
    const s = v.trim();
    const m = s.match(/^(-?\d+)(?:px)?\s+(-?\d+)(?:px)?\s+(\d+)(?:px)?\s+(-?\d+)(?:px)?\s+(.+)$/);
    if (!m) return null;
    return { x: Number(m[1]), y: Number(m[2]), blur: Number(m[3]), spread: Number(m[4]), color: m[5] };
}
export function fmtShadow(sh: Shadow): string {
    return `${sh.x}px ${sh.y}px ${sh.blur}px ${sh.spread}px ${sh.color}`;
}

// filter: blur(px) brightness(%) contrast(%) saturate(%)
export type FilterVals = { blur: number; brightness: number; contrast: number; saturate: number };
export function parseFilter(v: unknown): FilterVals {
    const base: FilterVals = { blur: 0, brightness: 100, contrast: 100, saturate: 100 };
    if (typeof v !== 'string') return base;
    const parts = v.split(/\)\s*/g).map((p) => p.trim()).filter(Boolean);
    for (const p of parts) {
        const m = p.match(/^([a-zA-Z]+)\((.+)$/);
        if (!m) continue;
        const k = m[1]; const rest = m[2];
        const num = (suffix: RegExp) => Number(rest.replace(suffix, ''));
        if (k === 'blur') {
            const n = num(/px\)?$/);
            if (!Number.isNaN(n)) base.blur = n;
        } else if (k === 'brightness') {
            const n = num(/%\)?$/);
            if (!Number.isNaN(n)) base.brightness = n;
        } else if (k === 'contrast') {
            const n = num(/%\)?$/);
            if (!Number.isNaN(n)) base.contrast = n;
        } else if (k === 'saturate') {
            const n = num(/%\)?$/);
            if (!Number.isNaN(n)) base.saturate = n;
        }
    }
    return base;
}
export function fmtFilter(f: FilterVals): string {
    const seg: string[] = [];
    if (f.blur) seg.push(`blur(${f.blur}px)`);
    if (f.brightness !== 100) seg.push(`brightness(${f.brightness}%)`);
    if (f.contrast !== 100) seg.push(`contrast(${f.contrast}%)`);
    if (f.saturate !== 100) seg.push(`saturate(${f.saturate}%)`);
    return seg.join(' ');
}