import { apply, kright, kmid, alt_sc, opt_sc, list_sc, tok, seq, Token, Parser, expectEOF, ParseError } from 'typescript-parsec';
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
    OPERATOR
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

export class FieldSpec {
    constructor(
        public readonly tag: string,
        public readonly index: IndexSpec | undefined,
        public readonly characterSpec: CharacterSpec | undefined,
        public readonly subSpec: SubTermSet[]
    ) { }
}

export class SubfieldCode {
    constructor(
        public readonly start: string,
        public readonly end: string
    ) { }
}

export class SubfieldSpec {
    constructor(
        public readonly tag: string,
        public readonly index: IndexSpec | undefined,
        public readonly code: SubfieldCode,
        public readonly subindex: IndexSpec | undefined,
        public readonly characterSpec: CharacterSpec | undefined,
        public readonly subSpec: SubTermSet[]
    ) { }
}

export class IndicatorSpec {
    constructor(
        public readonly tag: string,
        public readonly indicator: number,
        public readonly index: IndexSpec | undefined,
        public readonly subSpec: SubTermSet[]
    ) { }
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

type SubTerm = FieldSpec | SubfieldSpec | IndicatorSpec | ComparisonString;

type SubTermPart = (tag: string) => SubTerm;

export class SubTermSet {
    constructor(
        public readonly leftHand: SubTerm | undefined,
        public readonly operatorStr: string,
        public readonly rightHand: SubTerm
    ) { }
}


const fieldSpecGenerator: (cspec: CharacterSpec | undefined) => (tag: string, index: IndexSpec, subSpec: SubTermSet[]) => FieldSpec = (cspec) =>
    (tag: string, index: IndexSpec, subSpec: SubTermSet[]) => new FieldSpec(tag.toUpperCase(), index, cspec, subSpec);

const subfieldSpecGenerator: (code: SubfieldCode, ispec: IndexSpec | undefined, cspec: CharacterSpec | undefined) => (tag: string, index: IndexSpec | undefined, subSpec: SubTermSet[]) => SubfieldSpec = (code, ispec, cspec) =>
    (tag: string, index: IndexSpec | undefined, subSpec: SubTermSet[]) => new SubfieldSpec(tag.toUpperCase(), index, code, ispec, cspec, subSpec);

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
const operator = _l('=|!=|~|!~|!|\\?', TokenType.OPERATOR, true);
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
        operator(Context.TOP),
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
        operator(Context.TOP),
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
        operator(Context.TOP),
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

export const abrIndicatorSpec: Parser<TokenType, (tag: string, index: IndexSpec | undefined, subSpec: SubTermSet[]) => IndicatorSpec> = apply(kright(tok(TokenType.INDICATOR_MARKER), tok(TokenType.INDICATOR)),
    (indicator) => {
        const ind = indicator.text === '1' ? 1 : 2;
        return (tag: string, index: IndexSpec | undefined, subSpec: SubTermSet[]) => new IndicatorSpec(tag, ind, index, subSpec);
    });

export const optFieldSpecParam: Parser<TokenType, (tag: string, index: IndexSpec | undefined, subSpec: SubTermSet[]) => FieldSpec> = apply(opt_sc(characterSpec),
    (cspec) => fieldSpecGenerator(cspec));

export const subfieldCode: Parser<TokenType, SubfieldCode> = apply(seq(tok(TokenType.SUBFIELD_MARKER), tok(TokenType.SUBFIELD_CHAR), opt_sc(seq(tok(TokenType.RANGE_MARK), tok(TokenType.SUBFIELD_CHAR)))),
    ([_1, start, mend]) => new SubfieldCode(start.text, mend === undefined ? start.text : mend[1].text));

export const abbrSubfieldSpec: Parser<TokenType, (tag: string, index: IndexSpec | undefined, subSpec: SubTermSet[]) => SubfieldSpec> = apply(seq(subfieldCode, opt_sc(index), opt_sc(characterSpec)),
    ([code, ispec, cspec]) => subfieldSpecGenerator(code, ispec, cspec));

export const abbreviation: Parser<TokenType, (tag: string) => SubfieldSpec | FieldSpec | IndicatorSpec> = apply(alt_sc(abbrSubfieldSpec, alt_sc(seq(index, alt_sc(optFieldSpecParam, abrIndicatorSpec)), abrIndicatorSpec, characterSpec)),
    (alt1) => {
        if (typeof alt1 === 'function') {
            return (tag) => alt1(tag, undefined, []);
        } else if (Array.isArray(alt1)) {
            const [index, alt2] = alt1;
            return (tag) => alt2(tag, index, []);
        } else {
            return (tag) => new FieldSpec(tag, undefined, alt1, []);
        }
    });

export const comparisonString: Parser<TokenType, ComparisonString> = apply(kright(tok(TokenType.BEGIN_COMPARISON), tok(TokenType.COMPARISON_STRING)),
    (token) => new ComparisonString(token.text));

export const partFieldOrSubfieldOrIndicatorSpec: Parser<TokenType, (sub: (tag: string) => SubTermSet[]) => FieldSpec | SubfieldSpec | IndicatorSpec> = apply(seq(tok(TokenType.FIELD_TAG), opt_sc(index), alt_sc(abbrSubfieldSpec, abrIndicatorSpec, optFieldSpecParam)),
    ([token, ispec, alt]) => (sub: (tag: string) => SubTermSet[]) => alt(token.text, ispec, sub(token.text)));

export const subtermFieldOrSubfieldOrIndicatorSpec: Parser<TokenType, FieldSpec | SubfieldSpec | IndicatorSpec> = apply(partFieldOrSubfieldOrIndicatorSpec, (partSubSpec) => (partSubSpec((_) => [])));

export const subTerm: Parser<TokenType, SubTermPart> = apply(alt_sc(subtermFieldOrSubfieldOrIndicatorSpec, comparisonString, abbreviation),
    (alt: FieldSpec | SubfieldSpec | IndicatorSpec | ComparisonString | ((tag: string) => FieldSpec | SubfieldSpec | IndicatorSpec)) => {
        if (alt instanceof FieldSpec || alt instanceof SubfieldSpec || alt instanceof IndicatorSpec || alt instanceof ComparisonString) {
            return (_) => alt;
        }
        return alt;
    });

const _getSubTermSet: (alt: [SubTermPart, [Token<TokenType.OPERATOR>, SubTermPart] | undefined] | [Token<TokenType.OPERATOR>, SubTermPart]) => (tag: string) => SubTermSet = (alt) => {
    if (typeof alt[0] === 'function' && (alt[1] === undefined || Array.isArray(alt[1]))) {
        const st: SubTermPart = alt[0];
        if (alt[1] === undefined) {
            return (tag: string) => new SubTermSet(undefined, undefined, st(tag));
        } else if (Array.isArray(alt[1])) {
            const [op, str] = alt[1];
            return (tag: string) => new SubTermSet(st(tag), op.text, str(tag));
        }
    } else if (typeof alt[0] === 'object' && typeof alt[1] === 'function') {
        const [op, str] = alt;
        return (tag: string) => new SubTermSet(undefined, op.text, str(tag));
    }
};

export const subTermSet: Parser<TokenType, (tag: string) => SubTermSet> = apply(alt_sc(seq(subTerm, opt_sc(seq(tok(TokenType.OPERATOR), subTerm))), seq(tok(TokenType.OPERATOR), subTerm)),
    _getSubTermSet
);

export const subSpec: Parser<TokenType, (tag: string) => SubTermSet[]> =
    apply(opt_sc(
        kmid(tok(TokenType.BEGIN_SUBSPEC), apply(list_sc(subTermSet, tok(TokenType.SUBTERM_SEPARATOR)), (s) => (tag: string) => s.map((st) => st(tag))), tok(TokenType.END_SUBSPEC))
    ), (mspec: undefined | ((tag: string) => SubTermSet[])) => (mspec === undefined ? (_) => [] : mspec));

export class MARCSpec {
    constructor(
        public readonly spec: FieldSpec | SubfieldSpec | IndicatorSpec
    ) { }
};

export const marcSpec: Parser<TokenType, MARCSpec> = apply(seq(partFieldOrSubfieldOrIndicatorSpec, subSpec), ([specPart, subSpec]) => new MARCSpec(specPart(subSpec)));

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
        return serializeFieldSpec(spec, null);
    }

    if (spec instanceof IndicatorSpec) {
        return serializeIndicatorSpec(spec, null);
    }

    return serializeSubfieldSpec(spec, null);
};


