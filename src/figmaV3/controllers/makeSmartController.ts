'use client';

import type { AnyFn } from './types';
import { requestRerenderTick } from './adapters/uiRerender';

/* ========================
 * Aspect & Wrapper Types
 * ====================== */

export type AspectCtx = {
    ctrlName: string;
    method: string;
    when: 'before' | 'after' | 'error';
};

export type Aspect = {
    before?: (ctx: AspectCtx, args: unknown[]) => void;
    after?: (ctx: AspectCtx, args: unknown[], result: unknown) => void;
    onError?: (ctx: AspectCtx, args: unknown[], error: unknown) => void;
};

/** 기존 withLog('name')처럼 (orig)=>wrapped 를 지원하기 위한 타입 */
export type MethodWrapper<F extends AnyFn = AnyFn> = (orig: F, meta?: { ctrlName?: string; method?: string }) => F;

/** per-method로 적용되는 항목: Aspect 또는 MethodWrapper 둘 다 허용 */
type WrapEntry = Aspect | MethodWrapper;

/* 내부: wrap엔트리를 두 갈래로 나눠 관리 */
type WrapMaps = {
    methodAspects: Record<string, Aspect | undefined>;
    methodWrappers: Record<string, MethodWrapper | undefined>;
};

function splitWrapEntry(entry?: WrapEntry): { aspect?: Aspect; wrapper?: MethodWrapper } {
    if (!entry) return {};
    const maybeAspect = entry as Partial<Aspect>;
    const looksAspect =
        typeof entry === 'object' &&
        (typeof maybeAspect.before === 'function' ||
            typeof maybeAspect.after === 'function' ||
            typeof maybeAspect.onError === 'function');

    if (looksAspect) return { aspect: entry as Aspect };
    if (typeof entry === 'function') return { wrapper: entry as MethodWrapper };
    return {};
}

/* =========================================
 * 기본 제공 Aspect: writer 호출 후 리렌더
 * ======================================= */
export const writerRerenderAspect: Aspect = {
    after: () => { requestRerenderTick(); },
    onError: () => { requestRerenderTick(); },
};

/* ========================
 * Proxy(Reader/Writer) 생성
 * ====================== */

function createHybridProxy<T extends object>(
    bag: T,
    ctrlName: string,
    perMethod: WrapMaps,
    globalAspect?: Aspect
): T {
    return new Proxy(bag, {
        get(target, p, receiver) {
            const v = Reflect.get(target, p, receiver) as unknown;
            if (typeof p !== 'string') return v as T[Extract<keyof T, symbol>];
            if (typeof v !== 'function') return v as T[Extract<keyof T, string>];

            const methodName = p;
            const aspect = perMethod.methodAspects[methodName];
            const wrapper = perMethod.methodWrappers[methodName];

            // 1) this 바인딩 유지
            let fn = (v as Function).bind(target) as AnyFn;

            // 2) MethodWrapper 먼저 적용 (원본을 감싸서 기능 확장/치환)
            if (wrapper) {
                fn = wrapper(fn, { ctrlName, method: methodName });
            }

            // 3) Aspect 적용 (before/after/onError)
            if (!globalAspect && !aspect) {
                return fn as T[Extract<keyof T, string>];
            }

            return ((...args: unknown[]) => {
                const base = { ctrlName, method: methodName } as const;
                try {
                    globalAspect?.before?.({ ...base, when: 'before' }, args);
                    aspect?.before?.({ ...base, when: 'before' }, args);

                    const result = fn(...args);

                    if (result && typeof (result as any).then === 'function') {
                        return (result as Promise<unknown>)
                            .then((res) => {
                                globalAspect?.after?.({ ...base, when: 'after' }, args, res);
                                aspect?.after?.({ ...base, when: 'after' }, args, res);
                                return res;
                            })
                            .catch((err) => {
                                globalAspect?.onError?.({ ...base, when: 'error' }, args, err);
                                aspect?.onError?.({ ...base, when: 'error' }, args, err);
                                throw err;
                            });
                    } else {
                        globalAspect?.after?.({ ...base, when: 'after' }, args, result);
                        aspect?.after?.({ ...base, when: 'after' }, args, result);
                        return result;
                    }
                } catch (err) {
                    globalAspect?.onError?.({ ...base, when: 'error' }, args, err);
                    aspect?.onError?.({ ...base, when: 'error' }, args, err);
                    throw err;
                }
            }) as T[Extract<keyof T, string>];
        },
    });
}

