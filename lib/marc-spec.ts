import { apply, kright, kmid, alt_sc, alt, opt_sc, list_sc, rep_sc, tok, seq, Token, Parser, expectEOF, ParseError } from 'typescript-parsec';
import { AdvancedRegexpLexer, AdvancedRegexpLexerContext } from './advanced-regexp-lexer';

export enum TokenType {
    COMPARISON_STRING,
    INTEGER,
    ZERO,
    POSITIVE_DIGIT,
    POSITIVE_INTEGER,
    FIELD_TAG,
    HASH,
    RANGE_MARK,
    BEGIN_SUBSPEC,
    END_SUBSPEC,
    BEGIN_INDEX,
    END_INDEX,
    BEGIN_CHARACTER,
    SUBFIELD_MARKER,
    SUBFIELD_CHAR,
    SUBTERM_SEPARATOR,
    INDICATOR_MARKER,
    INDICATOR,
    BEGIN_COMPARISON,
    BINARY_OPERATOR,
    UNARY_OPERATOR
};

export type Position = number | '#';

export type Range = {
    start: Position,
    end: Position
};

export class CharacterSpec {
    constructor(public readonly item: Range | Position) {
    }
}

export class IndexSpec {
    constructor(public readonly item: Range | Position) {
    }
}

export class ItemSpec {
    constructor(
        public readonly tag: string | undefined,
        public readonly index: IndexSpec | undefined,
        public readonly subSpec: SubTermSet[][]
    ) {
    }
}

export class AbbrSpec {
    constructor(
        public readonly index: IndexSpec | undefined
    ) {
    }
}

type SubTermSet = BinarySubTermSet | UnarySubTermSet;

export class FieldSpec extends ItemSpec {
    constructor(
        tag: string,
        index: IndexSpec | undefined,
        public readonly characterSpec: CharacterSpec | undefined,
        subSpec: SubTermSet[][]
    ) {
        super(tag, index, subSpec);
    }
}

export class AbbrFieldSpec extends AbbrSpec {
    constructor(
        index: IndexSpec | undefined,
        public readonly characterSpec: CharacterSpec | undefined
    ) {
        super(index);
    }
}

export class SubfieldCode {
    constructor(
        public readonly start: string,
        public readonly end: string
    ) { }
}

export class SubfieldSpec extends ItemSpec {
    constructor(
        tag: string,
        index: IndexSpec | undefined,
        public readonly code: SubfieldCode,
        public readonly subindex: IndexSpec | undefined,
        public readonly characterSpec: CharacterSpec | undefined,
        subSpec: SubTermSet[][]
    ) {
        super(tag, index, subSpec);
    }
}

export class AbbrSubfieldSpec extends AbbrSpec {
    constructor(
        index: IndexSpec | undefined,
        public readonly code: SubfieldCode,
        public readonly subindex: IndexSpec | undefined,
        public readonly characterSpec: CharacterSpec | undefined
    ) {
        super(index);
    }
}

export class IndicatorSpec extends ItemSpec {
    constructor(
        tag: string,
        public readonly indicator: number,
        index: IndexSpec | undefined,
        subSpec: SubTermSet[][]
    ) {
        super(tag, index, subSpec);
    }
}

export class AbbrIndicatorSpec extends AbbrSpec {
    constructor(
        public readonly indicator: number,
        index: IndexSpec | undefined,
    ) {
        super(index);
    }
}

const unescapeSpaceRe: RegExp = /\\s/g;
const unescapeCompStringRe: RegExp = /\\([\$\{\}!=~\?\|\}\\])/g;
const escapeCompStringRe: RegExp = /([\$\{\}!=~\?\|\}\\])/g;

export class ComparisonString {

    public readonly theString: string;

    constructor(compString: string) {
        const s = compString.replace(unescapeSpaceRe, (_1, _2) => ' ');
        this.theString = s.replace(unescapeCompStringRe, (_, c) => c);
    }
}

type BinarySubTerm = FieldSpec | SubfieldSpec | IndicatorSpec | AbbrFieldSpec | AbbrSubfieldSpec | AbbrIndicatorSpec | ComparisonString;