export const serializeFieldSpec: (fieldSpec: FieldSpec, abrTag: string | null) => string = (fieldSpec, abrTag) => {
    const { tag, index, characterSpec, subSpec } = fieldSpec;
    return (tag === abrTag ? '' : tag) + serializeIndex(index) + serializeCharacterSpec(characterSpec) + serializeSubSpec(subSpec, tag);
};

export const serializeIndicatorSpec: (indicatorSpec: IndicatorSpec, abrTag: string | null) => string = (indicatorSpec, abrTag) => {
    const { tag, indicator, index, subSpec } = indicatorSpec;
    return (tag === abrTag ? '' : tag) + serializeIndex(index) + '^' + indicator + serializeSubSpec(subSpec, tag);
};

export const serializeSubfieldSpec: (subfieldSpec: SubfieldSpec, abrTag: string) => string = (subfieldSpec, abrTag) => {
    const { tag, index, code, subindex, characterSpec, subSpec } = subfieldSpec;
    return (tag === abrTag ? '' : tag) + serializeIndex(index) + serializeCode(code) + serializeIndex(subindex) + serializeCharacterSpec(characterSpec) + serializeSubSpec(subSpec, tag);
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

export const serializeSubSpec: (subSpec: SubTermSet[], abrTag: string | null) => string = (subSpec, abrTag) => {
    if (subSpec.length === 0) {
        return '';
    }
    return '{' + subSpec.map((t) => serializeTermSet(t, abrTag)).join('|') + '}';
};

export const serializeTermSet: (termSet: SubTermSet, abrTag: string | null) => string = (termSet, abrTag) => {
    const { leftHand, operatorStr, rightHand } = termSet;
    return serializeTerm(leftHand, abrTag) + operatorStr + serializeTerm(rightHand, abrTag);
};

export const serializeTerm: (term: SubTerm, abrTag: string | null) => string = (term, abrTag) => {
    if (term instanceof FieldSpec) {
        return serializeFieldSpec(term, abrTag);
    }
    if (term instanceof SubfieldSpec) {
        return serializeSubfieldSpec(term, abrTag);
    }
    if (term instanceof IndicatorSpec) {
        return serializeIndicatorSpec(term, abrTag);
    }
    const { theString } = term;
    const s0 = theString.replace(escapeCompStringRe, '\\$&');
    const s1 = s0.replace(/ /g, '\\s');
    return '\\' + s1;
};