/* ========================
 * 충돌 안전 attach 보강
 * ====================== */

// 충돌 처리 전략
type AttachConflictPolicy = 'skip' | 'override' | 'wrap';

// attach 옵션
type AttachOptions<F extends AnyFn = AnyFn> = {
    onConflict?: AttachConflictPolicy;                 // 기본 'skip'
    wrapResolver?: (orig: F, injected: F) => F;       // wrap일 때의 합성 규칙
};

// 안전한 hasOwn
function hasOwn(obj: object | undefined, k: string) {
    return !!obj && Object.prototype.hasOwnProperty.call(obj, k);
}

// 로깅(원하면 console.debug로)
function logAttach(controllerName: string, side: 'reader'|'writer', name: string, action: string) {
    try { console.warn(`[${controllerName}] ${side}.attach("${name}") -> ${action}`); } catch {}
}

/* ========================
 * Expose Builder
 * ====================== */

export type ExposeBuilder<R extends object, W extends object> = {
    pickReader: <K extends keyof R>(...keys: K[]) => ExposeBuilder<Pick<R, K>, W>;
    pickWriter: <K extends keyof W>(...keys: K[]) => ExposeBuilder<R, Pick<W, K>>;
    exposeReaderAll: () => ExposeBuilder<R, W>;
    exposeWriterAll: () => ExposeBuilder<R, W>;
    exposeAll: () => ExposeBuilder<R, W>;
    wrapReader: <K extends keyof R & string>(key: K, entry: WrapEntry) => ExposeBuilder<R, W>;
    wrapWriter: <K extends keyof W & string>(key: K, entry: WrapEntry) => ExposeBuilder<R, W>;
    requireReader: (...keys: (keyof R & string)[]) => ExposeBuilder<R, W>;
    requireWriter: (...keys: (keyof W & string)[]) => ExposeBuilder<R, W>;
    attachReader: <N extends string, F extends AnyFn>(name: N, fn: F, opts?: AttachOptions<F>) => ExposeBuilder<R & Record<N, F>, W>;
    attachWriter: <N extends string, F extends AnyFn>(name: N, fn: F, opts?: AttachOptions<F>) => ExposeBuilder<R, W & Record<N, F>>;
    build: () => { reader: R; writer: W };
};