type UnarySubTerm = FieldSpec | SubfieldSpec | IndicatorSpec | AbbrFieldSpec | AbbrSubfieldSpec | AbbrIndicatorSpec;

export enum BinaryOperator {
    EQUALS,
    NOT_EQUALS,
    INCLUDES,
    DOES_NOT_INCLUDE
};

const binOp: (op: string) => BinaryOperator = (op) => {
    if (op === '=') {
        return BinaryOperator.EQUALS;
    } else if (op === '!=') {
        return BinaryOperator.NOT_EQUALS;
    } else if (op === '~') {
        return BinaryOperator.INCLUDES;
    } else {
        return BinaryOperator.DOES_NOT_INCLUDE;
    }
};

const binOpString: (op: BinaryOperator) => '=' | '!=' | '~' | '!~' = (op) => {
    switch (op) {
        case BinaryOperator.EQUALS:
            return '=';
        case BinaryOperator.NOT_EQUALS:
            return '!=';
        case BinaryOperator.INCLUDES:
            return '~';
        case BinaryOperator.DOES_NOT_INCLUDE:
            return '!~';
    }
};

export enum UnaryOperator {
    EXISTS,
    DOES_NOT_EXIST
};

const unOp: (op: string | undefined) => UnaryOperator | undefined = (op) => {
    if (op === undefined) {
        return undefined;
    } else if (op === '?') {
        return UnaryOperator.EXISTS;
    } else {
        return UnaryOperator.DOES_NOT_EXIST;
    }
};

const unOpString: (op: UnaryOperator | undefined) => '' | '!' | '?' = (op) => {
    if (op === undefined) {
        return '';
    }
    switch (op) {
        case UnaryOperator.EXISTS:
            return '?';
        case UnaryOperator.DOES_NOT_EXIST:
            return '!';
    }
};

export class BinarySubTermSet {
    constructor(
        public readonly leftHand: BinarySubTerm | undefined,
        public readonly operator: BinaryOperator,
        public readonly rightHand: BinarySubTerm
    ) { }
}

export class UnarySubTermSet {
    constructor(
        public readonly operator: UnaryOperator,
        public readonly rightHand: UnarySubTerm
    ) { }
}

export class MARCSpec {
    constructor(
        public readonly spec: FieldSpec | SubfieldSpec | IndicatorSpec
    ) { }
};

export type Indicator = 1 | 2;

const _l: (regexp: string, tokentype: TokenType, keep: boolean) => (nextContext: Context) => [string, (character: string) => [TokenType, Context, boolean]] =
    (regexp: string, tokentype: TokenType, keep: boolean) => (nextContext: Context) => [regexp, (_) => [tokentype, nextContext, keep]];

const integer = _l('[0-9]+', TokenType.INTEGER, true);

const comparison_string = _l('(?:["#%-<>@-Z^-z]|\\\\[!-~])+', TokenType.COMPARISON_STRING, true);
const begin_comparison = _l('\\\\', TokenType.BEGIN_COMPARISON, true);
const positive_digit = _l('[1-9]', TokenType.POSITIVE_DIGIT, true);
const hash = _l('#', TokenType.HASH, true);
const zero = _l('0', TokenType.ZERO, true);
const range_mark = _l('-', TokenType.RANGE_MARK, true);
const begin_subspec = _l('\\{', TokenType.BEGIN_SUBSPEC, true);
const end_subspec = _l('\\}', TokenType.END_SUBSPEC, true);
const begin_index = _l('\\[', TokenType.BEGIN_INDEX, true);
const end_index = _l('\\]', TokenType.END_INDEX, true);
const binary_operator = _l('=|!=|~|!~', TokenType.BINARY_OPERATOR, true);
const unary_operator = _l('!|\\?', TokenType.UNARY_OPERATOR, true);
const field_tag = _l('[0-9\\.]{3}|[a-z\\.]{3}|[A-Z\\.]{3}', TokenType.FIELD_TAG, true);
const subfield = _l('\\$', TokenType.SUBFIELD_MARKER, true);
const subfield_char = _l('[!"#\\$%&\'\\(\\)\\*\\+,\\-\\./0-9:;<=>\\?\\[\\\\\\]\\^_`a-z\\{\\}~]', TokenType.SUBFIELD_CHAR, true);
const subterm_separator = _l('\\|', TokenType.SUBTERM_SEPARATOR, true);
const character_position = _l('/', TokenType.BEGIN_CHARACTER, true);
const indicator_marker = _l('\\^', TokenType.INDICATOR_MARKER, true);
const indicator = _l('1|2', TokenType.INDICATOR, true);

