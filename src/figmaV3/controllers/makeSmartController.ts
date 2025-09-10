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
 *  - 컨트롤러에서 opts.writerAspect: writerRerenderAspect 로 켜면 됩니다.
 * ======================================= */
export const writerRerenderAspect: Aspect = {
    after: () => { requestRerenderTick(); },
    onError: () => { requestRerenderTick(); },
};

/* ========================
 * Proxy(Reader/Writer) 생성
 *  - per-method wrapper -> 먼저 적용
 *  - aspect(before/after/onError) -> 호출 전/후에 실행
 *  - globalAspect도 병행 적용
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
                // 아무 부가 처리 없으면 그대로 반환 (최단 경로)
                return fn as T[Extract<keyof T, string>];
            }

            // Aspect가 있으면 래퍼를 한 번 더 씌움
            return ((...args: unknown[]) => {
                const base = { ctrlName, method: methodName } as const;
                try {
                    globalAspect?.before?.({ ...base, when: 'before' }, args);
                    aspect?.before?.({ ...base, when: 'before' }, args);

                    const result = fn(...args);

                    // 동기/비동기 모두 지원
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
 * Expose Builder
 *  - pickReader / pickWriter: 필요한 키만
 *  - exposeReaderAll / exposeWriterAll / exposeAll: 전부 노출
 *  - wrapReader / wrapWriter: per-method에 MethodWrapper/Aspect 부착
 *  - requireReader / requireWriter: 런타임 검증
 *  - attachReader / attachWriter: 컨트롤러 내부 정의 함수 레지스트리에 추가
 *  - build: Proxy 적용한 객체 반환
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
    attachReader: <N extends string, F extends AnyFn>(name: N, fn: F) => ExposeBuilder<R & Record<N, F>, W>;
    attachWriter: <N extends string, F extends AnyFn>(name: N, fn: F) => ExposeBuilder<R, W & Record<N, F>>;
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

        attachReader: (name, fn) => {
            const nextFullReader = { ...((fullReader ?? curReader) as any), [name]: fn } as object;
            const nextCurReader = { ...(curReader as any), [name]: fn } as any;
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

        attachWriter: (name, fn) => {
            const nextFullWriter = { ...((fullWriter ?? curWriter) as any), [name]: fn } as object;
            const nextCurWriter = { ...(curWriter as any), [name]: fn } as any;
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
 * - opts.aspect:    Reader 전역 Aspect(before/after/onError)
 * - opts.writerAspect: Writer 전역 Aspect(Writer 전용)  ← 신규
 * - opts.wrap:      { [methodName]: Aspect | MethodWrapper } (reader/writer 이름 기준 공통 매핑)
 */
export function makeSmartController<R extends object, W extends object>(
    controllerName: string,
    RE: R,
    WE: W,
    opts?: {
        aspect?: Aspect;               // Reader 전역 Aspect
        writerAspect?: Aspect;         // Writer 전용 전역 Aspect (writer 호출 후 리렌더 등)
        wrap?: Record<string, WrapEntry>;
    }
): ExposeBuilder<R, W> {
    const readerWraps: WrapMaps = { methodAspects: {}, methodWrappers: {} };
    const writerWraps: WrapMaps = { methodAspects: {}, methodWrappers: {} };

    if (opts?.wrap) {
        for (const k of Object.keys(opts.wrap)) {
            const entry = opts.wrap[k];
            const { aspect, wrapper } = splitWrapEntry(entry);
            if (aspect) {
                readerWraps.methodAspects[k] = aspect;
                writerWraps.methodAspects[k] = aspect;
            }
            if (wrapper) {
                readerWraps.methodWrappers[k] = wrapper;
                writerWraps.methodWrappers[k] = wrapper;
            }
        }
    }

    // rerender을 위한 aspect
    const resolvedWriterAspect: Aspect | undefined =
        opts?.writerAspect === undefined
            ? writerRerenderAspect
            : opts.writerAspect ?? undefined;

    // 최초 builder는 RE/WE를 "현재 선택 집합"이자 "전체 집합"으로 등록
    return makeBuilder(
        controllerName,
        RE,
        WE,
        opts?.aspect,          // Reader 글로벌 Aspect
        resolvedWriterAspect,    // Writer 전용 글로벌 Aspect
        readerWraps,
        writerWraps,
        RE,
        WE
    );
}