function makeBuilder<R extends object, W extends object>(
    controllerName: string,
    curReader: R,
    curWriter: W,
    readerGlobalAspect?: Aspect,
    writerGlobalAspect?: Aspect,
    readerWraps: WrapMaps = { methodAspects: {}, methodWrappers: {} },
    writerWraps: WrapMaps = { methodAspects: {}, methodWrappers: {} },
    // 원본 전체(전체 노출/attach 누적용)
    fullReader?: object,
    fullWriter?: object
): ExposeBuilder<R, W> {
    return {
        pickReader: (...keys) => {
            const next: Partial<R> = {};
            for (const k of keys) if (k in curReader) (next as any)[k] = (curReader as any)[k];
            return makeBuilder(
                controllerName,
                next as Pick<R, (typeof keys)[number]>,
                curWriter,
                readerGlobalAspect,
                writerGlobalAspect,
                readerWraps,
                writerWraps,
                fullReader ?? curReader,
                fullWriter ?? curWriter
            ) as any;
        },

        pickWriter: (...keys) => {
            const next: Partial<W> = {};
            for (const k of keys) if (k in curWriter) (next as any)[k] = (curWriter as any)[k];
            return makeBuilder(
                controllerName,
                curReader,
                next as Pick<W, (typeof keys)[number]>,
                readerGlobalAspect,
                writerGlobalAspect,
                readerWraps,
                writerWraps,
                fullReader ?? curReader,
                fullWriter ?? curWriter
            ) as any;
        },

        exposeReaderAll: () => {
            const source = (fullReader ?? curReader) as R;
            return makeBuilder(
                controllerName,
                source,
                curWriter,
                readerGlobalAspect,
                writerGlobalAspect,
                readerWraps,
                writerWraps,
                source,
                fullWriter ?? curWriter
            );
        },

        exposeWriterAll: () => {
            const source = (fullWriter ?? curWriter) as W;
            return makeBuilder(
                controllerName,
                curReader,
                source,
                readerGlobalAspect,
                writerGlobalAspect,
                readerWraps,
                writerWraps,
                fullReader ?? curReader,
                source
            );
        },

        exposeAll: () => {
            const srcR = (fullReader ?? curReader) as R;
            const srcW = (fullWriter ?? curWriter) as W;
            return makeBuilder(
                controllerName,
                srcR,
                srcW,
                readerGlobalAspect,
                writerGlobalAspect,
                readerWraps,
                writerWraps,
                srcR,
                srcW
            );
        },

        wrapReader: (key, entry) => {
            const { aspect, wrapper } = splitWrapEntry(entry);
            if (aspect) readerWraps.methodAspects[key] = aspect;
            if (wrapper) readerWraps.methodWrappers[key] = wrapper;
            return makeBuilder(
                controllerName,
                curReader,
                curWriter,
                readerGlobalAspect,
                writerGlobalAspect,
                readerWraps,
                writerWraps,
                fullReader ?? curReader,
                fullWriter ?? curWriter
            );
        },

        wrapWriter: (key, entry) => {
            const { aspect, wrapper } = splitWrapEntry(entry);
            if (aspect) writerWraps.methodAspects[key] = aspect;
            if (wrapper) writerWraps.methodWrappers[key] = wrapper;
            return makeBuilder(
                controllerName,
                curReader,
                curWriter,
                readerGlobalAspect,
                writerGlobalAspect,
                readerWraps,
                writerWraps,
                fullReader ?? curReader,
                fullWriter ?? curWriter
            );
        },

        requireReader: (...keys) => {
            for (const k of keys) {
                if (typeof (curReader as any)[k] !== 'function' && (curReader as any)[k] === undefined) {
                    throw new Error(`[${controllerName}] reader.${String(k)} is missing. Check useEngine domains or method name.`);
                }
            }
            return makeBuilder(
                controllerName,
                curReader,
                curWriter,
                readerGlobalAspect,
                writerGlobalAspect,
                readerWraps,
                writerWraps,
                fullReader ?? curReader,
                fullWriter ?? curWriter
            );
        },

        requireWriter: (...keys) => {
            for (const k of keys) {
                if (typeof (curWriter as any)[k] !== 'function' && (curWriter as any)[k] === undefined) {
                    throw new Error(`[${controllerName}] writer.${String(k)} is missing. Check useEngine domains or method name.`);
                }
            }
            return makeBuilder(
                controllerName,
                curReader,
                curWriter,
                readerGlobalAspect,
                writerGlobalAspect,
                readerWraps,
                writerWraps,
                fullReader ?? curReader,
                fullWriter ?? curWriter
            );
        },

        // ⬇️ 충돌 안전 attachReader
        attachReader: (name, fn, opts = {onConflict: 'skip'}) => {
            const key = String(name);
            const policy: AttachConflictPolicy = opts?.onConflict ?? 'skip';

            const srcFull = (fullReader ?? curReader) as any;
            const srcCur  = (curReader as any);

            const existsInFull = hasOwn(srcFull, key);
            const existsInCur  = hasOwn(srcCur, key);

            if (existsInFull || existsInCur) {
                const prev = (existsInCur ? srcCur[key] : srcFull[key]) as AnyFn | unknown;

                if (policy === 'skip') {
                    logAttach(controllerName, 'reader', key, 'skipped (exists)');
                    return makeBuilder(
                        controllerName,
                        curReader,
                        curWriter,
                        readerGlobalAspect,
                        writerGlobalAspect,
                        readerWraps,
                        writerWraps,
                        fullReader ?? curReader,
                        fullWriter ?? curWriter
                    ) as any;
                }

                if (policy === 'wrap') {
                    const wrapResolver =
                        (opts?.wrapResolver as ((o: AnyFn, n: AnyFn) => AnyFn) | undefined)
                        // 기본: 새 함수(injected)만 호출(기존은 필요 시 클로저로 사용)
                        ?? ((o, n) => ((...args: unknown[]) => (n as any)(...args)) as AnyFn);

                    if (typeof prev === 'function') {
                        const wrapped = wrapResolver(prev as AnyFn, fn as AnyFn);
                        const nextFullReader = { ...srcFull, [key]: wrapped } as object;
                        const nextCurReader  = { ...srcCur,  [key]: wrapped } as any;
                        logAttach(controllerName, 'reader', key, 'wrapped');
                        return makeBuilder(
                            controllerName,
                            nextCurReader,
                            curWriter,
                            readerGlobalAspect,
                            writerGlobalAspect,
                            readerWraps,
                            writerWraps,
                            nextFullReader,
                            fullWriter ?? curWriter
                        ) as any;
                    }
                    // prev가 함수가 아니면 override와 동일 처리
                }

                // override
                if (policy === 'override') {
                    const nextFullReader = { ...srcFull, [key]: fn } as object;
                    const nextCurReader  = { ...srcCur,  [key]: fn } as any;
                    logAttach(controllerName, 'reader', key, 'overridden');
                    return makeBuilder(
                        controllerName,
                        nextCurReader,
                        curWriter,
                        readerGlobalAspect,
                        writerGlobalAspect,
                        readerWraps,
                        writerWraps,
                        nextFullReader,
                        fullWriter ?? curWriter
                    ) as any;
                }
            }

            // 신규 추가
            const nextFullReader = { ...((fullReader ?? curReader) as any), [key]: fn } as object;
            const nextCurReader  = { ...(curReader as any), [key]: fn } as any;
            logAttach(controllerName, 'reader', key, 'attached');
            return makeBuilder(
                controllerName,
                nextCurReader,
                curWriter,
                readerGlobalAspect,
                writerGlobalAspect,
                readerWraps,
                writerWraps,
                nextFullReader,
                fullWriter ?? curWriter
            ) as any;
        },

        // ⬇️ 충돌 안전 attachWriter
        attachWriter: (name, fn, opts = {onConflict: 'skip'}) => {
            const key = String(name);
            const policy: AttachConflictPolicy = opts?.onConflict ?? 'skip';

            const srcFull = (fullWriter ?? curWriter) as any;
            const srcCur  = (curWriter as any);

            const existsInFull = hasOwn(srcFull, key);
            const existsInCur  = hasOwn(srcCur, key);

            if (existsInFull || existsInCur) {
                const prev = (existsInCur ? srcCur[key] : srcFull[key]) as AnyFn | unknown;

                if (policy === 'skip') {
                    logAttach(controllerName, 'writer', key, 'skipped (exists)');
                    return makeBuilder(
                        controllerName,
                        curReader,
                        curWriter,
                        readerGlobalAspect,
                        writerGlobalAspect,
                        readerWraps,
                        writerWraps,
                        fullReader ?? curReader,
                        fullWriter ?? curWriter
                    ) as any;
                }

                if (policy === 'wrap') {
                    const wrapResolver =
                        (opts?.wrapResolver as ((o: AnyFn, n: AnyFn) => AnyFn) | undefined)
                        ?? ((o, n) => ((...args: unknown[]) => (n as any)(...args)) as AnyFn);

                    if (typeof prev === 'function') {
                        const wrapped = wrapResolver(prev as AnyFn, fn as AnyFn);
                        const nextFullWriter = { ...srcFull, [key]: wrapped } as object;
                        const nextCurWriter  = { ...srcCur,  [key]: wrapped } as any;
                        logAttach(controllerName, 'writer', key, 'wrapped');
                        return makeBuilder(
                            controllerName,
                            curReader,
                            nextCurWriter,
                            readerGlobalAspect,
                            writerGlobalAspect,
                            readerWraps,
                            writerWraps,
                            fullReader ?? curReader,
                            nextFullWriter
                        ) as any;
                    }
                    // prev가 함수가 아니면 override와 동일 처리
                }

                if (policy === 'override') {
                    const nextFullWriter = { ...srcFull, [key]: fn } as object;
                    const nextCurWriter  = { ...srcCur,  [key]: fn } as any;
                    logAttach(controllerName, 'writer', key, 'overridden');
                    return makeBuilder(
                        controllerName,
                        curReader,
                        nextCurWriter,
                        readerGlobalAspect,
                        writerGlobalAspect,
                        readerWraps,
                        writerWraps,
                        fullReader ?? curReader,
                        nextFullWriter
                    ) as any;
                }
            }

            // 신규 추가
            const nextFullWriter = { ...((fullWriter ?? curWriter) as any), [key]: fn } as object;
            const nextCurWriter  = { ...(curWriter as any), [key]: fn } as any;
            logAttach(controllerName, 'writer', key, 'attached');
            return makeBuilder(
                controllerName,
                curReader,
                nextCurWriter,
                readerGlobalAspect,
                writerGlobalAspect,
                readerWraps,
                writerWraps,
                fullReader ?? curWriter,
                nextFullWriter
            ) as any;
        },

        build: () => {
            const r = createHybridProxy(curReader, `${controllerName}.reader`, readerWraps, readerGlobalAspect);
            const w = createHybridProxy(curWriter, `${controllerName}.writer`, writerWraps, writerGlobalAspect);
            return { reader: r, writer: w };
        },
    };
}