export enum Context {
    POSITION1,
    POSITION2,
    SUBFIELD,
    COMPARISON_STRING,
    INDICATOR,
    TOP
};

type ctx = [Context, AdvancedRegexpLexerContext<TokenType>];

const position1_context: ctx = [Context.POSITION1, new AdvancedRegexpLexerContext(
    [
        zero(Context.POSITION2),
        positive_digit(Context.POSITION2),
        binary_operator(Context.TOP),
        unary_operator(Context.TOP),
        begin_index(Context.TOP),
        end_index(Context.TOP),
        begin_subspec(Context.TOP),
        end_subspec(Context.TOP),
        hash(Context.POSITION2)
    ], 'failed-lexing-position-context', 'm')
];

const position2_context: ctx = [Context.POSITION2, new AdvancedRegexpLexerContext(
    [
        integer(Context.POSITION2),
        binary_operator(Context.TOP),
        unary_operator(Context.TOP),
        begin_index(Context.TOP),
        end_index(Context.TOP),
        begin_subspec(Context.TOP),
        end_subspec(Context.TOP),
        range_mark(Context.POSITION1)
    ], 'failed-lexing-position-context', 'm')
];

const subfield_context: ctx = [Context.SUBFIELD, new AdvancedRegexpLexerContext(
    [
        subfield_char(Context.TOP)
    ], 'failed-lexing-subfield-char', 'm')
];

const comparison_string_context: ctx = [Context.COMPARISON_STRING, new AdvancedRegexpLexerContext(
    [
        comparison_string(Context.TOP)
    ], 'failed-lexing-comparison-string', 'm')
];

const indicator_context: ctx = [Context.INDICATOR, new AdvancedRegexpLexerContext(
    [
        indicator(Context.TOP)
    ], 'failed-lexing-indicator', 'm')
];

const top_context: ctx = [Context.TOP, new AdvancedRegexpLexerContext(
    [
        field_tag(Context.TOP),
        indicator_marker(Context.INDICATOR),
        subfield(Context.SUBFIELD),
        range_mark(Context.SUBFIELD),
        character_position(Context.POSITION1),
        begin_index(Context.POSITION1),
        begin_subspec(Context.TOP),
        end_subspec(Context.TOP),
        binary_operator(Context.TOP),
        unary_operator(Context.TOP),
        subterm_separator(Context.TOP),
        begin_comparison(Context.COMPARISON_STRING)
    ], 'failed-lexing-top-context', 'm')
];

export const newMarcSpecLexer = () => new AdvancedRegexpLexer<TokenType>([
    top_context, subfield_context, position1_context, position2_context, comparison_string_context, indicator_context
]);

export const positiveInteger: Parser<TokenType, number> = alt_sc(apply(tok(TokenType.ZERO), (_) => 0),
    apply(seq(tok(TokenType.POSITIVE_DIGIT), opt_sc(tok(TokenType.INTEGER))),
        ([d, ds]: [Token<TokenType>, Token<TokenType> | undefined]) => +(d.text + (ds !== undefined ? ds.text : ''))));

export const position: Parser<TokenType, Position> = alt_sc(positiveInteger, apply(tok(TokenType.HASH), (_) => '#'));

export const rangeOrPosition: Parser<TokenType, Range | Position> = apply(seq(position, opt_sc(kright(tok(TokenType.RANGE_MARK), position))), ([start, end]) => end !== undefined ? { start, end } : start);

