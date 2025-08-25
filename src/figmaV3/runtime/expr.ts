/**
 * 안전한 when 표현식 파서/평가기
 * - 지원: true/false/null/숫자/'문자열', 경로(data.xxx / node.yyy / project.zzz),
 *         비교(==, !=, >, >=, <, <=), 논리(!, &&, ||), 괄호()
 * - 미지원: 함수 호출, [] 인덱싱 등 (보안/SSR 안정성 보장)
 *
 * 사용:
 *   evalWhenExpr("data.user == 'admin' && node.props.enabled == true", { data, node, project })
 *
 * 규약:
 * - any 금지
 * - 순수 함수(부작용 없음)
 */

import type { BindingScope } from '../core/types';

// ──────────────────────────────────────────────────────────────────────────────
// 토크나이저
// ──────────────────────────────────────────────────────────────────────────────

type TokType =
    | 'ident' | 'number' | 'string'
    | 'true' | 'false' | 'null'
    | 'dot' | 'lparen' | 'rparen'
    | 'eq' | 'ne' | 'gt' | 'lt' | 'ge' | 'le'
    | 'and' | 'or' | 'not'
    | 'eof';

type Token = { t: TokType; v?: string };

function isSpace(ch: string): boolean { return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r'; }
function isDigit(ch: string): boolean { return ch >= '0' && ch <= '9'; }
function isIdentStart(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$';
}
function isIdentBody(ch: string): boolean {
    return isIdentStart(ch) || isDigit(ch);
}

class Lexer {
    private i = 0;
    constructor(private readonly s: string) {}
    next(): Token {
        const s = this.s;
        const n = s.length;
        while (this.i < n && isSpace(s[this.i] ?? '')) this.i++;

        if (this.i >= n) return { t: 'eof' };

        const ch = s[this.i] ?? '';

        // 2글자 연산자
        const two = s.slice(this.i, this.i + 2);
        if (two === '==') { this.i += 2; return { t: 'eq' }; }
        if (two === '!=') { this.i += 2; return { t: 'ne' }; }
        if (two === '>=') { this.i += 2; return { t: 'ge' }; }
        if (two === '<=') { this.i += 2; return { t: 'le' }; }
        if (two === '&&') { this.i += 2; return { t: 'and' }; }
        if (two === '||') { this.i += 2; return { t: 'or' }; }

        // 1글자 토큰
        if (ch === '.') { this.i++; return { t: 'dot' }; }
        if (ch === '(') { this.i++; return { t: 'lparen' }; }
        if (ch === ')') { this.i++; return { t: 'rparen' }; }
        if (ch === '!') { this.i++; return { t: 'not' }; }
        if (ch === '>') { this.i++; return { t: 'gt' }; }
        if (ch === '<') { this.i++; return { t: 'lt' }; }

        // 문자열
        if (ch === "'" || ch === '"') {
            const quote = ch;
            this.i++;
            let buf = '';
            while (this.i < n) {
                const c = s[this.i] ?? '';
                if (c === '\\') {
                    const next = s[this.i + 1] ?? '';
                    if (next === 'n') { buf += '\n'; this.i += 2; continue; }
                    if (next === 't') { buf += '\t'; this.i += 2; continue; }
                    if (next === quote) { buf += quote; this.i += 2; continue; }
                    buf += next; this.i += 2; continue;
                }
                if (c === quote) { this.i++; break; }
                buf += c; this.i++;
            }
            return { t: 'string', v: buf };
        }

        // 숫자
        if (isDigit(ch)) {
            let j = this.i + 1;
            while (j < n && (isDigit(s[j] ?? '') || (s[j] === '.' && isDigit(s[j + 1] ?? '')))) j++;
            const num = s.slice(this.i, j);
            this.i = j;
            return { t: 'number', v: num };
        }

        // 식별자/키워드
        if (isIdentStart(ch)) {
            let j = this.i + 1;
            while (j < n && isIdentBody(s[j] ?? '')) j++;
            const ident = s.slice(this.i, j);
            this.i = j;

            if (ident === 'true') return { t: 'true' };
            if (ident === 'false') return { t: 'false' };
            if (ident === 'null') return { t: 'null' };

            return { t: 'ident', v: ident };
        }

        // 알 수 없는 문자 → 안전하게 eof
        this.i = n;
        return { t: 'eof' };
    }
}

// ──────────────────────────────────────────────────────────────────────────────
/** 이진 연산자 리터럴 유니온 (인덱싱 타입 대신 명시) */
type BinOp = 'eq'|'ne'|'gt'|'ge'|'lt'|'le'|'and'|'or';

type Expr =
    | { k: 'literal'; v: unknown }
    | { k: 'path'; root: 'data' | 'node' | 'project'; segs: string[] }
    | { k: 'unary'; op: 'not'; r: Expr }
    | { k: 'binary'; op: BinOp; l: Expr; r: Expr };

class Parser {
    private cur: Token;
    private readonly lex: Lexer;
    constructor(source: string) {
        this.lex = new Lexer(source);
        this.cur = this.lex.next();
    }
    private eat(t: TokType): void {
        if (this.cur.t !== t) throw new Error(`Expected ${t}, got ${this.cur.t}`);
        this.cur = this.lex.next();
    }
    private parsePrimary(): Expr {
        // 토큰 타입은 지역 변수로 캡처(이후 this.cur 변동과 독립)
        const t0: TokType = this.cur.t;

        switch (t0) {
            case 'true': this.eat('true'); return { k: 'literal', v: true };
            case 'false': this.eat('false'); return { k: 'literal', v: false };
            case 'null': this.eat('null'); return { k: 'literal', v: null };
            case 'number': {
                const v = Number(this.cur.v ?? '0');
                this.eat('number');
                return { k: 'literal', v };
            }
            case 'string': {
                const v = this.cur.v ?? '';
                this.eat('string');
                return { k: 'literal', v };
            }
            case 'ident': {
                const root = this.cur.v as 'data'|'node'|'project'|string;
                this.eat('ident');
                if (root !== 'data' && root !== 'node' && root !== 'project') {
                    // 허용되지 않은 루트 → 항상 undefined 경로
                    return { k: 'path', root: 'data', segs: ['__invalid__'] };
                }
                const segs: string[] = [];
                while (this.cur.t === 'dot') {
                    // '.' 소비 후 곧바로 'ident'를 기대/소비하면서 값 캡처
                    this.eat('dot');
                    const segTok = this.cur;   // 현재 토큰(식별자) 스냅샷
                    this.eat('ident');         // ident가 아니면 여기서 throw
                    segs.push(String(segTok.v ?? ''));
                }
                return { k: 'path', root, segs };
            }
            case 'lparen': {
                this.eat('lparen');
                const e = this.parseExpr(0);
                this.eat('rparen');
                return e;
            }
            case 'not': {
                this.eat('not');
                const r = this.parseExpr(7); // not의 높은 우선순위
                return { k: 'unary', op: 'not', r };
            }
            default:
                throw new Error(`Unexpected token: ${this.cur.t}`);
        }
    }

    private prec(t: TokType): number {
        // 낮을수록 결합이 약함
        switch (t) {
            case 'or': return 1;
            case 'and': return 2;
            case 'eq': case 'ne': return 3;
            case 'gt': case 'ge': case 'lt': case 'le': return 4;
            default: return 0;
        }
    }

    private binOp(t: TokType): BinOp {
        switch (t) {
            case 'or': return 'or';
            case 'and': return 'and';
            case 'eq': return 'eq';
            case 'ne': return 'ne';
            case 'gt': return 'gt';
            case 'ge': return 'ge';
            case 'lt': return 'lt';
            case 'le': return 'le';
            default: throw new Error(`not a binary op: ${t}`);
        }
    }

    private parseExpr(minPrec: number): Expr {
        let left = this.parsePrimary();

        while (true) {
            const p = this.prec(this.cur.t);
            if (p === 0 || p <= minPrec) break;

            const opTok = this.cur.t;
            this.eat(opTok);
            const right = this.parseExpr(p);
            left = { k: 'binary', op: this.binOp(opTok), l: left, r: right };
        }
        return left;
    }

    parse(): Expr {
        const e = this.parseExpr(0);
        if (this.cur.t !== 'eof') throw new Error('Unexpected trailing tokens');
        return e;
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// 평가기
// ──────────────────────────────────────────────────────────────────────────────

function getByPath(obj: unknown, segs: string[]): unknown {
    let cur: unknown = obj;
    for (const k of segs) {
        if (cur && typeof cur === 'object' && k in (cur as Record<string, unknown>)) {
            cur = (cur as Record<string, unknown>)[k];
        } else {
            return undefined;
        }
    }
    return cur;
}

function cmp(a: unknown, b: unknown, op: BinOp): boolean {
    if (op === 'eq') return a === b;
    if (op === 'ne') return a !== b;

    // 비교 연산은 number 또는 string으로 제한
    if (typeof a === 'number' && typeof b === 'number') {
        if (op === 'gt') return a > b;
        if (op === 'ge') return a >= b;
        if (op === 'lt') return a < b;
        if (op === 'le') return a <= b;
        return false;
    }
    if (typeof a === 'string' && typeof b === 'string') {
        if (op === 'gt') return a > b;
        if (op === 'ge') return a >= b;
        if (op === 'lt') return a < b;
        if (op === 'le') return a <= b;
        return false;
    }
    return false;
}

function evalExpr(e: Expr, scope: BindingScope): unknown {
    switch (e.k) {
        case 'literal': return e.v;
        case 'path': {
            const root = e.root === 'data' ? scope.data
                : e.root === 'node' ? scope.node
                    : scope.project;
            return getByPath(root, e.segs);
        }
        case 'unary': {
            if (e.op === 'not') return !evalBool(e.r, scope);
            return undefined;
        }
        case 'binary': {
            if (e.op === 'and') return evalBool(e.l, scope) && evalBool(e.r, scope);
            if (e.op === 'or') return evalBool(e.l, scope) || evalBool(e.r, scope);
            const l = evalExpr(e.l, scope);
            const r = evalExpr(e.r, scope);
            return cmp(l, r, e.op);
        }
    }
}

function evalBool(e: Expr, scope: BindingScope): boolean {
    const v = evalExpr(e, scope);
    return Boolean(v);
}

/** 외부 노출: 문자열 표현식을 안전하게 평가해 boolean 반환 */
export function evalWhenExpr(expr: string, scope: BindingScope): boolean {
    try {
        const ast = new Parser(expr).parse();
        return evalBool(ast, scope);
    } catch {
        // 파싱/평가 실패 시 안전하게 false
        return false;
    }
}