/**
 * makeSmartController
 * - opts.aspect:       Reader 전역 Aspect(before/after/onError)
 * - opts.writerAspect: Writer 전역 Aspect(Writer 호출 후 리렌더 등)
 * - opts.readerWrap / writerWrap: per-method Aspect/Wrapper 지정
 */
export function makeSmartController<R extends object, W extends object>(
    controllerName: string,
    RE: R,
    WE: W,
    opts?: {
        aspect?: Aspect;               // Reader 전역 Aspect
        writerAspect?: Aspect;         // Writer 전용 전역 Aspect
        readerWrap?: Record<string, WrapEntry>;
        writerWrap?: Record<string, WrapEntry>;
    }
): ExposeBuilder<R, W> {
    const readerWraps: WrapMaps = { methodAspects: {}, methodWrappers: {} };
    const writerWraps: WrapMaps = { methodAspects: {}, methodWrappers: {} };
    const wrap = (wrapList: Record<string, WrapEntry>, wrapMap: WrapMaps) => {
        for (const k of Object.keys(wrapList)) {
            const entry = wrapList[k];
            const { aspect, wrapper } = splitWrapEntry(entry);
            if (aspect) {
                wrapMap.methodAspects[k] = aspect;
            }
            if (wrapper) {
                wrapMap.methodWrappers[k] = wrapper;
            }
        }
    };

    if (opts?.readerWrap) wrap(opts.readerWrap, readerWraps);
    if (opts?.writerWrap) wrap(opts.writerWrap, writerWraps);

    // writer는 기본적으로 호출 후 리렌더를 켭니다(원하면 명시적으로 끌 수 있음)
    const resolvedWriterAspect: Aspect | undefined =
        opts?.writerAspect === undefined
            ? writerRerenderAspect
            : opts.writerAspect ?? undefined;

    // 최초 builder는 RE/WE를 "현재 선택 집합"이자 "전체 집합"으로 등록
    return makeBuilder(
        controllerName,
        RE,
        WE,
        opts?.aspect,            // Reader 글로벌 Aspect
        resolvedWriterAspect,    // Writer 전용 글로벌 Aspect
        readerWraps,
        writerWraps,
        RE,
        WE
    );
}