export const characterSpec: Parser<TokenType, CharacterSpec> = apply(kright(tok(TokenType.BEGIN_CHARACTER), rangeOrPosition), (item) => new CharacterSpec(item));

export const index: Parser<TokenType, IndexSpec> = apply(kmid(tok(TokenType.BEGIN_INDEX), rangeOrPosition, tok(TokenType.END_INDEX)), (item) => new IndexSpec(item));

export const indicatorSpec: Parser<TokenType, (tag: string, index: IndexSpec | undefined, subSpec: SubTermSet[][]) => IndicatorSpec> = apply(kright(tok(TokenType.INDICATOR_MARKER), tok(TokenType.INDICATOR)),
    (indicator) => {
        const ind = indicator.text === '1' ? 1 : 2;
        return (tag, index, subSpec) => new IndicatorSpec(tag, ind, index, subSpec);
    });

export const abbrIndicatorSpec: Parser<TokenType, (index: IndexSpec | undefined) => AbbrIndicatorSpec> = apply(kright(tok(TokenType.INDICATOR_MARKER), tok(TokenType.INDICATOR)),
    (indicator) => {
        const ind = indicator.text === '1' ? 1 : 2;
        return (index: IndexSpec | undefined) => new AbbrIndicatorSpec(ind, index);
    });

export const fieldSpec: Parser<TokenType, (tag: string, index: IndexSpec | undefined, subSpec: SubTermSet[][]) => FieldSpec> = apply(opt_sc(characterSpec),
    (cspec) => (tag, index, subSpec) => new FieldSpec(tag, index, cspec, subSpec));

export const abbrFieldSpec: Parser<TokenType, (index: IndexSpec | undefined) => AbbrFieldSpec> = apply(opt_sc(characterSpec),
    (cspec) => (index) => new AbbrFieldSpec(index, cspec));

export const subfieldCode: Parser<TokenType, SubfieldCode> = apply(seq(tok(TokenType.SUBFIELD_MARKER), tok(TokenType.SUBFIELD_CHAR), opt_sc(seq(tok(TokenType.RANGE_MARK), tok(TokenType.SUBFIELD_CHAR)))),
    ([_1, start, mend]) => new SubfieldCode(start.text, mend === undefined ? start.text : mend[1].text));

export const abbrSubfieldSpec: Parser<TokenType, (index: IndexSpec | undefined) => AbbrSubfieldSpec> = apply(seq(subfieldCode, opt_sc(index), opt_sc(characterSpec)),
    ([code, ispec, cspec]) => (index) => new AbbrSubfieldSpec(index, code, ispec, cspec));

export const subfieldSpec: Parser<TokenType, (tag: string, index: IndexSpec | undefined, subSpec: SubTermSet[][]) => SubfieldSpec> =
    apply(seq(subfieldCode, opt_sc(index), opt_sc(characterSpec)),
        ([code, ispec, cspec]) => (tag, index, subSpec) => new SubfieldSpec(tag, index, code, ispec, cspec, subSpec));

export const abbreviation: Parser<TokenType, AbbrSubfieldSpec | AbbrFieldSpec | AbbrIndicatorSpec> = apply(seq(opt_sc(index), alt_sc(abbrSubfieldSpec, abbrIndicatorSpec, abbrFieldSpec)),
    ([index, alt1]) => alt1(index));

const specStart: Parser<TokenType, [string, IndexSpec | undefined]> = apply(seq(tok(TokenType.FIELD_TAG), opt_sc(index)), ([token, index]) => [token.text, index]);

export const fullSpec: Parser<TokenType, (subSpec: SubTermSet[][]) => SubfieldSpec | FieldSpec | IndicatorSpec> = apply(seq(specStart, alt_sc(subfieldSpec, indicatorSpec, fieldSpec)),
    ([[tag, index], alt1]) => (subSpec) => alt1(tag, index, subSpec));

export const comparisonString: Parser<TokenType, ComparisonString> = apply(kright(tok(TokenType.BEGIN_COMPARISON), tok(TokenType.COMPARISON_STRING)),
    (token) => new ComparisonString(token.text));

