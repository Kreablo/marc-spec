import { apply, kright, kmid, alt_sc, alt, opt_sc, list_sc, rep_sc, tok, seq, expectEOF } from 'typescript-parsec';
import { KLexer, KLexerContext } from '@kreablo/k-lexer';
export var TokenType;
(function (TokenType) {
    TokenType[TokenType["COMPARISON_STRING"] = 0] = "COMPARISON_STRING";
    TokenType[TokenType["COMPARISON_STRING_SINGLE_QUOTED"] = 1] = "COMPARISON_STRING_SINGLE_QUOTED";
    TokenType[TokenType["COMPARISON_STRING_DOUBLE_QUOTED"] = 2] = "COMPARISON_STRING_DOUBLE_QUOTED";
    TokenType[TokenType["INTEGER"] = 3] = "INTEGER";
    TokenType[TokenType["ZERO"] = 4] = "ZERO";
    TokenType[TokenType["POSITIVE_DIGIT"] = 5] = "POSITIVE_DIGIT";
    TokenType[TokenType["POSITIVE_INTEGER"] = 6] = "POSITIVE_INTEGER";
    TokenType[TokenType["FIELD_TAG"] = 7] = "FIELD_TAG";
    TokenType[TokenType["HASH"] = 8] = "HASH";
    TokenType[TokenType["RANGE_MARK"] = 9] = "RANGE_MARK";
    TokenType[TokenType["BEGIN_SUBSPEC"] = 10] = "BEGIN_SUBSPEC";
    TokenType[TokenType["END_SUBSPEC"] = 11] = "END_SUBSPEC";
    TokenType[TokenType["BEGIN_INDEX"] = 12] = "BEGIN_INDEX";
    TokenType[TokenType["END_INDEX"] = 13] = "END_INDEX";
    TokenType[TokenType["BEGIN_CHARACTER"] = 14] = "BEGIN_CHARACTER";
    TokenType[TokenType["SUBFIELD_MARKER"] = 15] = "SUBFIELD_MARKER";
    TokenType[TokenType["SUBFIELD_CHAR"] = 16] = "SUBFIELD_CHAR";
    TokenType[TokenType["SUBTERM_SEPARATOR"] = 17] = "SUBTERM_SEPARATOR";
    TokenType[TokenType["INDICATOR_MARKER"] = 18] = "INDICATOR_MARKER";
    TokenType[TokenType["INDICATOR"] = 19] = "INDICATOR";
    TokenType[TokenType["BEGIN_COMPARISON"] = 20] = "BEGIN_COMPARISON";
    TokenType[TokenType["BINARY_OPERATOR"] = 21] = "BINARY_OPERATOR";
    TokenType[TokenType["UNARY_OPERATOR"] = 22] = "UNARY_OPERATOR";
})(TokenType || (TokenType = {}));
;
export class CharacterSpec {
    constructor(item) {
        this.item = item;
    }
}
export class IndexSpec {
    constructor(item) {
        this.item = item;
    }
}
export class ItemSpec {
    constructor(tag, index, subSpec) {
        this.tag = tag;
        this.index = index;
        this.subSpec = subSpec;
    }
}
export class AbbrSpec {
    constructor(index) {
        this.index = index;
    }
}
export class FieldSpec extends ItemSpec {
    constructor(tag, index, characterSpec, subSpec) {
        super(tag, index, subSpec);
        this.characterSpec = characterSpec;
    }
}
export class AbbrFieldSpec extends AbbrSpec {
    constructor(index, characterSpec) {
        super(index);
        this.characterSpec = characterSpec;
    }
}
export class SubfieldCode {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
}
export class SubfieldSpec extends ItemSpec {
    constructor(tag, index, codes, subindex, characterSpec, subSpec) {
        super(tag, index, subSpec);
        this.codes = codes;
        this.subindex = subindex;
        this.characterSpec = characterSpec;
    }
}
export class AbbrSubfieldSpec extends AbbrSpec {
    constructor(index, codes, subindex, characterSpec) {
        super(index);
        this.codes = codes;
        this.subindex = subindex;
        this.characterSpec = characterSpec;
    }
}
export class IndicatorSpec extends ItemSpec {
    constructor(tag, indicator, index, subSpec) {
        super(tag, index, subSpec);
        this.indicator = indicator;
    }
}
export class AbbrIndicatorSpec extends AbbrSpec {
    constructor(indicator, index) {
        super(index);
        this.indicator = indicator;
    }
}
const toAbbr = (spec) => {
    if (spec instanceof FieldSpec) {
        const { index, characterSpec } = spec;
        return new AbbrFieldSpec(index, characterSpec);
    }
    if (spec instanceof SubfieldSpec) {
        const { index, codes, subindex, characterSpec } = spec;
        return new AbbrSubfieldSpec(index, codes, subindex, characterSpec);
    }
    const { index, indicator } = spec;
    return new AbbrIndicatorSpec(indicator, index);
};
const unescapeSpaceRe = /\\s/g;
const unescapeCompStringRe = /\\([\$\{\}!=~\?\|\}\\])/g;
const unescapeSingleQuoteCompStringRe = /\\(['\\])/g;
const unescapeDoubleQuoteCompStringRe = /\\(["\\])/g;
const escapeCompStringRe = /([\$\{\}!=~\?\|\}\\])/g;
const escapeSingleQuoteCompStringRe = /(['\\])/g;
const escapeDoubleQuoteCompStringRe = /(["\\])/g;
export class ComparisonString {
    constructor(compString, syntaxType) {
        if (syntaxType === "'") {
            const s = compString.substring(1, compString.length - 1);
            this.theString = s.replace(unescapeSingleQuoteCompStringRe, (_, c) => c);
        }
        else if (syntaxType === '"') {
            const s = compString.substring(1, compString.length - 1);
            this.theString = s.replace(unescapeDoubleQuoteCompStringRe, (_, c) => c);
        }
        else {
            const s = compString.replace(unescapeSpaceRe, (_1, _2) => ' ');
            this.theString = s.replace(unescapeCompStringRe, (_, c) => c);
        }
        this.syntaxType = syntaxType;
    }
}
export var BinaryOperator;
(function (BinaryOperator) {
    BinaryOperator[BinaryOperator["EQUALS"] = 0] = "EQUALS";
    BinaryOperator[BinaryOperator["NOT_EQUALS"] = 1] = "NOT_EQUALS";
    BinaryOperator[BinaryOperator["INCLUDES"] = 2] = "INCLUDES";
    BinaryOperator[BinaryOperator["DOES_NOT_INCLUDE"] = 3] = "DOES_NOT_INCLUDE";
})(BinaryOperator || (BinaryOperator = {}));
;
const binOp = (op) => {
    if (op === '=') {
        return BinaryOperator.EQUALS;
    }
    else if (op === '!=') {
        return BinaryOperator.NOT_EQUALS;
    }
    else if (op === '~') {
        return BinaryOperator.INCLUDES;
    }
    else {
        return BinaryOperator.DOES_NOT_INCLUDE;
    }
};
const binOpString = (op) => {
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
export var UnaryOperator;
(function (UnaryOperator) {
    UnaryOperator[UnaryOperator["EXISTS"] = 0] = "EXISTS";
    UnaryOperator[UnaryOperator["DOES_NOT_EXIST"] = 1] = "DOES_NOT_EXIST";
})(UnaryOperator || (UnaryOperator = {}));
;
const unOp = (op) => {
    if (op === undefined) {
        return undefined;
    }
    else if (op === '?') {
        return UnaryOperator.EXISTS;
    }
    else {
        return UnaryOperator.DOES_NOT_EXIST;
    }
};
const unOpString = (op) => {
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
    constructor(leftHand, operator, rightHand) {
        this.leftHand = leftHand;
        this.operator = operator;
        this.rightHand = rightHand;
    }
}
export class UnarySubTermSet {
    constructor(operator, rightHand) {
        this.operator = operator;
        this.rightHand = rightHand;
    }
}
export class MARCSpec {
    constructor(spec) {
        this.spec = spec;
    }
}
;
const _l = (regexp, tokentype, keep) => (nextContext) => [regexp, (_) => [tokentype, nextContext, keep]];
const integer = _l('[0-9]+', TokenType.INTEGER, true);
const comparison_string = _l('(?:["#%-<>@-Z^-z]|[^\\u0000-\\u007F]|\\\\[!-~\\|=])+', TokenType.COMPARISON_STRING, true);
const comparison_string_single_quote = _l("'(?:[^'\\\\]|\\\\[\\\\'])*'", TokenType.COMPARISON_STRING_SINGLE_QUOTED, true);
const comparison_string_double_quote = _l('"(?:[^\\\\"]|\\\\[\\\\"])*"', TokenType.COMPARISON_STRING_DOUBLE_QUOTED, true);
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
export var Context;
(function (Context) {
    Context[Context["POSITION1"] = 0] = "POSITION1";
    Context[Context["POSITION2"] = 1] = "POSITION2";
    Context[Context["SUBFIELD"] = 2] = "SUBFIELD";
    Context[Context["COMPARISON_STRING"] = 3] = "COMPARISON_STRING";
    Context[Context["INDICATOR"] = 4] = "INDICATOR";
    Context[Context["TOP"] = 5] = "TOP";
})(Context || (Context = {}));
;
const position1_context = [Context.POSITION1, new KLexerContext([
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
const position2_context = [Context.POSITION2, new KLexerContext([
        integer(Context.POSITION2),
        binary_operator(Context.TOP),
        unary_operator(Context.TOP),
        begin_index(Context.TOP),
        end_index(Context.TOP),
        begin_subspec(Context.TOP),
        end_subspec(Context.TOP),
        range_mark(Context.POSITION1),
        subterm_separator(Context.TOP),
    ], 'failed-lexing-position-context', 'm')
];
const subfield_context = [Context.SUBFIELD, new KLexerContext([
        subfield_char(Context.TOP)
    ], 'failed-lexing-subfield-char', 'm')
];
const comparison_string_context = [Context.COMPARISON_STRING, new KLexerContext([
        comparison_string(Context.TOP)
    ], 'failed-lexing-comparison-string', 'm')
];
const indicator_context = [Context.INDICATOR, new KLexerContext([
        indicator(Context.TOP)
    ], 'failed-lexing-indicator', 'm')
];
const top_context = [Context.TOP, new KLexerContext([
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
        begin_comparison(Context.COMPARISON_STRING),
        comparison_string_single_quote(Context.TOP),
        comparison_string_double_quote(Context.TOP)
    ], 'failed-lexing-top-context', 'm')
];
export const newMarcSpecLexer = () => new KLexer([
    top_context, subfield_context, position1_context, position2_context, comparison_string_context, indicator_context
]);
export const positiveInteger = alt_sc(apply(tok(TokenType.ZERO), (_) => 0), apply(seq(tok(TokenType.POSITIVE_DIGIT), opt_sc(tok(TokenType.INTEGER))), ([d, ds]) => +(d.text + (ds !== undefined ? ds.text : ''))));
export const position = alt_sc(positiveInteger, apply(tok(TokenType.HASH), (_) => '#'));
export const rangeOrPosition = apply(seq(position, opt_sc(kright(tok(TokenType.RANGE_MARK), position))), ([start, end]) => end !== undefined ? { start, end } : start);
export const characterSpec = apply(kright(tok(TokenType.BEGIN_CHARACTER), rangeOrPosition), (item) => new CharacterSpec(item));
export const index = apply(kmid(tok(TokenType.BEGIN_INDEX), rangeOrPosition, tok(TokenType.END_INDEX)), (item) => new IndexSpec(item));
export const indicatorSpec = apply(kright(tok(TokenType.INDICATOR_MARKER), tok(TokenType.INDICATOR)), (indicator) => {
    const ind = indicator.text === '1' ? 1 : 2;
    return (tag, index, subSpec) => new IndicatorSpec(tag, ind, index, subSpec);
});
export const abbrIndicatorSpec = apply(kright(tok(TokenType.INDICATOR_MARKER), tok(TokenType.INDICATOR)), (indicator) => {
    const ind = indicator.text === '1' ? 1 : 2;
    return (index) => new AbbrIndicatorSpec(ind, index);
});
export const fieldSpec = apply(opt_sc(characterSpec), (cspec) => (tag, index, subSpec) => new FieldSpec(tag, index, cspec, subSpec));
export const abbrFieldSpec = apply(opt_sc(characterSpec), (cspec) => (index) => new AbbrFieldSpec(index, cspec));
export const subfieldCode = apply(seq(tok(TokenType.SUBFIELD_MARKER), tok(TokenType.SUBFIELD_CHAR), opt_sc(seq(tok(TokenType.RANGE_MARK), tok(TokenType.SUBFIELD_CHAR)))), ([_1, start, mend]) => new SubfieldCode(start.text, mend === undefined ? start.text : mend[1].text));
export const abbrSubfieldSpec = apply(seq(subfieldCode, rep_sc(subfieldCode), opt_sc(index), opt_sc(characterSpec)), ([code, codes, ispec, cspec]) => (index) => new AbbrSubfieldSpec(index, [code].concat(codes), ispec, cspec));
export const subfieldSpec = apply(seq(subfieldCode, rep_sc(subfieldCode), opt_sc(index), opt_sc(characterSpec)), ([code, codes, ispec, cspec]) => (tag, index, subSpec) => new SubfieldSpec(tag, index, [code].concat(codes), ispec, cspec, subSpec));
export const abbreviation = apply(seq(opt_sc(index), alt_sc(abbrSubfieldSpec, abbrIndicatorSpec, abbrFieldSpec)), ([index, alt1]) => alt1(index));
const specStart = apply(seq(tok(TokenType.FIELD_TAG), opt_sc(index)), ([token, index]) => [token.text, index]);
export const fullSpec = apply(seq(specStart, alt_sc(subfieldSpec, indicatorSpec, fieldSpec)), ([[tag, index], alt1]) => (subSpec) => alt1(tag, index, subSpec));
export const comparisonString = apply(alt_sc(kright(tok(TokenType.BEGIN_COMPARISON), tok(TokenType.COMPARISON_STRING)), alt_sc(tok(TokenType.COMPARISON_STRING_DOUBLE_QUOTED), tok(TokenType.COMPARISON_STRING_SINGLE_QUOTED))), (token) => {
    const syntaxType = token.kind === TokenType.COMPARISON_STRING_DOUBLE_QUOTED ? '"' :
        (token.kind === TokenType.COMPARISON_STRING_SINGLE_QUOTED ? "'" : "\\");
    return new ComparisonString(token.text, syntaxType);
});
export const unarySubTerm = apply(alt_sc(fullSpec, abbreviation), (alt1) => typeof alt1 === 'function' ? alt1([]) : alt1);
export const binarySubTerm = apply(alt_sc(fullSpec, comparisonString, abbreviation), (alt1) => typeof alt1 === 'function' ? alt1([]) : alt1);
export const subTermSet = alt(apply(seq(tok(TokenType.UNARY_OPERATOR), unarySubTerm), ([op, rhs]) => (_) => new UnarySubTermSet(unOp(op.text), rhs)), apply(seq(tok(TokenType.BINARY_OPERATOR), binarySubTerm), ([op, rhs]) => (lhs) => new BinarySubTermSet(lhs, binOp(op.text), rhs)), apply(seq(unarySubTerm, opt_sc(seq(tok(TokenType.BINARY_OPERATOR), binarySubTerm))), ([mlhs, alt]) => (_) => alt === undefined ? new UnarySubTermSet(undefined, mlhs) : new BinarySubTermSet(mlhs, binOp(alt[0].text), alt[1])), apply(seq(comparisonString, tok(TokenType.BINARY_OPERATOR), binarySubTerm), ([lhs, op, rhs]) => (_) => new BinarySubTermSet(lhs, binOp(op.text), rhs)));
export const subOrSpec = apply(opt_sc(kmid(tok(TokenType.BEGIN_SUBSPEC), list_sc(subTermSet, tok(TokenType.SUBTERM_SEPARATOR)), tok(TokenType.END_SUBSPEC))), (mspec) => (mspec === undefined ? [] : mspec));
export const subAndSpec = rep_sc(subOrSpec);
export const marcSpec = apply(seq(fullSpec, subAndSpec), ([fullSpec, subSpec]) => new MARCSpec(fullSpec(subSpec.map((s) => s.map((s0) => s0(toAbbr(fullSpec([]))))))));
function isTokenPosition(o) {
    if (o === null || typeof o !== 'object') {
        return false;
    }
    for (const p of ['index', 'rowBegin', 'columnBegin', 'rowEnd', 'columnEnd']) {
        const pd = Object.getOwnPropertyDescriptor(o, p);
        if (pd === undefined || typeof pd.value !== 'number') {
            return false;
        }
    }
    return true;
}
;
export const parseMarcSpec = (input) => {
    let result;
    try {
        const result = expectEOF(marcSpec.parse(newMarcSpecLexer().parse(input)));
        if (result.successful) {
            return result.candidates[0].result;
        }
        return result.error;
    }
    catch (e) {
        if (typeof e === 'object' && e !== null) {
            if ('kind' in e && e.kind === 'Error' && 'message' in e && typeof e.message === 'string') {
                let pos = 'pos' in e && isTokenPosition(e.pos) ? e.pos : undefined;
                result = {
                    kind: e.kind,
                    pos: pos,
                    message: e.message
                };
                return result;
            }
            if ('pos' in e && isTokenPosition(e.pos) && 'errorMessage' in e && typeof e.errorMessage === 'string') {
                return { kind: 'Error', pos: e.pos, message: e.errorMessage };
            }
        }
    }
    return { kind: 'Error', pos: undefined, message: 'unknown-error' };
};
export const serializeMarcSpec = (marcSpec) => {
    const { spec } = marcSpec;
    if (spec instanceof FieldSpec) {
        return serializeFieldSpec(spec);
    }
    if (spec instanceof IndicatorSpec) {
        return serializeIndicatorSpec(spec);
    }
    return serializeSubfieldSpec(spec);
};
export const serializeFieldSpec = (fieldSpec) => {
    const { tag, index, characterSpec, subSpec } = fieldSpec;
    return tag + serializeIndex(index) + serializeCharacterSpec(characterSpec) + serializeSubSpec(subSpec);
};
export const serializeAbbrFieldSpec = (fieldSpec) => {
    const { index, characterSpec } = fieldSpec;
    return serializeIndex(index) + serializeCharacterSpec(characterSpec);
};
export const serializeIndicatorSpec = (indicatorSpec) => {
    const { tag, indicator, index, subSpec } = indicatorSpec;
    return tag + serializeIndex(index) + '^' + indicator + serializeSubSpec(subSpec);
};
export const serializeAbbrIndicatorSpec = (indicatorSpec) => {
    const { indicator, index } = indicatorSpec;
    return serializeIndex(index) + '^' + indicator;
};
export const serializeSubfieldSpec = (subfieldSpec) => {
    const { tag, index, codes, subindex, characterSpec, subSpec } = subfieldSpec;
    return tag + serializeIndex(index) + codes.map(serializeCode).join('') + serializeIndex(subindex) + serializeCharacterSpec(characterSpec) + serializeSubSpec(subSpec);
};
export const serializeAbbrSubfieldSpec = (subfieldSpec) => {
    const { index, codes, subindex, characterSpec } = subfieldSpec;
    return serializeIndex(index) + codes.map(serializeCode).join('') + serializeIndex(subindex) + serializeCharacterSpec(characterSpec);
};
export const serializeIndex = (index) => {
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
export const serializeCharacterSpec = (charSpec) => {
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
export const serializeCode = (code) => {
    const { start, end } = code;
    if (start === end) {
        return '$' + start;
    }
    return `\$${start}-${end}`;
};
export const serializeSubSpec = (subSpec) => {
    if (subSpec.length === 0) {
        return '';
    }
    return subSpec.reduce((s0, s) => s0 + '{' + s.map((t) => serializeTermSet(t)).join('|') + '}', '');
};
export const serializeTermSet = (termSet) => {
    if (termSet instanceof UnarySubTermSet) {
        return serializeUnarySubTermSet(termSet);
    }
    else {
        return serializeBinarySubTermSet(termSet);
    }
};
export const serializeBinarySubTermSet = (termSet) => {
    const { leftHand, operator, rightHand } = termSet;
    return serializeTerm(leftHand) + binOpString(operator) + serializeTerm(rightHand);
};
export const serializeUnarySubTermSet = (termSet) => {
    const { operator, rightHand } = termSet;
    return unOpString(operator) + serializeTerm(rightHand);
};
export const serializeTerm = (term) => {
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
    const { theString, syntaxType } = term;
    if (syntaxType === "'") {
        return "'" + theString.replace(escapeSingleQuoteCompStringRe, '\\$&') + "'";
    }
    else if (syntaxType === '"') {
        return '"' + theString.replace(escapeDoubleQuoteCompStringRe, '\\$&') + '"';
    }
    const s0 = theString.replace(escapeCompStringRe, '\\$&');
    const s1 = s0.replace(/ /g, '\\s');
    return '\\' + s1;
};