export const unarySubTerm: Parser<TokenType, UnarySubTerm> = apply(alt_sc(fullSpec, abbreviation),
    (alt1) => typeof alt1 === 'function' ? alt1([]) : alt1);

export const binarySubTerm: Parser<TokenType, BinarySubTerm> = apply(alt_sc(fullSpec, comparisonString, abbreviation),
    (alt1) => typeof alt1 === 'function' ? alt1([]) : alt1);

export const subTermSet: Parser<TokenType, (outerSpec: BinarySubTerm) => SubTermSet> =
    alt(
        apply(seq(tok(TokenType.UNARY_OPERATOR), unarySubTerm), ([op, rhs]) => (_) => new UnarySubTermSet(unOp(op.text), rhs)),
        apply(seq(tok(TokenType.BINARY_OPERATOR), binarySubTerm), ([op, rhs]) => (lhs) => new BinarySubTermSet(lhs, binOp(op.text), rhs)),
        apply(seq(unarySubTerm, opt_sc(seq(tok(TokenType.BINARY_OPERATOR), binarySubTerm))), ([mlhs, alt]) => (_) => alt === undefined ? new UnarySubTermSet(undefined, mlhs) : new BinarySubTermSet(mlhs, binOp(alt[0].text), alt[1])),
        apply(seq(comparisonString, tok(TokenType.BINARY_OPERATOR), binarySubTerm), ([lhs, op, rhs]) => (_) => new BinarySubTermSet(lhs, binOp(op.text), rhs)));

export const subOrSpec: Parser<TokenType, ((outerSpec: BinarySubTerm) => SubTermSet)[]> =
    apply(opt_sc(
        kmid(tok(TokenType.BEGIN_SUBSPEC), list_sc(subTermSet, tok(TokenType.SUBTERM_SEPARATOR)), tok(TokenType.END_SUBSPEC))
    ), (mspec) => (mspec === undefined ? [] : mspec));

export const subAndSpec: Parser<TokenType, ((outerSpec: BinarySubTerm) => SubTermSet)[][]> = rep_sc(subOrSpec);

export const marcSpec: Parser<TokenType, MARCSpec> = apply(seq(fullSpec, subAndSpec), ([fullSpec, subSpec]) => new MARCSpec(fullSpec(subSpec.map((s) => s.map((s0) => s0(fullSpec([])))))));

export const parseMarcSpec: (input: string) => ParseError | MARCSpec = (input: string) => {
    try {
        const result = expectEOF(marcSpec.parse(newMarcSpecLexer().parse(input)));

        if (result.successful) {
            return result.candidates[0].result;
        }
        return result.error;
    } catch (e) {
        if (typeof e === 'object') {
            if (typeof e.kind === 'string' && e.kind === 'Error' && typeof e.message === 'string') {
                return e;
            }
            if (typeof e.pos === 'object' && typeof e.errorMessage === 'string') {
                return { kind: 'Error', pos: e.pos, message: e.errorMessage };
            }
        }
    }
    return { kind: 'Error', message: 'unknown-error' };
};

export const serializeMarcSpec: (marcSpec: MARCSpec) => string = (marcSpec: MARCSpec) => {
    const { spec } = marcSpec;

    if (spec instanceof FieldSpec) {
        return serializeFieldSpec(spec);
    }

    if (spec instanceof IndicatorSpec) {
        return serializeIndicatorSpec(spec);
    }

    return serializeSubfieldSpec(spec);
};


export const serializeFieldSpec: (fieldSpec: FieldSpec) => string = (fieldSpec) => {
    const { tag, index, characterSpec, subSpec } = fieldSpec;
    return tag + serializeIndex(index) + serializeCharacterSpec(characterSpec) + serializeSubSpec(subSpec);
};

export const serializeAbbrFieldSpec: (fieldSpec: AbbrFieldSpec) => string = (fieldSpec) => {
    const { index, characterSpec } = fieldSpec;
    return serializeIndex(index) + serializeCharacterSpec(characterSpec);
};

export const serializeIndicatorSpec: (indicatorSpec: IndicatorSpec) => string = (indicatorSpec) => {
    const { tag, indicator, index, subSpec } = indicatorSpec;
    return tag + serializeIndex(index) + '^' + indicator + serializeSubSpec(subSpec);
};

export const serializeAbbrIndicatorSpec: (indicatorSpec: AbbrIndicatorSpec) => string = (indicatorSpec) => {
    const { indicator, index } = indicatorSpec;
    return serializeIndex(index) + '^' + indicator;
};

export const serializeSubfieldSpec: (subfieldSpec: SubfieldSpec) => string = (subfieldSpec) => {
    const { tag, index, code, subindex, characterSpec, subSpec } = subfieldSpec;
    return tag + serializeIndex(index) + serializeCode(code) + serializeIndex(subindex) + serializeCharacterSpec(characterSpec) + serializeSubSpec(subSpec);
};

export const serializeAbbrSubfieldSpec: (subfieldSpec: AbbrSubfieldSpec) => string = (subfieldSpec) => {
    const { index, code, subindex, characterSpec } = subfieldSpec;
    return serializeIndex(index) + serializeCode(code) + serializeIndex(subindex) + serializeCharacterSpec(characterSpec);
};

export const serializeIndex: (index: IndexSpec | undefined) => string = (index) => {
    if (index === undefined) {
        return '';
    }
    const { item } = index;
    if (typeof item === "object") {
        const { start, end } = item;
        return `[${start}-${end}]`;
    }
    return `[${item}]`;
};

export const serializeCharacterSpec: (charSpec: CharacterSpec | undefined) => string = (charSpec) => {
    if (charSpec === undefined) {
        return '';
    }
    const { item } = charSpec;
    if (typeof item === "object") {
        const { start, end } = item;
        return `/${start}-${end}`;
    }
    return `/${item}`;
};

export const serializeCode: (code: SubfieldCode) => string = (code) => {
    const { start, end } = code;
    if (start === end) {
        return '$' + start;
    }
    return `\$${start}-${end}`;
};

export const serializeSubSpec: (subSpec: SubTermSet[][]) => string = (subSpec) => {
    if (subSpec.length === 0) {
        return '';
    }
    return subSpec.reduce((s0, s) => s0 + '{' + s.map((t) => serializeTermSet(t)).join('|') + '}', '');
};

export const serializeTermSet: (termSet: SubTermSet) => string = (termSet) => {
    if (termSet instanceof UnarySubTermSet) {
        return serializeUnarySubTermSet(termSet);
    } else {
        return serializeBinarySubTermSet(termSet);
    }
};

export const serializeBinarySubTermSet: (termSet: BinarySubTermSet) => string = (termSet) => {
    const { leftHand, operator, rightHand } = termSet;
    return serializeTerm(leftHand) + binOpString(operator) + serializeTerm(rightHand);
};

export const serializeUnarySubTermSet: (termSet: UnarySubTermSet) => string = (termSet) => {
    const { operator, rightHand } = termSet;
    return unOpString(operator) + serializeTerm(rightHand);
};

export const serializeTerm: (term: BinarySubTerm) => string = (term) => {
    if (term instanceof FieldSpec) {
        return serializeFieldSpec(term);
    }
    if (term instanceof SubfieldSpec) {
        return serializeSubfieldSpec(term);
    }
    if (term instanceof IndicatorSpec) {
        return serializeIndicatorSpec(term);
    }
    if (term instanceof AbbrFieldSpec) {
        return serializeAbbrFieldSpec(term);
    }
    if (term instanceof AbbrIndicatorSpec) {
        return serializeAbbrIndicatorSpec(term);
    }
    if (term instanceof AbbrSubfieldSpec) {
        return serializeAbbrSubfieldSpec(term);
    }
    const { theString } = term;
    const s0 = theString.replace(escapeCompStringRe, '\\$&');
    const s1 = s0.replace(/ /g, '\\s');
    return '\\' + s1;
};
